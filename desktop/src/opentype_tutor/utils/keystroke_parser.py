import time
from dataclasses import dataclass

from ..models import KeystrokeEvent


@dataclass
class CompositionState:
    active: bool = False
    dead_key: str | None = None
    buffer: str = ""
    start_time: float = 0.0


class KeystrokeParser:
    def __init__(self, layout: str = "ABNT2"):
        self.layout = layout
        self.composition = CompositionState()
        self._last_keydown_time = 0.0

    def set_layout(self, layout: str):
        self.layout = layout
        self.reset_composition()

    def reset_composition(self):
        self.composition = CompositionState()

    def process_key_event(
        self,
        key: str,
        event_type: str,
        is_dead_key: bool = False,
        composed_char: str | None = None,
    ) -> list[KeystrokeEvent]:
        events = []
        current_time = time.monotonic() * 1000

        if event_type == "COMPOSITION_START" or (event_type == "KEYDOWN" and is_dead_key):
            self.composition.active = True
            self.composition.dead_key = key
            self.composition.buffer = ""
            self.composition.start_time = current_time
            events.append(KeystrokeEvent(
                key=key,
                type="COMPOSITION_START",
                timestamp_ms=int(current_time),
                composed_char=None,
            ))
            return events

        if event_type == "COMPOSITION_UPDATE":
            self.composition.buffer = composed_char or ""
            events.append(KeystrokeEvent(
                key=key,
                type="COMPOSITION_UPDATE",
                timestamp_ms=int(current_time),
                composed_char=composed_char,
            ))
            return events

        if event_type == "COMPOSITION_END" or (event_type == "KEYDOWN" and self.composition.active and not is_dead_key):
            final_char = composed_char or self.composition.buffer or key
            latency = int(current_time - self.composition.start_time) if self.composition.active else 0

            events.append(KeystrokeEvent(
                key=final_char,
                type="KEYDOWN",
                timestamp_ms=int(current_time),
                is_correction=False,
                composed_char=final_char if self.composition.active else None,
            ))
            self.reset_composition()
            return events

        if event_type == "KEYDOWN":
            events.append(KeystrokeEvent(
                key=key,
                type="KEYDOWN",
                timestamp_ms=int(current_time),
                is_correction=False,
            ))
            self._last_keydown_time = current_time

        elif event_type == "KEYUP":
            latency = int(current_time - self._last_keydown_time) if self._last_keydown_time else 0
            events.append(KeystrokeEvent(
                key=key,
                type="KEYUP",
                timestamp_ms=int(current_time),
                is_correction=False,
            ))

        return events

    def normalize_keystrokes(self, events: list[KeystrokeEvent]) -> list[KeystrokeEvent]:
        normalized = []
        for event in events:
            if event.type in ("KEYDOWN", "COMPOSITION_START", "COMPOSITION_END", "COMPOSITION_UPDATE"):
                normalized.append(event)
        return normalized