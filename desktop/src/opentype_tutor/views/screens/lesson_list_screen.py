import asyncio
import logging
from collections.abc import Awaitable, Callable

import customtkinter as ctk

from ...models import Lesson, LessonFilters, LessonType
from ...strings import LESSON_TYPE_LABELS, difficulty_label
from ..components import (
    Caption,
    Card,
    Heading,
    LoadingSpinner,
    PrimaryButton,
    SecondaryButton,
    Subheading,
)

logger = logging.getLogger(__name__)


class LessonListScreen(ctk.CTkFrame):
    def __init__(
        self,
        parent,
        on_select_lesson: Callable[[Lesson], Awaitable[None]],
        on_back: Callable[[], None],
        on_load_more: Callable[[], Awaitable[None]],
        on_filter: Callable[[LessonFilters], Awaitable[None]] | None = None,
        **kwargs,
    ):
        super().__init__(parent, fg_color="#010102", **kwargs)
        self.on_select_lesson = on_select_lesson
        self.on_back = on_back
        self.on_load_more = on_load_more
        self.on_filter = on_filter
        self.lessons: list[Lesson] = []
        self._build_ui()

    def _build_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=32, pady=(32, 16))
        header.grid_columnconfigure(1, weight=1)

        SecondaryButton(header, text="← Voltar", command=self.on_back).grid(row=0, column=0, sticky="w")
        Heading(header, "Lições", level=3).grid(row=0, column=1, sticky="w", padx=16)

        # Filters
        filters_frame = ctk.CTkFrame(self, fg_color="transparent")
        filters_frame.grid(row=1, column=0, sticky="ew", padx=32, pady=(0, 16))
        filters_frame.grid_columnconfigure((0, 1), weight=1)

        self.type_var = ctk.StringVar(value="Todas")
        type_menu = ctk.CTkOptionMenu(
            filters_frame,
            values=["Todas", *[LESSON_TYPE_LABELS[t] for t in LessonType]],
            variable=self.type_var,
            command=lambda _: asyncio.ensure_future(self._apply_filters()),
            font=("Inter", 13),
        )
        type_menu.grid(row=0, column=0, padx=8, sticky="ew")

        self.layout_var = ctk.StringVar(value="Todas")
        layout_menu = ctk.CTkOptionMenu(
            filters_frame,
            values=["Todas", "ABNT2", "US-International"],
            variable=self.layout_var,
            command=lambda _: asyncio.ensure_future(self._apply_filters()),
            font=("Inter", 13),
        )
        layout_menu.grid(row=0, column=1, padx=8, sticky="ew")

        # Lessons list
        self.list_frame = ctk.CTkScrollableFrame(self, fg_color="transparent")
        self.list_frame.grid(row=2, column=0, sticky="nsew", padx=32, pady=(0, 16))
        self.list_frame.grid_columnconfigure(0, weight=1)

        # Load more
        self.load_more_btn = SecondaryButton(self, text="Carregar mais", command=lambda: asyncio.ensure_future(self.on_load_more()))
        self.load_more_btn.grid(row=3, column=0, pady=(0, 32))

    @staticmethod
    def _type_from_label(label: str) -> LessonType | None:
        for lesson_type, type_label in LESSON_TYPE_LABELS.items():
            if type_label == label:
                return lesson_type
        return None

    async def _apply_filters(self):
        filters = LessonFilters(
            type=self._type_from_label(self.type_var.get()),
            layout=(
                self.layout_var.get()
                if self.layout_var.get() != "Todas"
                else None
            ),
        )
        if self.on_filter:
            await self.on_filter(filters)

    def set_lessons(self, lessons: list[Lesson], has_more: bool = False):
        self.lessons = lessons
        # If no lessons, show an empty state placeholder
        if not lessons:
            for widget in self.list_frame.winfo_children():
                widget.destroy()
            Subheading(self.list_frame, "Nenhuma lição encontrada").grid(row=0, column=0, pady=32)
            PrimaryButton(self.list_frame, text="Recarregar", command=lambda: asyncio.ensure_future(self.on_load_more())).grid(row=1, column=0, pady=(0, 32))
        else:
            self._render_list()

        self.load_more_btn.grid_remove() if not has_more else self.load_more_btn.grid()

    def _render_list(self):
        for widget in self.list_frame.winfo_children():
            widget.destroy()

        for i, lesson in enumerate(self.lessons):
            card = Card(self.list_frame)
            card.grid(row=i, column=0, sticky="ew", pady=8)
            card.grid_columnconfigure(1, weight=1)

            # Lesson info
            info = ctk.CTkFrame(card, fg_color="transparent")
            info.grid(row=0, column=0, padx=16, pady=16, sticky="w")

            Heading(info, lesson.title, level=4).grid(row=0, column=0, sticky="w")
            Subheading(
                info,
                f"Tipo: {LESSON_TYPE_LABELS.get(lesson.type, lesson.type.value)} | "
                f"Dificuldade: {difficulty_label(lesson.difficulty)} | "
                f"Nível: {lesson.level} | Layout: {lesson.layout}",
            ).grid(row=1, column=0, sticky="w", pady=(4, 0))

            # Target keys
            keys_text = ", ".join(lesson.target_keys[:10])
            if len(lesson.target_keys) > 10:
                keys_text += f" +{len(lesson.target_keys) - 10} mais"
            Caption(info, f"Teclas-alvo: {keys_text}").grid(row=2, column=0, sticky="w", pady=(4, 0))

            start_btn = PrimaryButton(card, text="Iniciar", command=lambda l=lesson: asyncio.ensure_future(self.on_select_lesson(l)))
            start_btn.grid(row=0, column=1, padx=16, pady=16, sticky="e")
            # Disable start when lesson content is empty
            if not lesson.content:
                start_btn.configure(state="disabled")
    def show_loading(self, show: bool):
        if show:
            self.loading = LoadingSpinner(self.list_frame)
            self.loading.grid(row=0, column=0, pady=32)
        else:
            if hasattr(self, "loading"):
                self.loading.destroy()