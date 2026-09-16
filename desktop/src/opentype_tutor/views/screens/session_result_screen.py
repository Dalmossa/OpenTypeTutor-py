import asyncio
import logging
from collections.abc import Awaitable, Callable

import customtkinter as ctk

from ...models import SessionResult
from ..components import (
    Caption,
    Card,
    Heading,
    MetricCard,
    PrimaryButton,
    SecondaryButton,
    Subheading,
)

logger = logging.getLogger(__name__)


class SessionResultScreen(ctk.CTkFrame):
    def __init__(
        self,
        parent,
        on_continue: Callable[[], Awaitable[None]],
        on_retry: Callable[[], Awaitable[None]],
        on_next_lesson: Callable[[], Awaitable[None]],
        on_back: Callable[[], None],
        **kwargs,
    ):
        super().__init__(parent, fg_color="#010102", **kwargs)
        self.on_continue = on_continue
        self.on_retry = on_retry
        self.on_next_lesson = on_next_lesson
        self.on_back = on_back
        self.result: SessionResult | None = None
        self._build_ui()

    def _build_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)

        center = ctk.CTkFrame(self, fg_color="transparent")
        center.grid(row=0, column=0, sticky="nsew")
        center.grid_columnconfigure(0, weight=1)

        card = Card(center)
        card.grid(row=0, column=0, padx=48, pady=48, sticky="n")
        card.grid_columnconfigure(0, weight=1)

        self.title = Heading(card, "Sessão concluída", level=2)
        self.title.grid(row=0, column=0, pady=(32, 8), padx=32)

        self.subtitle = Subheading(card, "Ótimo trabalho! Aqui estão seus resultados:")
        self.subtitle.grid(row=1, column=0, pady=(0, 24), padx=32)

        # Metrics grid
        metrics_frame = ctk.CTkFrame(card, fg_color="transparent")
        metrics_frame.grid(row=2, column=0, pady=16, padx=32, sticky="ew")
        metrics_frame.grid_columnconfigure((0, 1, 2), weight=1)

        self.gross_wpm_card = MetricCard(metrics_frame, "PPM bruto", "0", "Velocidade bruta")
        self.gross_wpm_card.grid(row=0, column=0, padx=8, pady=8, sticky="nsew")

        self.net_wpm_card = MetricCard(metrics_frame, "PPM líquido", "0", "Velocidade líquida")
        self.net_wpm_card.grid(row=0, column=1, padx=8, pady=8, sticky="nsew")

        self.accuracy_card = MetricCard(metrics_frame, "Precisão", "0%", "Correta/total")
        self.accuracy_card.grid(row=0, column=2, padx=8, pady=8, sticky="nsew")

        self.errors_card = MetricCard(metrics_frame, "Erros", "0", "Erros não corrigidos")
        self.errors_card.grid(row=1, column=0, padx=8, pady=8, sticky="nsew")

        self.latency_card = MetricCard(metrics_frame, "Latência média", "0ms", "Por tecla")
        self.latency_card.grid(row=1, column=1, padx=8, pady=8, sticky="nsew")

        self.duration_card = MetricCard(metrics_frame, "Tempo", "0:00", "Ativo")
        self.duration_card.grid(row=1, column=2, padx=8, pady=8, sticky="nsew")

        # Weak keys
        self.weak_keys_label = Caption(card, "", text_color="#F59E0B")
        self.weak_keys_label.grid(row=3, column=0, pady=(16, 8), padx=32, sticky="w")

        # Buttons
        btn_frame = ctk.CTkFrame(card, fg_color="transparent")
        btn_frame.grid(row=4, column=0, pady=24, padx=32, sticky="ew")
        btn_frame.grid_columnconfigure((0, 1, 2), weight=1)

        SecondaryButton(btn_frame, text="← Voltar", command=self.on_back).grid(row=0, column=0, padx=8, sticky="ew")
        PrimaryButton(btn_frame, text="Repetir lição", command=lambda: asyncio.ensure_future(self.on_retry())).grid(row=0, column=1, padx=8, sticky="ew")
        PrimaryButton(btn_frame, text="Próxima lição", command=lambda: asyncio.ensure_future(self.on_next_lesson())).grid(row=1, column=0, columnspan=2, padx=8, pady=(8, 0), sticky="ew")
        SecondaryButton(btn_frame, text="Continuar", command=lambda: asyncio.ensure_future(self.on_continue())).grid(row=1, column=2, padx=8, pady=(8, 0), sticky="ew")

    def set_result(self, result: SessionResult):
        self.result = result
        m = result.metrics

        self.gross_wpm_card.update_value(f"{m.gross_wpm:.1f}")
        self.net_wpm_card.update_value(f"{m.net_wpm:.1f}")
        self.accuracy_card.update_value(f"{m.accuracy * 100:.1f}%")
        self.errors_card.update_value(str(m.final_uncorrected_errors))
        self.latency_card.update_value(f"{m.average_latency_ms:.0f}ms")

        minutes = m.active_duration_ms // 60000
        seconds = (m.active_duration_ms % 60000) // 1000
        self.duration_card.update_value(f"{minutes}:{seconds:02d}")
        self.weak_keys_label.configure(text="Sem erros! Excelente!")