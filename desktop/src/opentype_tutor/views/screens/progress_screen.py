import asyncio
import logging
from collections.abc import Awaitable, Callable

import customtkinter as ctk

from ...models import ProgressResponse
from ..components import (
    AccuracyChart,
    Heading,
    HeatmapChart,
    KeyHeatmap,
    MasteryDistributionChart,
    PrimaryButton,
    SecondaryButton,
    WPMChart,
    LoadingSpinner,
)

logger = logging.getLogger(__name__)


class ProgressScreen(ctk.CTkFrame):
    def __init__(
        self,
        parent,
        on_back: Callable[[], None],
        on_reinforcement: Callable[[], Awaitable[None]],
        **kwargs,
    ):
        super().__init__(parent, fg_color="#010102", **kwargs)
        self.on_back = on_back
        self.on_reinforcement = on_reinforcement
        self.progress: ProgressResponse | None = None
        self._build_ui()
        # start in loading state until progress is provided
        self.show_loading(True)

    def _build_ui(self):
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        # Header
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.grid(row=0, column=0, sticky="ew", padx=32, pady=(32, 16))
        header.grid_columnconfigure(1, weight=1)

        SecondaryButton(header, text="← Voltar", command=self.on_back).grid(row=0, column=0, sticky="w")
        Heading(header, "Progresso", level=3).grid(row=0, column=1, sticky="w", padx=16)

        PrimaryButton(header, text="Gerar lição de reforço", command=lambda: asyncio.ensure_future(self.on_reinforcement())).grid(row=0, column=2, sticky="e")

        # Stats summary
        stats = ctk.CTkFrame(self, fg_color="transparent")
        stats.grid(row=1, column=0, sticky="ew", padx=32, pady=(0, 16))
        stats.grid_columnconfigure((0, 1, 2, 3), weight=1)

        self.wpm_card = self._create_stat_card(stats, "Nível atual", "1", 0)
        self.accuracy_card = self._create_stat_card(stats, "Lições completadas", "0", 1)
        self.sessions_card = self._create_stat_card(stats, "Progresso do nível", "0%", 2)
        self.time_card = self._create_stat_card(stats, "Última sessão", "—", 3)

        # Charts
        charts = ctk.CTkFrame(self, fg_color="transparent")
        charts.grid(row=2, column=0, sticky="nsew", padx=32, pady=(0, 16))
        charts.grid_columnconfigure((0, 1), weight=1)
        charts.grid_rowconfigure(0, weight=1)
        charts.grid_rowconfigure(1, weight=1)

        self.wpm_chart = WPMChart(charts)
        self.wpm_chart.grid(row=0, column=0, sticky="nsew", padx=8, pady=8)

        self.accuracy_chart = AccuracyChart(charts)
        self.accuracy_chart.grid(row=0, column=1, sticky="nsew", padx=8, pady=8)

        self.mastery_chart = MasteryDistributionChart(charts)
        self.mastery_chart.grid(row=1, column=0, sticky="nsew", padx=8, pady=8)

        self.heatmap_chart = HeatmapChart(charts)
        self.heatmap_chart.grid(row=1, column=1, sticky="nsew", padx=8, pady=8)

        # Loading spinner overlay (shown while progress is None)
        self.loading_spinner = LoadingSpinner(charts)
        self.loading_spinner.grid(row=0, column=0, columnspan=2, rowspan=2, sticky="nsew")

        # Key heatmap
        heatmap_frame = ctk.CTkFrame(self, fg_color="transparent")
        heatmap_frame.grid(row=3, column=0, sticky="nsew", padx=32, pady=(0, 32))
        heatmap_frame.grid_columnconfigure(0, weight=1)
        heatmap_frame.grid_rowconfigure(0, weight=1)

        self.key_heatmap = KeyHeatmap(heatmap_frame)
        self.key_heatmap.grid(row=0, column=0, sticky="nsew")

    def show_loading(self, visible: bool):
        if visible:
            # hide charts and key heatmap
            try:
                self.wpm_chart.grid_remove()
                self.accuracy_chart.grid_remove()
                self.mastery_chart.grid_remove()
                self.heatmap_chart.grid_remove()
                self.key_heatmap.grid_remove()
            except Exception:
                pass
            self.loading_spinner.grid()
        else:
            try:
                self.loading_spinner.stop()
                self.loading_spinner.grid_remove()
            except Exception:
                pass
            # reveal charts
            try:
                self.wpm_chart.grid()
                self.accuracy_chart.grid()
                self.mastery_chart.grid()
                self.heatmap_chart.grid()
                self.key_heatmap.grid()
            except Exception:
                pass

    def _create_stat_card(self, parent, title: str, value: str, col: int):
        from ..components import MetricCard
        card = MetricCard(parent, title, value)
        card.grid(row=0, column=col, padx=8, sticky="nsew")
        return card

    def set_progress(self, progress: ProgressResponse):
        self.progress = progress

        # hide loading spinner and reveal charts
        self.show_loading(False)

        self.wpm_card.update_value(str(progress.current_level))
        self.accuracy_card.update_value(str(progress.completed_lessons))
        self.sessions_card.update_value(f"{progress.level_completion_rate * 100:.0f}%")

        if progress.last_completed_at:
            self.time_card.update_value(progress.last_completed_at.strftime("%d/%m/%Y"))
        else:
            self.time_card.update_value("—")

    def set_layout(self, layout: str):
        self.key_heatmap.set_layout(layout)
        self.heatmap_chart.layout = layout