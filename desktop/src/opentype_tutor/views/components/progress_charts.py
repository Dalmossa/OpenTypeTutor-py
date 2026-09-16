import customtkinter as ctk
import matplotlib

matplotlib.use("Agg")

import numpy as np
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure

from ...models import KeyPerformance, MasteryState
from ..theme import FONT_BODY

CHART_COLORS = {
    "bg": "#010102",
    "surface": "#0F1011",
    "grid": "#23252A",
    "text": "#F7F8F8",
    "text_muted": "#8A8F98",
    "primary": "#5E6AD2",
    "success": "#27A644",
    "warning": "#F59E0B",
    "danger": "#DC2626",
}


class BaseChart(ctk.CTkFrame):
    def __init__(self, parent, title: str = "", width: int = 400, height: int = 300, **kwargs):
        super().__init__(parent, fg_color="#0F1011", border_color="#23252A", border_width=1, corner_radius=12, **kwargs)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        if title:
            ctk.CTkLabel(self, text=title, font=FONT_BODY, text_color="#F7F8F8").grid(row=0, column=0, pady=(12, 8), padx=16, sticky="w")

        self.figure = Figure(figsize=(width/100, height/100), dpi=100, facecolor=CHART_COLORS["surface"])
        self.canvas = FigureCanvasTkAgg(self.figure, self)
        self.canvas.get_tk_widget().grid(row=1, column=0, sticky="nsew", padx=16, pady=(0, 16))

        self.ax = self.figure.add_subplot(111)
        self._style_axis()

    def _style_axis(self):
        self.ax.set_facecolor(CHART_COLORS["surface"])
        self.figure.patch.set_facecolor(CHART_COLORS["surface"])
        self.ax.tick_params(colors=CHART_COLORS["text_muted"], labelsize=8)
        self.ax.spines["top"].set_visible(False)
        self.ax.spines["right"].set_visible(False)
        self.ax.spines["bottom"].set_color(CHART_COLORS["grid"])
        self.ax.spines["left"].set_color(CHART_COLORS["grid"])
        self.ax.xaxis.label.set_color(CHART_COLORS["text_muted"])
        self.ax.yaxis.label.set_color(CHART_COLORS["text_muted"])
        self.ax.grid(True, color=CHART_COLORS["grid"], linewidth=0.5, alpha=0.5)

    def draw(self):
        self.canvas.draw()


class WPMChart(BaseChart):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, "WPM Evolution", **kwargs)

    def update_data(self, sessions: list[dict]):
        self.ax.clear()
        self._style_axis()

        if not sessions:
            self.ax.text(0.5, 0.5, "No data", ha="center", va="center", color=CHART_COLORS["text_muted"], transform=self.ax.transAxes)
            self.draw()
            return

        x = list(range(1, len(sessions) + 1))
        gross = [s.get("gross_wpm", 0) for s in sessions]
        net = [s.get("net_wpm", 0) for s in sessions]

        self.ax.plot(x, gross, color=CHART_COLORS["primary"], marker="o", markersize=4, linewidth=2, label="Gross WPM")
        self.ax.plot(x, net, color=CHART_COLORS["success"], marker="s", markersize=4, linewidth=2, label="Net WPM")
        self.ax.fill_between(x, net, gross, color=CHART_COLORS["primary"], alpha=0.1)
        self.ax.set_xlabel("Session", color=CHART_COLORS["text_muted"])
        self.ax.set_ylabel("WPM", color=CHART_COLORS["text_muted"])
        self.ax.legend(fontsize=8, facecolor=CHART_COLORS["surface"], edgecolor=CHART_COLORS["grid"], labelcolor=CHART_COLORS["text"])
        self.draw()


