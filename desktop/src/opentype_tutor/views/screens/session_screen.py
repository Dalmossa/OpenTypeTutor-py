import asyncio
import logging
import time
from collections.abc import Awaitable, Callable

import customtkinter as ctk

from ...controllers.session_controller import SessionCallbacks, SessionController
from ...models import KeystrokeEvent, SessionStatus
from ...strings import (
    BREAK_AVAILABLE_IN,
    BREAK_INSTRUCTION,
    BREAK_TIP,
    BREAK_TITLE,
    REST_STATE_LABELS,
)
from ..components import (
    Caption,
    Heading,
    MetricsPanel,
    PrimaryButton,
    SecondaryButton,
    SessionProgressBar,
    Subheading,
    TypingArea,
    VirtualKeyboard,
)

logger = logging.getLogger(__name__)


class SessionScreen(ctk.CTkFrame):
    def __init__(
        self,
        parent,
        session_controller: SessionController,
        on_back: Callable[[], Awaitable[None]],
        on_finish: Callable[[], Awaitable[None]],
        on_next_lesson: Callable[[], Awaitable[None]],
        on_retry: Callable[[], Awaitable[None]],
        on_completed: Callable[[], Awaitable[None]] | None = None,
        **kwargs,
    ):
        super().__init__(parent, fg_color="#010102", **kwargs)
        self.session_controller = session_controller
        self.on_back = on_back
        self.on_finish = on_finish
        self.on_next_lesson = on_next_lesson
        self.on_retry = on_retry
        self.on_completed = on_completed
        self._typ_typed = 0
        self._typ_correct = 0
        self._typ_latencies: list[float] = []
        self._session_started_at: float | None = None
        self._submitted = False
        self._build_ui()
        self._setup_callbacks()

        # Start with no-session state until start_session is called
        self.show_no_session()

    def _build_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        # Header
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=32, pady=(16, 8))
        header.grid_columnconfigure(1, weight=1)

        SecondaryButton(header, text="← Abandonar", command=lambda: asyncio.create_task(self._handle_abandon())).grid(row=0, column=0, sticky="w")
        self.session_title = Heading(header, "Sessão de digitação", level=3)
        self.session_title.grid(row=0, column=1, sticky="w", padx=16)

        # Metrics
        self.metrics = MetricsPanel(self)
        self.metrics.grid(row=1, column=0, sticky="ew", padx=32, pady=8)

        # Main content area
        self.main_content = ctk.CTkFrame(self, fg_color="transparent")
        self.main_content.grid(row=2, column=0, sticky="nsew", padx=32, pady=8)
        self.main_content.grid_columnconfigure(0, weight=3)
        self.main_content.grid_columnconfigure(1, weight=1)
        self.main_content.grid_rowconfigure(0, weight=1)

        # Left: Typing area + Keyboard
        left = ctk.CTkFrame(self.main_content, fg_color="transparent")
        left.grid(row=0, column=0, sticky="nsew", padx=(0, 16))
        left.grid_columnconfigure(0, weight=1)
        left.grid_rowconfigure(0, weight=1)
        left.grid_rowconfigure(1, weight=0)

        initial_layout = "ABNT2"
        profile = self.session_controller.app_state.current_user if hasattr(self.session_controller, "app_state") else None
        if profile is not None and getattr(profile, "layout", None):
            initial_layout = profile.layout

        self.typing_area = TypingArea(
            left,
            on_keystroke=self._on_keystroke,
            on_physical_key_press=self._on_physical_key_press,
            on_physical_key_release=self._on_physical_key_release,
        )
        self.typing_area.grid(row=0, column=0, sticky="nsew", pady=(0, 16))

        self.keyboard = VirtualKeyboard(
            left,
            layout=initial_layout,
            on_key_press=self._on_virtual_key_press,
            on_key_release=self._on_virtual_key_release,
        )
        self.keyboard.grid(row=1, column=0, sticky="ew")

        # Right: Progress + Controls
        right = ctk.CTkFrame(self.main_content, fg_color="transparent")
        right.grid(row=0, column=1, sticky="nsew")
        right.grid_columnconfigure(0, weight=1)

        self.progress_bar = SessionProgressBar(right)
        self.progress_bar.grid(row=0, column=0, sticky="ew", pady=(0, 16))

        controls = ctk.CTkFrame(right, fg_color="transparent")
        controls.grid(row=1, column=0, sticky="ew", pady=8)
        controls.grid_columnconfigure((0, 1), weight=1)

        self.pause_btn = SecondaryButton(controls, text="Pausar", command=lambda: asyncio.create_task(self._handle_pause()))
        self.pause_btn.grid(row=0, column=0, padx=4, sticky="ew")

        self.resume_btn = PrimaryButton(controls, text="Retomar", command=lambda: asyncio.create_task(self._handle_resume()), state="disabled")
        self.resume_btn.grid(row=0, column=1, padx=4, sticky="ew")

        SecondaryButton(right, text="Encerrar sessão", command=lambda: asyncio.create_task(self._handle_submit())).grid(row=2, column=0, pady=16, sticky="ew")

        # Status
        self.status_label = Caption(right, "Pronto para começar")
        self.status_label.grid(row=3, column=0, pady=8)

        self._build_completion_panel()
        self._build_break_panel()

    def _build_break_panel(self):
        # RN33 - overlay de pausa obrigatória entre blocos de prática
        self.break_panel = ctk.CTkFrame(self, fg_color="#010102")
        self.break_panel.grid(row=2, column=0, sticky="nsew")
        self.break_panel.grid_columnconfigure(0, weight=1)
        self.break_panel.grid_rowconfigure(1, weight=1)

        center = ctk.CTkFrame(self.break_panel, fg_color="transparent")
        center.grid(row=1, column=0, sticky="nsew")
        center.grid_columnconfigure(0, weight=1)

        Heading(center, BREAK_TITLE, level=2).grid(row=0, column=0, pady=(48, 8))
        Subheading(center, BREAK_INSTRUCTION).grid(row=1, column=0, pady=(0, 8))
        Caption(center, BREAK_TIP).grid(row=2, column=0, pady=(0, 32))

        self.break_available_label = Caption(center, BREAK_AVAILABLE_IN)
        self.break_available_label.grid(row=3, column=0, pady=(0, 8))

        self.break_countdown = Heading(center, "00:00", level=1)
        self.break_countdown.grid(row=4, column=0, pady=(0, 32))

        self.break_panel.grid_remove()

    def _build_completion_panel(self):
        self.completion_panel = ctk.CTkFrame(self, fg_color="#010102")
        self.completion_panel.grid(row=2, column=0, sticky="nsew")
        self.completion_panel.grid_columnconfigure(0, weight=1)
        self.completion_panel.grid_rowconfigure(1, weight=1)

        center = ctk.CTkFrame(self.completion_panel, fg_color="transparent")
        center.grid(row=1, column=0, sticky="nsew")
        center.grid_columnconfigure(0, weight=1)

        self.completion_heading = Heading(center, "Lição concluída!", level=2)
        self.completion_heading.grid(row=0, column=0, pady=(48, 8))

        self.completion_message = Subheading(
            center, "Ótimo trabalho! O que deseja fazer a seguir?"
        )
        self.completion_message.grid(row=1, column=0, pady=(0, 32))

        btns = ctk.CTkFrame(center, fg_color="transparent")
        btns.grid(row=2, column=0)
        btns.grid_columnconfigure((0, 1, 2), weight=1)

        SecondaryButton(
            btns,
            text="Ver resultados",
            command=lambda: asyncio.create_task(self._handle_view_results()),
        ).grid(row=0, column=0, padx=8, pady=8)

        PrimaryButton(
            btns,
            text="Próxima lição",
            command=lambda: asyncio.create_task(self._handle_next_lesson()),
        ).grid(row=0, column=1, padx=8, pady=8)

        SecondaryButton(
            btns,
            text="Repetir lição",
            command=lambda: asyncio.create_task(self._handle_retry()),
        ).grid(row=0, column=2, padx=8, pady=8)

        self.completion_panel.grid_remove()

    def show_no_session(self):
        # hide typing area and keyboard, show placeholder
        try:
            self.typing_area.grid_remove()
            self.keyboard.grid_remove()
        except Exception:
            pass
        if not hasattr(self, "_no_session_label"):
            self._no_session_label = Caption(self, "Nenhuma sessão ativa. Selecione uma lição para começar.")
            self._no_session_label.grid(row=2, column=0, pady=32)
        else:
            self._no_session_label.grid()
        # disable controls
        self.pause_btn.configure(state="disabled")
        self.resume_btn.configure(state="disabled")

    def show_active_session(self):
        # reveal typing area and keyboard
        if hasattr(self, "_no_session_label"):
            try:
                self._no_session_label.grid_remove()
            except Exception:
                pass
        try:
            self.typing_area.grid()
            self.keyboard.grid()
            self.main_content.grid()
        except Exception:
            pass
        try:
            self.completion_panel.grid_remove()
        except Exception:
            pass

    def show_completed(self):
        # hide typing area and controls, show "Lição concluída!" panel
        try:
            self.typing_area.grid_remove()
            self.keyboard.grid_remove()
            self.main_content.grid_remove()
        except Exception:
            pass
        self.completion_panel.grid(row=2, column=0, sticky="nsew")
        self.pause_btn.configure(state="disabled")
        self.resume_btn.configure(state="disabled")

    def _setup_callbacks(self):
        callbacks = SessionCallbacks(
            on_session_complete=self._on_session_complete,
            on_status_change=self._on_status_change,
        )
        self.session_controller.set_callbacks(callbacks)

    async def start_session(self, lesson_content: str, lesson_title: str):
        self.session_title.configure(text=lesson_title)
        self.typing_area.set_target_text(lesson_content)
        # reveal typing UI now that a session has started
        self.show_active_session()
        self.progress_bar.reset()
        self.metrics.reset()
        self._typ_typed = 0
        self._typ_correct = 0
        self._typ_latencies = []
        self._session_started_at = time.monotonic()
        self._submitted = False
        current_status = self.session_controller.app_state.current_session.status
        self._update_controls(current_status)

    async def _on_keystroke(self, keystroke: KeystrokeEvent):
        self.session_controller.add_keystroke(keystroke)
        self.progress_bar.set_progress(self.typing_area.get_progress())

        if keystroke.event_type == "DEAD_KEY_COMPOSE":
            return
        self._typ_typed += 1
        if keystroke.event_type == "CORRECT":
            self._typ_correct += 1
        if keystroke.latency_ms is not None:
            self._typ_latencies.append(keystroke.latency_ms)

        if self._session_started_at is None:
            return
        active_ms = int((time.monotonic() - self._session_started_at) * 1000)
        minutes = max(active_ms / 60000.0, 1.0 / 60.0)
        gross_wpm = self._typ_typed / minutes
        net_wpm = self._typ_correct / minutes
        accuracy = (self._typ_correct / self._typ_typed * 100.0) if self._typ_typed else 0.0
        avg_latency = (
            sum(self._typ_latencies) / len(self._typ_latencies)
            if self._typ_latencies
            else 0.0
        )
        self.metrics.update_metrics(gross_wpm, net_wpm, accuracy, avg_latency, active_ms)

        if self.typing_area.get_progress() >= 1.0 and not self._submitted:
            self._submitted = True
            await self._handle_submit()

    def _on_virtual_key_press(self, key: str):
        pass

    def _on_virtual_key_release(self, key: str):
        if len(key) == 1:
            self.typing_area._handle_character(key)

    def _on_physical_key_press(self, char: str, keysym: str):
        label = self.keyboard.resolve_label(char, keysym)
        if label:
            self.keyboard.press_key(label)

    def _on_physical_key_release(self, char: str, keysym: str):
        label = self.keyboard.resolve_label(char, keysym)
        if label:
            self.keyboard.release_key(label)

    async def _on_status_change(self, status: SessionStatus):
        self._update_controls(status)
        self.status_label.configure(text=REST_STATE_LABELS.get(status.value, status.value))
        if status == SessionStatus.ACTIVE:
            self.typing_area.focus_set()

    async def _on_session_complete(self, result):
        if self.on_completed:
            await self.on_completed()
        self.show_completed()
        wpm = result.metrics.net_wpm if result else 0.0
        logger.info("Sessão concluída (%.1f PPM)", wpm)

    def _update_controls(self, status: SessionStatus):
        if status == SessionStatus.ACTIVE:
            self.pause_btn.configure(state="normal")
            self.resume_btn.configure(state="disabled")
        elif status == SessionStatus.PAUSED:
            self.pause_btn.configure(state="disabled")
            self.resume_btn.configure(state="normal")
        else:
            self.pause_btn.configure(state="disabled")
            self.resume_btn.configure(state="disabled")

    async def _handle_pause(self):
        await self.session_controller.pause()

    async def _handle_resume(self):
        await self.session_controller.resume()

    async def _handle_abandon(self):
        await self.session_controller.abandon()
        await self.on_back()

    async def _handle_submit(self):
        result, error = await self.session_controller.submit()
        if error:
            self._submitted = False
            self.status_label.configure(text="Não foi possível concluir a lição. Tente novamente.")
            logger.error(f"Falha ao concluir a lição: {error}")
        # Result handled by on_session_complete callback

    async def _handle_view_results(self):
        await self.on_finish()

    async def _handle_next_lesson(self):
        await self.on_next_lesson()

    async def _handle_retry(self):
        await self.on_retry()

    # RN33 - overlay de pausa obrigatória: conta regressivamente até liberar o Start.
    # O valor break_remaining_ms vem do servidor (já deduzido); nenhuma RN no cliente.
    async def wait_for_break(self, remaining_ms: int):
        self.show_break_overlay()
        remaining_seconds = max(0, int(remaining_ms // 1000))
        while remaining_seconds > 0:
            minutes = remaining_seconds // 60
            seconds = remaining_seconds % 60
            self.break_countdown.configure(text=f"{minutes:02d}:{seconds:02d}")
            await asyncio.sleep(1)
            remaining_seconds -= 1
        self.break_countdown.configure(text="00:00")
        self.hide_break_overlay()

    def show_break_overlay(self):
        try:
            self.main_content.grid_remove()
        except Exception:
            pass
        try:
            self.completion_panel.grid_remove()
        except Exception:
            pass
        self.pause_btn.configure(state="disabled")
        self.resume_btn.configure(state="disabled")
        self.break_panel.grid(row=2, column=0, sticky="nsew")

    def hide_break_overlay(self):
        try:
            self.break_panel.grid_remove()
        except Exception:
            pass
        self.show_active_session()