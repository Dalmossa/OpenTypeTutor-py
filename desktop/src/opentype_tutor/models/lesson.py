from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field

from .base import BaseAPIModel


class LessonType(str, Enum):
    INTRODUCTION = "INTRODUCTION"
    GUIDED = "GUIDED"
    PRACTICE = "PRACTICE"
    REINFORCEMENT = "REINFORCEMENT"
    ASSESSMENT = "ASSESSMENT"


class Difficulty(str, Enum):
    BEGINNER = "BEGINNER"
    INTERMEDIATE = "INTERMEDIATE"
    ADVANCED = "ADVANCED"
    GUIDED = "GUIDED"
    REINFORCEMENT = "REINFORCEMENT"
    FREE = "FREE"


class Lesson(BaseAPIModel):
    id: UUID
    level: int = 1
    title: str = ""
    content: str = ""
    target_keys: list[str] = Field(default_factory=list)
    difficulty: Difficulty = Difficulty.BEGINNER
    type: LessonType = LessonType.GUIDED
    layout: str = "ABNT2"
    order: int = 0
    created_at: str | None = None


class LessonFilters(BaseModel):
    level: int | None = None
    type: LessonType | None = None
    layout: str | None = None