class AccuracyChart(BaseChart):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, "Accuracy Evolution", **kwargs)

    def update_data(self, sessions: list[dict]):
        self.ax.clear()
        self._style_axis()

        if not sessions:
            self.ax.text(0.5, 0.5, "No data", ha="center", va="center", color=CHART_COLORS["text_muted"], transform=self.ax.transAxes)
            self.draw()
            return

        x = list(range(1, len(sessions) + 1))
        accuracy = [s.get("accuracy", 0) for s in sessions]

        self.ax.plot(x, accuracy, color=CHART_COLORS["success"], marker="o", markersize=4, linewidth=2)
        self.ax.fill_between(x, accuracy, color=CHART_COLORS["success"], alpha=0.1)
        self.ax.set_ylim(0, 105)
        self.ax.set_xlabel("Session", color=CHART_COLORS["text_muted"])
        self.ax.set_ylabel("Accuracy %", color=CHART_COLORS["text_muted"])
        self.draw()


class MasteryDistributionChart(BaseChart):
    def __init__(self, parent, **kwargs):
        super().__init__(parent, "Mastery Distribution", **kwargs)

    def update_data(self, performances: list[KeyPerformance]):
        self.ax.clear()
        self._style_axis()

        counts = dict.fromkeys(MasteryState, 0)
        for kp in performances:
            counts[kp.mastery_state] = counts.get(kp.mastery_state, 0) + 1

        labels = []
        values = []
        colors = []
        state_colors = {
            MasteryState.UNKNOWN: CHART_COLORS["grid"],
            MasteryState.LEARNING: CHART_COLORS["danger"],
            MasteryState.CONSOLIDATING: CHART_COLORS["warning"],
            MasteryState.MASTERED: CHART_COLORS["success"],
        }

        for state in MasteryState:
            if counts[state] > 0:
                labels.append(state.value.capitalize())
                values.append(counts[state])
                colors.append(state_colors[state])

        if not values:
            self.ax.text(0.5, 0.5, "No data", ha="center", va="center", color=CHART_COLORS["text_muted"], transform=self.ax.transAxes)
            self.draw()
            return

        wedges, texts, autotexts = self.ax.pie(
            values,
            labels=labels,
            colors=colors,
            autopct="%1.0f%%",
            textprops={"color": CHART_COLORS["text"], "fontsize": 9},
            startangle=90,
        )
        for autotext in autotexts:
            autotext.set_color("#FFFFFF")
        self.draw()


class HeatmapChart(BaseChart):
    def __init__(self, parent, layout: str = "ABNT2", **kwargs):
        super().__init__(parent, "Key Heatmap", **kwargs)
        self.layout = layout

    def update_data(self, performances: list[KeyPerformance]):
        self.ax.clear()
        self._style_axis()

        from .virtual_keyboard import KEY_LAYOUTS
        layout_keys = KEY_LAYOUTS.get(self.layout, KEY_LAYOUTS["ABNT2"])

        perf_map = {f"{kp.logical_key}:{kp.layout}": kp for kp in performances}

        rows = len(layout_keys)
        cols = max(len(row) for row in layout_keys)
        data = np.zeros((rows, cols))
        labels = [["" for _ in range(cols)] for _ in range(rows)]

        for r, row in enumerate(layout_keys):
            for c, key in enumerate(row):
                labels[r][c] = key.replace("Backspace", "⌫").replace("Tab", "⇥").replace("CapsLock", "⇪").replace("Enter", "⏎").replace("Shift", "⇧").replace("Ctrl", "Ctl").replace("Alt", "Alt").replace("Space", "Sp")
                perf_key = f"{key}:{self.layout}"
                if perf_key in perf_map:
                    kp = perf_map[perf_key]
                    if kp.mastery_state == MasteryState.MASTERED:
                        data[r][c] = 3
                    elif kp.mastery_state == MasteryState.CONSOLIDATING:
                        data[r][c] = 2
                    elif kp.mastery_state == MasteryState.LEARNING:
                        data[r][c] = 1
                    else:
                        data[r][c] = 0.5

        im = self.ax.imshow(data, cmap="RdYlGn", aspect="auto", vmin=0, vmax=3)
        self.ax.set_xticks([])
        self.ax.set_yticks([])

        for r in range(rows):
            for c in range(len(layout_keys[r])):
                if c < cols:
                    self.ax.text(c, r, labels[r][c], ha="center", va="center", color="#FFFFFF", fontsize=7)

        self.draw()