from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from .base import BaseAPIModel


class SessionStatus(str, Enum):
    CREATED = "CREATED"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    ABANDONED = "ABANDONED"
    COMPLETED = "COMPLETED"


BACKEND_STATE_TO_STATUS = {
    "IDLE": SessionStatus.CREATED,
    "RUNNING": SessionStatus.ACTIVE,
    "PAUSED": SessionStatus.PAUSED,
    "COMPLETED": SessionStatus.COMPLETED,
    "ABANDONED": SessionStatus.ABANDONED,
}


def status_from_state(state: str) -> SessionStatus:
    return BACKEND_STATE_TO_STATUS.get(state, SessionStatus.CREATED)


class KeystrokeEvent(BaseAPIModel):
    expected_key: str
    typed_key: str | None = None
    physical_key: str
    logical_key: str
    event_type: Literal["CORRECT", "INCORRECT", "CORRECTION", "DEAD_KEY_COMPOSE"]
    timestamp_ms: int
    latency_ms: float | None = None
    composed_character: str | None = None


class SessionCreateRequest(BaseAPIModel):
    lesson_id: UUID


class SessionCreateResponse(BaseAPIModel):
    session_id: UUID
    state: str


class SessionPauseRequest(BaseModel):
    pass


class SessionResumeRequest(BaseModel):
    pass


class SessionAbandonRequest(BaseModel):
    pass


class SessionSubmitRequest(BaseAPIModel):
    keystrokes: list[KeystrokeEvent]


class SessionMetrics(BaseAPIModel):
    characters_typed: int
    correct_characters: int
    incorrect_characters: int
    corrected_errors: int
    final_uncorrected_errors: int
    accuracy: float
    gross_wpm: float
    net_wpm: float
    active_duration_ms: int
    average_latency_ms: float


class SessionResult(BaseAPIModel):
    session_id: UUID
    state: str
    metrics: SessionMetrics


class SessionState(BaseModel):
    session_id: UUID | None = None
    lesson_id: UUID | None = None
    status: SessionStatus = SessionStatus.CREATED
    keystrokes_buffer: list[KeystrokeEvent] = []
    start_time: datetime | None = None
    pause_time: datetime | None = None
    total_paused_ms: int = 0
    active_duration_ms: int = 0