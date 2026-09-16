
import customtkinter as ctk

from ..theme import FONT_CAPTION
from .common import MetricCard


class MetricsPanel(ctk.CTkFrame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self.grid_columnconfigure((0, 1, 2, 3, 4), weight=1)
        self.grid_rowconfigure(0, weight=1)

        self.gross_wpm_card = MetricCard(self, "PPM bruto", "0", "Velocidade bruta")
        self.gross_wpm_card.grid(row=0, column=0, padx=8, pady=8, sticky="nsew")

        self.net_wpm_card = MetricCard(self, "PPM líquido", "0", "Velocidade líquida")
        self.net_wpm_card.grid(row=0, column=1, padx=8, pady=8, sticky="nsew")

        self.accuracy_card = MetricCard(self, "Precisão", "0%", "Correta/total")
        self.accuracy_card.grid(row=0, column=2, padx=8, pady=8, sticky="nsew")

        self.latency_card = MetricCard(self, "Latência", "0ms", "Por tecla")
        self.latency_card.grid(row=0, column=3, padx=8, pady=8, sticky="nsew")

        self.duration_card = MetricCard(self, "Tempo", "0:00", "Ativo")
        self.duration_card.grid(row=0, column=4, padx=8, pady=8, sticky="nsew")

    def update_metrics(self, gross_wpm: float, net_wpm: float, accuracy: float, avg_latency_ms: float, active_duration_ms: int):
        self.gross_wpm_card.update_value(f"{gross_wpm:.1f}")
        self.net_wpm_card.update_value(f"{net_wpm:.1f}")
        self.accuracy_card.update_value(f"{accuracy:.1f}%")
        self.latency_card.update_value(f"{avg_latency_ms:.0f}ms")

        minutes = active_duration_ms // 60000
        seconds = (active_duration_ms % 60000) // 1000
        self.duration_card.update_value(f"{minutes}:{seconds:02d}")

    def reset(self):
        self.update_metrics(0, 0, 0, 0, 0)


class SessionProgressBar(ctk.CTkFrame):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self.grid_columnconfigure(0, weight=1)

        self.progress_bar = ctk.CTkProgressBar(self, height=8, corner_radius=4, progress_color="#5E6AD2")
        self.progress_bar.grid(row=0, column=0, sticky="ew", padx=8, pady=(0, 4))
        self.progress_bar.set(0)

        self.progress_label = ctk.CTkLabel(self, text="0%", font=FONT_CAPTION, text_color="#8A8F98")
        self.progress_label.grid(row=1, column=0, sticky="w", padx=8)

    def set_progress(self, value: float):
        value = max(0.0, min(1.0, value))
        self.progress_bar.set(value)
        self.progress_label.configure(text=f"{int(value * 100)}%")

    def reset(self):
        self.set_progress(0)