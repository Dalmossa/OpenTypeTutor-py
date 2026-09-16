import asyncio
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from tkinter import TclError

import customtkinter as ctk

from .config.settings import settings
from .strings import difficulty_label, lesson_type_label
from .controllers import (
    AppState,
    AuthController,
    DashboardController,
    LessonController,
    ProgressController,
    SessionController,
)
from .services import (
    ApiClient,
    AuthService,
    LessonService,
    ProgressService,
    SessionService,
)
from .views import (
    BaseWindow,
    DashboardScreen,
    LessonListScreen,
    LoginScreen,
    ProgressScreen,
    RegisterScreen,
    SessionResultScreen,
    SessionScreen,
    init_fonts,
)
from .views.theme import init_theme_from_settings

logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)


class OpenTypeTutorApp(BaseWindow):
    def __init__(self):
        super().__init__()
        init_theme_from_settings()
        init_fonts()

        self.app_state = AppState()
        self.api_client: ApiClient | None = None
        self.auth_service: AuthService | None = None
        self.lesson_service: LessonService | None = None
        self.session_service: SessionService | None = None
        self.progress_service: ProgressService | None = None

        self.auth_controller: AuthController | None = None
        self.dashboard_controller: DashboardController | None = None
        self.lesson_controller: LessonController | None = None
        self.session_controller: SessionController | None = None
        self.progress_controller: ProgressController | None = None

        self.current_screen: ctk.CTkFrame | None = None
        self._init_services()
        self._init_controllers()
        self._show_login()

    def _init_services(self):
        self.api_client = ApiClient(settings.api_base_url)
        self.auth_service = AuthService(self.api_client)
        self.lesson_service = LessonService(self.api_client)
        self.session_service = SessionService(self.api_client)
        self.progress_service = ProgressService(self.api_client)

    def _init_controllers(self):
        self.auth_controller = AuthController(self.app_state)
        self.dashboard_controller = DashboardController(self.app_state)
        self.lesson_controller = LessonController(self.app_state)
        self.session_controller = SessionController(self.app_state)
        self.progress_controller = ProgressController(self.app_state)

        for controller in [
            self.auth_controller,
            self.dashboard_controller,
            self.lesson_controller,
            self.session_controller,
            self.progress_controller,
        ]:
            controller.set_services(
                self.auth_service,
                self.lesson_service,
                self.session_service,
                self.progress_service,
            )

        self.auth_controller.set_callbacks(
            on_login_success=self._on_login_success,
            on_logout=self._on_logout,
        )

    def _show_course(self):
        screen = __import__(".views", fromlist=["CourseScreen"]).CourseScreen(self, on_back=self._show_dashboard)
        self._show_screen(screen)

    def _show_ergonomics(self):
        # show modal with ergonomics tips
        from .views.components import Modal
        import customtkinter as ctk

        modal = Modal(self, title="Ergonomia & Postura", width=600, height=380)
        cf = modal.content_frame

        tips = [
            "Mantenha o topo da tela na altura dos olhos.",
            "Ajuste cadeira/mesa para que antebraços fiquem paralelos ao chão.",
            "Use apoio de pulso e mantenha os pulsos neutros.",
            "Faça pausas curtas a cada 30–60 minutos para alongar.",
            "Mantenha os pés apoiados e as costas encostadas no encosto.",
        ]

        for tip in tips:
            ctk.CTkLabel(cf, text=f"• {tip}", anchor="w", wraplength=540).pack(fill="x", pady=4)

        ctk.CTkButton(cf, text="Fechar", command=modal.destroy).pack(anchor="e", pady=(12, 0))

    def _show_screen(self, screen: ctk.CTkFrame):
        if self.current_screen:
            self.current_screen.destroy()
        self.current_screen = screen
        screen.grid(row=0, column=0, sticky="nsew")
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

    def _show_login(self):
        screen = LoginScreen(
            self,
            on_login=lambda e, p: asyncio.create_task(self._handle_login(e, p)),
            on_switch_to_register=self._show_register,
        )
        self._show_screen(screen)

    def _show_register(self):
        screen = RegisterScreen(
            self,
            on_register=lambda n, e, p, l: asyncio.create_task(self._handle_register(n, e, p, l)),
            on_switch_to_login=self._show_login,
        )
        self._show_screen(screen)

    async def _handle_login(self, email: str, password: str):
        success, error = await self.auth_controller.login(email, password)
        return success, error

    async def _handle_register(self, name: str, email: str, password: str, layout: str):
        success, error = await self.auth_controller.register(name, email, password, layout)
        return success, error

    async def _on_login_success(self):
        await self._load_dashboard()
        self._show_dashboard()

    async def _on_logout(self):
        self._show_login()

    async def _load_dashboard(self):
        await self.dashboard_controller.load_dashboard_data()

    def _show_dashboard(self):
        screen = DashboardScreen(
            self,
            on_start_session=self._start_session_flow,
            on_view_progress=self._show_progress,
            on_view_lessons=self._show_lessons,
            on_logout=self.auth_controller.logout,
            on_view_course=self._show_course,
        )
        
        self._show_screen(screen)

        user = self.app_state.current_user
        if user:
            screen.update_user(user.name, user.email)

        lesson = self.dashboard_controller.get_current_lesson()
        if lesson:
            screen.update_lesson(lesson.title, lesson.type, lesson.difficulty)
        else:
            screen.update_lesson("Nenhuma lição selecionada")

        progress = self.dashboard_controller.get_cached_progress()
        if progress:
            last = progress.last_completed_at.strftime("%d/%m/%Y") if progress.last_completed_at else "—"
            screen.update_stats(
                progress.current_level,
                progress.completed_lessons,
                progress.level_completion_rate,
                last,
            )

    def _show_lessons(self):
        screen = LessonListScreen(
            self,
            on_select_lesson=self._on_lesson_selected,
            on_back=self._show_dashboard,
            on_load_more=self._load_more_lessons,
            on_filter=self._apply_lesson_filters,
        )
        self.lesson_list_screen = screen
        self._show_screen(screen)
        asyncio.ensure_future(self._load_lessons())

    async def _load_lessons(self):
        success, error = await self.lesson_controller.load_lessons()
        if success:
            self.lesson_list_screen.set_lessons(
                self.lesson_controller.get_lessons(),
                self.lesson_controller.has_more(),
            )

    async def _apply_lesson_filters(self, filters):
        success, error = await self.lesson_controller.load_lessons(filters)
        if success:
            self.lesson_list_screen.set_lessons(
                self.lesson_controller.get_lessons(),
                self.lesson_controller.has_more(),
            )

    async def _load_more_lessons(self):
        success, error = await self.lesson_controller.load_next_page()
        if success:
            self.lesson_list_screen.set_lessons(
                self.lesson_controller.get_lessons(),
                self.lesson_controller.has_more(),
            )

    async def _on_lesson_selected(self, lesson):
        await self._start_session(lesson)

    async def _start_session_flow(self):
        lesson_id = self.dashboard_controller.get_current_lesson_id()
        if not lesson_id:
            return
        lesson = await self.lesson_service.get(lesson_id)
        await self._start_session(lesson)

    async def _start_session(self, lesson):
        # mandatory ergonomics check-in before starting the first session
        from .views.components import ErgonomicsCheckModal

        # check local acceptance file
        checkin_file = Path.home() / ".opentype_tutor" / "last_checkin.json"
        need_checkin = True
        try:
            if checkin_file.exists():
                data = json.loads(checkin_file.read_text(encoding="utf-8"))
                # if checked in today, skip
                last = data.get("timestamp")
                if last:
                    dt = datetime.fromisoformat(last)
                    if dt.date() == datetime.utcnow().date():
                        need_checkin = False
        except Exception:
            need_checkin = True

        if need_checkin:
            modal = ErgonomicsCheckModal(self)
            # wait for modal to close
            self.wait_window(modal)
            if not getattr(modal, "accepted", False):
                # user cancelled check-in: return to dashboard
                logger.info("User cancelled ergonomics check-in; aborting session start")
                self._show_dashboard()
                return
            # persist checkin
            try:
                checkin_file.parent.mkdir(parents=True, exist_ok=True)
                checkin_file.write_text(json.dumps({"timestamp": datetime.utcnow().isoformat()}))
            except Exception:
                logger.exception("Failed to write checkin file")

        screen = SessionScreen(
            self,
            session_controller=self.session_controller,
            on_back=self._handle_session_back,
            on_finish=self._handle_session_finish,
            on_next_lesson=self._head_next_from_panel,
            on_retry=self._repeat_from_panel,
            on_completed=self._refresh_progress_after_completion,
        )
        self._show_screen(screen)

        success, error = await self.session_controller.start_session(lesson.id)
        if not success:
            logger.error(f"Falha ao iniciar sessão: {error}")
            self._show_dashboard()
            return
        await screen.start_session(lesson.content, f"{lesson_type_label(lesson.type)} - {difficulty_label(lesson.difficulty)}")

    async def _handle_session_back(self):
        if self.session_controller.is_active:
            await self.session_controller.abandon()
        self._show_dashboard()

    async def _refresh_progress_after_completion(self):
        await self.dashboard_controller.load_dashboard_data()

    async def _start_next_lesson(self):
        next_lesson_id = self.dashboard_controller.get_current_lesson_id()
        if next_lesson_id:
            try:
                lesson = await self.lesson_service.get(next_lesson_id)
                await self._start_session(lesson)
            except Exception:
                logger.exception("Falha ao carregar a próxima lição")
                self._show_dashboard()
        else:
            logger.info("Nenhuma próxima lição disponível; voltando ao dashboard")
            self._show_dashboard()

    async def _head_next_from_panel(self):
        await self._collect_feedback()
        await self._start_next_lesson()

    async def _repeat_from_panel(self):
        await self._collect_feedback()
        await self._retry_last_lesson()

    async def _collect_feedback(self):
        # collect quick feedback then show result
        from .views.components import FeedbackModal

        modal = FeedbackModal(self)
        self.wait_window(modal)
        result = getattr(modal, "result", None)
        if result is not None:
            # build progress card and save
            card = {
                "date": datetime.utcnow().isoformat(),
                "phase": getattr(self.dashboard_controller, "get_current_lesson", lambda: None)() or "?",
                "lesson_id": getattr(self.app_state.current_session, "lesson_id", None),
                "backspace_corrections": result.get("backspace_corrections", 0),
                "discomfort": result.get("discomfort", ""),
                "insecure_keys": result.get("insecure_keys", []),
            }
            try:
                cards_dir = Path.home() / ".opentype_tutor" / "progress_cards"
                cards_dir.mkdir(parents=True, exist_ok=True)
                fname = cards_dir / f"card_{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}.json"
                fname.write_text(json.dumps(card, ensure_ascii=False, indent=2), encoding="utf-8")
                logger.info(f"Saved progress card: {fname}")
            except Exception:
                logger.exception("Failed to save progress card")

    async def _handle_session_finish(self):
        await self._collect_feedback()
        self._show_session_result()

    async def _continue_after_result(self):
        self._show_dashboard()

    def _show_session_result(self):
        screen = SessionResultScreen(
            self,
            on_continue=self._continue_after_result,
            on_retry=self._retry_last_lesson,
            on_next_lesson=self._start_next_lesson,
            on_back=self._show_dashboard,
        )
        self._show_screen(screen)

        if self.app_state.current_result:
            screen.set_result(self.app_state.current_result)

    async def _retry_last_lesson(self):
        if self.app_state.current_session.lesson_id:
            lesson = await self.lesson_service.get(self.app_state.current_session.lesson_id)
            await self._start_session(lesson)

    def _show_progress(self):
        screen = ProgressScreen(
            self,
            on_back=self._show_dashboard,
            on_reinforcement=self._get_reinforcement,
        )
        self.progress_screen = screen
        self._show_screen(screen)
        asyncio.ensure_future(self._load_progress())

    async def _load_progress(self):
        success, error = await self.progress_controller.load_progress()
        if success:
            self.progress_screen.set_progress(self.progress_controller.get_progress())

    async def _get_reinforcement(self):
        lesson, error = await self.lesson_controller.get_reinforcement_lesson()
        if lesson and not error:
            await self._start_session(lesson)


async def _tk_loop(app: OpenTypeTutorApp) -> None:
    while True:
        try:
            app.update()
        except TclError:
            return
        await asyncio.sleep(0.01)


def main() -> None:
    app = OpenTypeTutorApp()
    api_client = app.api_client
    if api_client is None:
        raise RuntimeError("ApiClient not initialized")

    async def _run() -> None:
        async with api_client:
            await _tk_loop(app)

    asyncio.run(_run())


if __name__ == "__main__":
    main()