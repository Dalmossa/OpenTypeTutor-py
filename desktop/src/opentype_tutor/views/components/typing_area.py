import logging
import time
from collections.abc import Awaitable, Callable

import customtkinter as ctk

from ...models import KeystrokeEvent
from ..theme import FONT_MONO_LG

logger = logging.getLogger(__name__)


class TypingArea(ctk.CTkFrame):
    def __init__(
        self,
        parent,
        on_keystroke: Callable[[KeystrokeEvent], Awaitable[None]] | None = None,
        on_physical_key_press: Callable[[str, str], None] | None = None,
        on_physical_key_release: Callable[[str, str], None] | None = None,
        **kwargs,
    ):
        super().__init__(parent, fg_color="#0F1011", border_color="#23252A", border_width=1, corner_radius=12, **kwargs)
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(0, weight=1)
        self.grid_propagate(False)
        self.configure(height=200)

        self.on_keystroke = on_keystroke
        self.on_physical_key_press = on_physical_key_press
        self.on_physical_key_release = on_physical_key_release
        self.target_text = ""
        self.current_position = 0
        self.errors: list[int] = []
        self._composition_buffer = ""
        self._in_composition = False
        self._composition_start_time: float | None = None
        self._last_event_time: float | None = None

        self.textbox = ctk.CTkTextbox(
            self,
            font=FONT_MONO_LG,
            fg_color="#0F1011",
            text_color="#F7F8F8",
            border_width=0,
            corner_radius=0,
            activate_scrollbars=False,
            state="disabled",
            wrap="none",
            spacing1=4,
            spacing3=4,
        )
        self.textbox.grid(row=0, column=0, sticky="nsew", padx=16, pady=16)

        self.textbox.tag_config("correct", foreground="#4ADE80")
        self.textbox.tag_config("incorrect", foreground="#F87171", underline=True)
        self.textbox.tag_config("current", background="#6366F1")
        self.textbox.tag_config("pending", foreground="#9CA3AF")
        self.textbox.tag_config("composed", foreground="#F7F8F8")

        self._toplevel = self.winfo_toplevel()
        self._key_press_bind_id = self._toplevel.bind("<KeyPress>", self._on_key_press, add="+")
        self._key_release_bind_id = self._toplevel.bind(
            "<KeyRelease>", self._on_key_release, add="+"
        )
        self.focus_set()

    def destroy(self):
        self._toplevel.unbind("<KeyPress>", self._key_press_bind_id)
        self._toplevel.unbind("<KeyRelease>", self._key_release_bind_id)
        super().destroy()

    def set_target_text(self, text: str):
        self.target_text = text
        self.current_position = 0
        self.errors = []
        self._composition_buffer = ""
        self._in_composition = False
        self._composition_start_time = None
        self._last_event_time = None
        if text:
            if self.winfo_ismapped():
                self._render()
            else:
                self.after(10, self._render)

    def _render(self):
        self.textbox.configure(state="normal")
        self.textbox.delete("1.0", "end")

        for i, char in enumerate(self.target_text):
            if i < self.current_position:
                tag = "incorrect" if i in self.errors else "correct"
                self.textbox.insert("end", char, tag)
            elif i == self.current_position:
                self.textbox.insert("end", char, "current")
            else:
                self.textbox.insert("end", char, "pending")

        if self._in_composition and self._composition_buffer:
            self.textbox.insert("end", f" [{self._composition_buffer}]", "composed")

        self.textbox.configure(state="disabled")
        self.textbox.see("end")
        self.textbox.update_idletasks()

    def _make_event(
        self,
        expected: str,
        typed: str | None,
        logical: str,
        event_type: str,
    ) -> KeystrokeEvent:
        now_ms = time.monotonic() * 1000
        latency_ms = None
        if self._last_event_time is not None:
            latency_ms = max(0.0, now_ms - self._last_event_time)
        self._last_event_time = now_ms
        return KeystrokeEvent(
            expected_key=expected,
            typed_key=typed,
            physical_key=logical,
            logical_key=logical,
            event_type=event_type,
            timestamp_ms=int(now_ms),
            latency_ms=latency_ms,
        )

    def _on_key_press(self, event):
        modifier_keysyms = ("Shift_L", "Shift_R", "Control_L", "Control_R", "Alt_L", "Alt_R", "Caps_Lock", "Tab", "Super_L", "Super_R")
        if event.keysym in modifier_keysyms:
            return

        if (
            getattr(event, "widget", None) is not None
            and isinstance(event.widget, ctk.CTkButton)
            and event.keysym in ("space", "Return")
        ):
            return

        if self.on_physical_key_press:
            self.on_physical_key_press(event.char, event.keysym)

        if event.keysym == "Backspace":
            self._handle_backspace()
            return

        char = event.char
        if char:
            self._handle_character(char)

    def _on_key_release(self, event):
        if self.on_physical_key_release:
            self.on_physical_key_release(event.char, event.keysym)

    def _handle_character(self, char: str):
        if self.current_position >= len(self.target_text):
            return

        expected = self.target_text[self.current_position]
        is_correct = char == expected

        if not is_correct:
            self.errors.append(self.current_position)

        self.current_position += 1
        self._render()

        if self.on_keystroke:
            import asyncio
            event = self._make_event(
                expected,
                char,
                char,
                "CORRECT" if is_correct else "INCORRECT",
            )
            asyncio.ensure_future(self.on_keystroke(event))

    def _handle_backspace(self):
        if self.current_position <= 0:
            return

        corrected_index = self.current_position - 1
        expected = self.target_text[corrected_index]
        self.current_position = corrected_index
        was_error = corrected_index in self.errors
        if was_error:
            self.errors.remove(corrected_index)
        self._render()

        if self.on_keystroke:
            import asyncio
            event = self._make_event(
                expected,
                None,
                "Backspace",
                "CORRECTION",
            )
            asyncio.ensure_future(self.on_keystroke(event))

    def handle_composition_start(self):
        self._in_composition = True
        self._composition_buffer = ""
        self._composition_start_time = time.monotonic() * 1000
        self._render()

        if self.on_keystroke:
            import asyncio
            event = KeystrokeEvent(
                expected_key="",
                typed_key=None,
                physical_key="Compose",
                logical_key="Compose",
                event_type="DEAD_KEY_COMPOSE",
                timestamp_ms=int(self._composition_start_time),
                latency_ms=None,
                composed_character=None,
            )
            asyncio.ensure_future(self.on_keystroke(event))

    def handle_composition_update(self, text: str):
        self._composition_buffer = text
        self._render()

    def handle_composition_end(self, composed_char: str):
        self._in_composition = False
        self._composition_buffer = ""
        self._last_event_time = self._composition_start_time
        self._composition_start_time = None
        self._handle_character(composed_char)

    def get_progress(self) -> float:
        if not self.target_text:
            return 0.0
        return min(1.0, self.current_position / len(self.target_text))

    def get_error_count(self) -> int:
        return len(self.errors)

    def reset(self):
        self.target_text = ""
        self.current_position = 0
        self.errors = []
        self._composition_buffer = ""
        self._in_composition = False
        self._composition_start_time = None
        self._last_event_time = None
        self.textbox.configure(state="normal")
        self.textbox.delete("1.0", "end")
        self.textbox.configure(state="disabled")