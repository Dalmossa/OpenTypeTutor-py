import logging
from collections.abc import Callable

import customtkinter as ctk

from ..theme import FONT_CAPTION, FONT_MONO
from .common import Caption

logger = logging.getLogger(__name__)


KEY_LAYOUTS = {
    "ABNT2": [
        ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
        ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
        ["CapsLock", "a", "s", "d", "f", "g", "h", "j", "k", "l", "ç", ";", "'", "Enter"],
        ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", ":", "?/Shift"],
        ["Ctrl", "Win", "Alt", "Space", "AltGr", "Menu", "Ctrl"],
    ],
    "US-International": [
        ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
        ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
        ["CapsLock", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
        ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
        ["Ctrl", "Win", "Alt", "Space", "Alt", "Menu", "Ctrl"],
    ],
    "US": [
        ["`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "Backspace"],
        ["Tab", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"],
        ["CapsLock", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "Enter"],
        ["Shift", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "Shift"],
        ["Ctrl", "Win", "Alt", "Space", "Alt", "Menu", "Ctrl"],
    ],
}


KEY_WIDTHS = {
    "Backspace": 2.0,
    "Tab": 1.5,
    "CapsLock": 1.75,
    "Enter": 2.25,
    "Shift": 2.25,
    "Ctrl": 1.25,
    "Win": 1.25,
    "Alt": 1.25,
    "Space": 6.25,
    "AltGr": 1.25,
    "Menu": 1.25,
    "?/Shift": 2.75,
    "\\": 1.5,
}

FINGER_NAMES: dict[str, str] = {
    "L_PINKY": "Mínimo",
    "L_RING": "Anelar",
    "L_MIDDLE": "Médio",
    "L_INDEX": "Indicador",
    "R_INDEX": "Indicador",
    "R_MIDDLE": "Médio",
    "R_RING": "Anelar",
    "R_PINKY": "Mínimo",
    "THUMB": "Polegar",
}

FINGER_COLORS: dict[str, str] = {
    "L_PINKY": "#E5484D",
    "L_RING": "#F76B15",
    "L_MIDDLE": "#E5B90A",
    "L_INDEX": "#30A46C",
    "R_INDEX": "#3BC0E0",
    "R_MIDDLE": "#5B7CFA",
    "R_RING": "#A78BFA",
    "R_PINKY": "#E164A3",
    "THUMB": "#8B8F98",
}

BG_HEX = "#0F1011"
BORDER_HEX = "#23252A"


def _mix(hex_a: str, hex_b: str, t: float) -> str:
    def _rgb(color_hex: str) -> tuple[int, int, int]:
        return int(color_hex[1:3], 16), int(color_hex[3:5], 16), int(color_hex[5:7], 16)

    ra, ga, ba = _rgb(hex_a)
    rb, gb, bb = _rgb(hex_b)
    r = int(ra * t + rb * (1 - t))
    g = int(ga * t + gb * (1 - t))
    b = int(ba * t + bb * (1 - t))
    return f"#{r:02x}{g:02x}{b:02x}"


def _build_finger_map(layout_rows: list[list[str]]) -> dict[str, str]:
    groups: list[tuple[set[str], str]] = [
        ({"`", "1", "q", "a", "z", "Tab", "CapsLock", "ç"}, "L_PINKY"),
        ({"2", "w", "s", "x"}, "L_RING"),
        ({"3", "e", "d", "c"}, "L_MIDDLE"),
        ({"4", "5", "r", "t", "f", "g", "v", "b"}, "L_INDEX"),
        ({"6", "7", "y", "u", "h", "j", "n", "m"}, "R_INDEX"),
        ({"8", "i", "k", ","}, "R_MIDDLE"),
        ({"9", "o", "l", "."}, "R_RING"),
        ({"0", "-", "=", "p", "[", "]", "\\", ";", "'", ":", "/", "?/Shift", "Enter", "Backspace"}, "R_PINKY"),
        ({"Space", "Alt", "Ctrl", "Win", "Menu", "AltGr"}, "THUMB"),
    ]
    finger_map: dict[str, str] = {}
    for keys, finger in groups:
        for key in keys:
            finger_map.setdefault(key, finger)
    for row in layout_rows:
        for col_idx, key in enumerate(row):
            if key == "Shift":
                finger_map[key] = "L_PINKY" if col_idx == 0 else "R_PINKY"
    return finger_map





class KeyButton(ctk.CTkButton):
    def __init__(
        self,
        parent,
        key: str,
        finger_color: str,
        on_press: Callable[[str], None],
        on_release: Callable[[str], None],
        **kwargs,
    ):
        self.key = key
        self._finger_color = finger_color
        self._on_press = on_press
        self._on_release = on_release
        self._is_modifier = key in ("Shift", "Ctrl", "Alt", "AltGr", "CapsLock", "Tab")
        self._pressed = False
        self._external_press_count = 0
        self._external_timeout_id = None
        self._error_highlight = False
        self._heatmap_intensity = 0.0

        self._idle_fg = _mix(finger_color, BG_HEX, 0.16)
        self._idle_border = _mix(finger_color, BORDER_HEX, 0.35)

        width = KEY_WIDTHS.get(key, 1.0) * 45
        height = 45

        super().__init__(
            parent,
            text=self._get_display_text(key),
            font=FONT_MONO if len(key) == 1 else FONT_CAPTION,
            width=width,
            height=height,
            corner_radius=6,
            fg_color=self._idle_fg,
            hover_color=self._idle_border,
            text_color="#F7F8F8",
            border_color=self._idle_border,
            border_width=1,
            command=lambda: None,
            **kwargs,
        )

        self.bind("<ButtonPress-1>", lambda e: self._handle_press())
        self.bind("<ButtonRelease-1>", lambda e: self._handle_release())

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

    def _handle_press(self):
        self._pressed = True
        self._update_appearance()
        self._on_press(self.key)

    def _handle_release(self):
        self._pressed = False
        self._update_appearance()
        self._on_release(self.key)

    def handle_external_press(self):
        self._external_press_count += 1
        self._pressed = True
        self._update_appearance()
        if self._external_timeout_id is None:
            self._external_timeout_id = self.after(400, self._external_timeout)

    def handle_external_release(self):
        self._external_press_count = max(0, self._external_press_count - 1)
        if self._external_press_count == 0:
            self._pressed = False
            self._update_appearance()

    def _external_timeout(self):
        self._external_timeout_id = None
        if self._external_press_count > 0:
            self._external_press_count = 0
            self._pressed = False
            self._update_appearance()

    def set_error(self, is_error: bool):
        self._error_highlight = is_error
        self._update_appearance()

    def set_heatmap(self, intensity: float):
        self._heatmap_intensity = max(0.0, min(1.0, intensity))
        self._update_appearance()

    def _update_appearance(self):
        target = self._finger_color
        if self._pressed:
            fg = self._idle_border
            text = "#F7F8F8"
            border = self._idle_border
        elif self._error_highlight:
            fg = "#DC2626"
            text = "#FFFFFF"
            border = "#DC2626"
        elif self._heatmap_intensity > 0:
            fg = _mix(target, BG_HEX, 0.16 + 0.7 * self._heatmap_intensity)
            text = "#FFFFFF" if self._heatmap_intensity > 0.5 else "#F7F8F8"
            border = _mix(target, BORDER_HEX, 0.35 + 0.5 * self._heatmap_intensity)
        else:
            fg = self._idle_fg
            text = "#F7F8F8"
            border = self._idle_border

        self.configure(fg_color=fg, text_color=text, border_color=border)


class VirtualKeyboard(ctk.CTkFrame):
    def __init__(
        self,
        parent,
        layout: str = "ABNT2",
        on_key_press: Callable[[str], None] | None = None,
        on_key_release: Callable[[str], None] | None = None,
        **kwargs,
    ):
        super().__init__(parent, fg_color="transparent", **kwargs)
        self.layout_name = layout
        self.layout = KEY_LAYOUTS.get(layout, KEY_LAYOUTS["ABNT2"])
        self.on_key_press = on_key_press
        self.on_key_release = on_key_release
        self.keys: dict[str, KeyButton] = {}
        self._finger_map: dict[str, str] = {}
        self._pressed_modifiers: set[str] = set()
        self._build_keyboard()
        self._build_legend()

    def _build_keyboard(self):
        self._finger_map = _build_finger_map(self.layout)
        for row in self.layout:
            row_frame = ctk.CTkFrame(self, fg_color="transparent")
            row_frame.pack(fill="x", pady=2)

            for key in row:
                finger = self._finger_map.get(key, "THUMB")
                btn = KeyButton(
                    row_frame,
                    key=key,
                    finger_color=FINGER_COLORS[finger],
                    on_press=self._on_key_press,
                    on_release=self._on_key_release,
                )
                btn.pack(side="left", padx=1)
                self.keys[key] = btn

    def _build_legend(self):
        legend = ctk.CTkFrame(self, fg_color="transparent")
        legend.pack(fill="x", pady=(4, 0))

        left_fingers = ["L_PINKY", "L_RING", "L_MIDDLE", "L_INDEX"]
        right_fingers = ["R_INDEX", "R_MIDDLE", "R_RING", "R_PINKY"]

        legend.grid_columnconfigure(0, weight=0)
        legend.grid_columnconfigure(5, weight=0)
        legend.grid_columnconfigure(11, weight=0)
        legend.grid_columnconfigure(14, weight=1)

        hand_label = Caption(legend, text="Esquerda", text_color="#9AA3B2")
        hand_label.grid(row=0, column=0, padx=(2, 8), sticky="w")

        for i, finger in enumerate(left_fingers):
            col = 1 + i * 2
            color = FINGER_COLORS[finger]
            chip = ctk.CTkFrame(legend, width=14, height=14, corner_radius=3, fg_color=color)
            chip.grid(row=0, column=col, padx=1, sticky="")
            name = Caption(legend, text=FINGER_NAMES[finger], text_color="#C9CDD6")
            name.grid(row=0, column=col + 1, padx=(2, 6), sticky="w")

        Caption(legend, text="Direita", text_color="#9AA3B2").grid(
            row=0, column=8, padx=(10, 8), sticky="w"
        )

        for i, finger in enumerate(right_fingers):
            col = 9 + i * 2
            color = FINGER_COLORS[finger]
            chip = ctk.CTkFrame(legend, width=14, height=14, corner_radius=3, fg_color=color)
            chip.grid(row=0, column=col, padx=1, sticky="")
            name = Caption(legend, text=FINGER_NAMES[finger], text_color="#C9CDD6")
            name.grid(row=0, column=col + 1, padx=(2, 6), sticky="w")

        color = FINGER_COLORS["THUMB"]
        chip = ctk.CTkFrame(legend, width=14, height=14, corner_radius=3, fg_color=color)
        chip.grid(row=0, column=14, padx=(10, 2), sticky="")
        Caption(legend, text="Polegar", text_color="#C9CDD6").grid(
            row=0, column=15, padx=(2, 0), sticky="w"
        )

    def _on_key_press(self, key: str):
        if key in ("Shift", "Ctrl", "Alt", "AltGr", "CapsLock", "Tab"):
            self._pressed_modifiers.add(key)
        if self.on_key_press:
            self.on_key_press(key)

    def _on_key_release(self, key: str):
        self._pressed_modifiers.discard(key)
        if self.on_key_release:
            self.on_key_release(key)

    def resolve_label(self, char: str, keysym: str) -> str | None:
        modifier_keysyms = {
            "Shift_L", "Shift_R", "Control_L", "Control_R", "Alt_L", "Alt_R",
            "Meta_L", "Meta_R", "Caps_Lock", "AltGr", "Num_Lock",
        }
        if keysym in modifier_keysyms:
            return None
        if keysym == "BackSpace":
            return "Backspace"
        if keysym in ("Return", "KP_Enter", "space"):
            return "Space" if keysym == "space" else "Enter"
        if keysym == "Tab":
            return "Tab"
        if char:
            key = char.lower()
            if key in self.keys:
                return key
            if char in self.keys:
                return char
        if char == "?":
            for candidate in ("?/Shift", "/"):
                if candidate in self.keys:
                    return candidate
        if keysym.lower() in self.keys:
            return keysym.lower()
        return None

    def press_key(self, label: str):
        if label in self.keys:
            self.keys[label].handle_external_press()

    def release_key(self, label: str):
        if label in self.keys:
            self.keys[label].handle_external_release()

    def set_key_error(self, key: str, is_error: bool):
        if key in self.keys:
            self.keys[key].set_error(is_error)

    def set_key_heatmap(self, key: str, intensity: float):
        if key in self.keys:
            self.keys[key].set_heatmap(intensity)

    def set_layout(self, layout: str):
        if layout in KEY_LAYOUTS:
            self.layout_name = layout
            self.layout = KEY_LAYOUTS[layout]
            for widget in self.winfo_children():
                widget.destroy()
            self.keys.clear()
            self._build_keyboard()
            self._build_legend()

    def highlight_composition(self, dead_key: str, base_key: str):
        if dead_key in self.keys:
            self.keys[dead_key].set_error(True)
        if base_key in self.keys:
            self.keys[base_key].set_error(True)

    def clear_all_highlights(self):
        for key in self.keys.values():
            key.set_error(False)