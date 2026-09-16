
import customtkinter as ctk

from ...models import KeyPerformance, MasteryState
from ..theme import FONT_BODY_SM, FONT_CAPTION

MASTERY_COLORS = {
    MasteryState.UNKNOWN: "#3E3E44",
    MasteryState.LEARNING: "#DC2626",
    MasteryState.CONSOLIDATING: "#F59E0B",
    MasteryState.MASTERED: "#27A644",
}


class KeyHeatmap(ctk.CTkFrame):
    def __init__(self, parent, layout: str = "ABNT2", **kwargs):
        super().__init__(parent, fg_color="#0F1011", border_color="#23252A", border_width=1, corner_radius=12, **kwargs)
        self.layout = layout
        self.key_frames: dict[str, ctk.CTkFrame] = {}
        self._build_legend()
        self._build_keyboard()

    def _build_legend(self):
        legend_frame = ctk.CTkFrame(self, fg_color="transparent")
        legend_frame.pack(fill="x", padx=16, pady=(16, 8))

        ctk.CTkLabel(legend_frame, text="Mastery:", font=FONT_CAPTION, text_color="#8A8F98").pack(side="left")

        for state, color in MASTERY_COLORS.items():
            item = ctk.CTkFrame(legend_frame, fg_color="transparent")
            item.pack(side="left", padx=12)
            dot = ctk.CTkFrame(item, width=12, height=12, fg_color=color, corner_radius=3)
            dot.pack(side="left")
            ctk.CTkLabel(item, text=state.value.capitalize(), font=FONT_CAPTION, text_color="#D0D6E0").pack(side="left", padx=(4, 0))

    def _build_keyboard(self):
        from .virtual_keyboard import KEY_LAYOUTS, KEY_WIDTHS
        layout_keys = KEY_LAYOUTS.get(self.layout, KEY_LAYOUTS["ABNT2"])

        keyboard_frame = ctk.CTkFrame(self, fg_color="transparent")
        keyboard_frame.pack(fill="both", expand=True, padx=16, pady=(0, 16))

        for row_idx, row in enumerate(layout_keys):
            row_frame = ctk.CTkFrame(keyboard_frame, fg_color="transparent")
            row_frame.pack(fill="x", pady=1)

            for key in row:
                key_frame = ctk.CTkFrame(
                    row_frame,
                    width=KEY_WIDTHS.get(key, 1.0) * 35,
                    height=35,
                    fg_color=MASTERY_COLORS[MasteryState.UNKNOWN],
                    corner_radius=4,
                    border_width=0,
                )
                key_frame.pack(side="left", padx=1)
                key_frame.pack_propagate(False)

                label = ctk.CTkLabel(
                    key_frame,
                    text=self._get_display_text(key),
                    font=FONT_BODY_SM if len(key) == 1 else FONT_CAPTION,
                    text_color="#FFFFFF",
                )
                label.place(relx=0.5, rely=0.5, anchor="center")

                self.key_frames[key] = key_frame

    def _get_display_text(self, key: str) -> str:
        if key == "Backspace":
            return "⌫"
        elif key == "Tab":
            return "⇥"
        elif key == "CapsLock":
            return "⇪"
        elif key == "Enter":
            return "⏎"
        elif key == "Shift":
            return "⇧"
        elif key == "Ctrl":
            return "Ctrl"
        elif key == "Win":
            return "⌘"
        elif key == "Alt":
            return "Alt"
        elif key == "AltGr":
            return "AltGr"
        elif key == "Menu":
            return "☰"
        elif key == "Space":
            return "Space"
        elif key == "?/Shift":
            return "? ⇧"
        return key

    def update_heatmap(self, performances: list[KeyPerformance]):
        perf_map = {f"{kp.logical_key}:{kp.layout}": kp for kp in performances}
        for key, frame in self.key_frames.items():
            perf_key = f"{key}:{self.layout}"
            if perf_key in perf_map:
                kp = perf_map[perf_key]
                color = MASTERY_COLORS.get(kp.mastery_state, MASTERY_COLORS[MasteryState.UNKNOWN])
                frame.configure(fg_color=color)
            else:
                frame.configure(fg_color=MASTERY_COLORS[MasteryState.UNKNOWN])

    def set_layout(self, layout: str):
        self.layout = layout
        for widget in self.winfo_children():
            widget.destroy()
        self.key_frames.clear()
        self._build_legend()
        self._build_keyboard()