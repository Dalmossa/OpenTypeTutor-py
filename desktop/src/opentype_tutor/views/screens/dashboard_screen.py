import asyncio
import logging
from collections.abc import Awaitable, Callable

import customtkinter as ctk

from ...models import Difficulty, LessonType
from ...strings import difficulty_label, lesson_type_label
from ..components import (
    Card,
    Heading,
    MetricCard,
    PrimaryButton,
    SecondaryButton,
    Subheading,
)
from ..theme import get_current_theme_mode, toggle_theme

logger = logging.getLogger(__name__)


class DashboardScreen(ctk.CTkFrame):
    def __init__(
        self,
        parent,
        on_start_session: Callable[[], Awaitable[None]],
        on_view_progress: Callable[[], None],
        on_view_lessons: Callable[[], None],
        on_logout: Callable[[], Awaitable[None]],
        on_view_course: Callable[[], None] | None = None,
        on_view_ergonomics: Callable[[], None] | None = None,
        **kwargs,
    ):
        super().__init__(parent, fg_color="#010102", **kwargs)
        self.on_start_session = on_start_session
        self.on_view_progress = on_view_progress
        self.on_view_lessons = on_view_lessons
        self.on_logout = on_logout
        self.on_view_course = on_view_course
        self.on_view_ergonomics = on_view_ergonomics
        self._build_ui()

    def _build_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=32, pady=(32, 16))
        header.grid_columnconfigure(1, weight=1)

        self.user_label = Heading(header, "Dashboard", level=3)
        self.user_label.grid(row=0, column=0, sticky="w")

        # Theme toggle
        current_mode = get_current_theme_mode()
        theme_text = "☀️ Light" if current_mode == "dark" else "🌙 Dark"
        self.theme_button = SecondaryButton(
            header,
            text=theme_text,
            command=self._on_toggle_theme,
            width=100,
        )
        self.theme_button.grid(row=0, column=1, padx=8)

        SecondaryButton(header, text="Sair", command=lambda: asyncio.ensure_future(self.on_logout())).grid(row=0, column=2, sticky="e")

        # Content
        content = ctk.CTkScrollableFrame(self, fg_color="transparent")
        content.grid(row=1, column=0, sticky="nsew", padx=32, pady=(0, 32))
        content.grid_columnconfigure((0, 1, 2), weight=1)

        # Current lesson card
        self.lesson_card = Card(content)
        self.lesson_card.grid(row=0, column=0, columnspan=3, sticky="ew", pady=(0, 16))
        self.lesson_card.grid_columnconfigure(1, weight=1)

        Heading(self.lesson_card, "Lição atual", level=4).grid(row=0, column=0, columnspan=2, pady=(16, 8), padx=24, sticky="w")
        self.lesson_name = Subheading(self.lesson_card, "Nenhuma lição selecionada")
        self.lesson_name.grid(row=1, column=0, pady=(0, 16), padx=24, sticky="w")

        self.start_button = PrimaryButton(
            self.lesson_card,
            text="Iniciar sessão",
            command=lambda: asyncio.ensure_future(self.on_start_session()),
        )
        self.start_button.grid(row=1, column=1, pady=16, padx=24, sticky="e")

        # Stats grid
        stats_frame = ctk.CTkFrame(content, fg_color="transparent")
        stats_frame.grid(row=1, column=0, columnspan=3, sticky="ew", pady=(0, 16))
        stats_frame.grid_columnconfigure((0, 1, 2, 3), weight=1)

        self.wpm_card = MetricCard(stats_frame, "Current Level", "1", "Nível atual")
        self.wpm_card.grid(row=0, column=0, padx=8, pady=8, sticky="nsew")

        self.accuracy_card = MetricCard(stats_frame, "Completed Lessons", "0", "Lições completadas")
        self.accuracy_card.grid(row=0, column=1, padx=8, pady=8, sticky="nsew")

        self.sessions_card = MetricCard(stats_frame, "Level Progress", "0%", "Progresso do nível")
        self.sessions_card.grid(row=0, column=2, padx=8, pady=8, sticky="nsew")

        self.time_card = MetricCard(stats_frame, "Last Session", "—", "Última sessão")
        self.time_card.grid(row=0, column=3, padx=8, pady=8, sticky="nsew")

        # Action buttons
        actions = ctk.CTkFrame(content, fg_color="transparent")
        actions.grid(row=2, column=0, columnspan=3, sticky="ew", pady=(0, 16))
        actions.grid_columnconfigure((0, 1, 2, 3), weight=1)

        SecondaryButton(actions, text="Ver lições", command=self.on_view_lessons).grid(row=0, column=0, padx=8, sticky="ew")
        PrimaryButton(actions, text="Ver progresso", command=self.on_view_progress).grid(row=0, column=1, padx=8, sticky="ew")
        # Course access
        SecondaryButton(actions, text="Curso", command=lambda: getattr(self, 'on_view_course', lambda: None)()).grid(row=0, column=2, padx=8, sticky="ew")
        SecondaryButton(actions, text="Ergonomia", command=lambda: getattr(self, 'on_view_ergonomics', lambda: None)()).grid(row=0, column=3, padx=8, sticky="ew")

    def update_user(self, name: str, email: str):
        self.user_label.configure(text=f"Bem-vindo, {name}")

    def update_lesson(
        self,
        lesson_name: str,
        lesson_type: LessonType | None = None,
        difficulty: Difficulty | None = None,
    ):
        # Update lesson display and enable/disable start button depending on availability
        self.lesson_name.configure(text=lesson_name)
        if lesson_type is None or difficulty is None or not lesson_name or lesson_name == "Nenhuma lição selecionada":
            self.start_button.configure(state="disabled")
            return

        self.lesson_name.configure(
            text=f"{lesson_name} — {lesson_type_label(lesson_type)} / {difficulty_label(difficulty)}"
        )
        self.start_button.configure(state="normal")

    def update_stats(self, current_level: int, completed_lessons: int, level_completion_rate: float, last_completed_at: str):
        self.wpm_card.update_value(str(current_level))
        self.accuracy_card.update_value(str(completed_lessons))
        self.sessions_card.update_value(f"{level_completion_rate * 100:.0f}%")
        self.time_card.update_value(last_completed_at)

    def _on_toggle_theme(self):
        new_mode = toggle_theme()
        theme_text = "☀️ Light" if new_mode == "dark" else "🌙 Dark"
        self.theme_button.configure(text=theme_text)