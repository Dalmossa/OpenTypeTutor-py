from .models import Difficulty, LessonType

APP_TITLE = "OpenType Tutor"

LESSON_TYPE_LABELS: dict[LessonType, str] = {
    LessonType.INTRODUCTION: "Introdução",
    LessonType.GUIDED: "Guiado",
    LessonType.PRACTICE: "Prática",
    LessonType.REINFORCEMENT: "Reforço",
    LessonType.ASSESSMENT: "Avaliação",
}

DIFFICULTY_LABELS: dict[Difficulty, str] = {
    Difficulty.BEGINNER: "Iniciante",
    Difficulty.INTERMEDIATE: "Intermediário",
    Difficulty.ADVANCED: "Avançado",
    Difficulty.GUIDED: "Guiado",
    Difficulty.REINFORCEMENT: "Reforço",
    Difficulty.FREE: "Livre",
}

REST_STATE_LABELS: dict[str, str] = {
    "CREATED": "Pronto",
    "ACTIVE": "Digitando...",
    "PAUSED": "Pausada",
    "ABANDONED": "Abandonada",
    "COMPLETED": "Concluída",
}


def lesson_type_label(value: LessonType) -> str:
    return LESSON_TYPE_LABELS.get(value, value.value)


def difficulty_label(value: Difficulty) -> str:
    return DIFFICULTY_LABELS.get(value, value.value)