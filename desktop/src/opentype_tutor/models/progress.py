from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel

from .base import BaseAPIModel
from .lesson import Lesson


class MasteryState(str, Enum):
    UNKNOWN = "UNKNOWN"
    LEARNING = "LEARNING"
    CONSOLIDATING = "CONSOLIDATING"
    MASTERED = "MASTERED"


class KeyPerformance(BaseModel):
    user_id: UUID | None = None
    logical_key: str = ""
    layout: str = ""
    attempts: int = 0
    errors: int = 0
    corrections: int = 0
    error_rate: float = 0.0
    key_accuracy: float = 0.0
    avg_latency_ms: float = 0.0
    mastery_state: MasteryState = MasteryState.UNKNOWN


class ProgressResponse(BaseAPIModel):
    current_level: int
    completed_lessons: int
    last_completed_at: datetime | None = None
    current_lesson: Lesson | None = None
    level_completion_rate: float = 0.0


class PracticeStatus(BaseAPIModel):
    accumulated_active_ms: int = 0
    practice_block_ms: int = 900000
    min_break_ms: int = 180000
    break_required: bool = False
    break_remaining_ms: int = 0