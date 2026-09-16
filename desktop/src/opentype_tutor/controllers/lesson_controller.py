import logging
from uuid import UUID

from ..models import Lesson, LessonFilters, SessionStatus, status_from_state
from .base import BaseController

logger = logging.getLogger(__name__)


class LessonController(BaseController):
    def __init__(self, app_state):
        super().__init__(app_state)
        self._cached_lessons: list[Lesson] = []
        self._current_filters: LessonFilters = LessonFilters()

    async def load_lessons(self, filters: LessonFilters | None = None) -> tuple[bool, str | None]:
        if not self.lesson_service:
            return False, "Lesson service not available"
        self._current_filters = filters or LessonFilters()
        try:
            self._cached_lessons = await self.lesson_service.list(self._current_filters)
            return True, None
        except Exception as e:
            logger.error(f"Failed to load lessons: {e}")
            return False, str(e)

    async def load_next_page(self) -> tuple[bool, str | None]:
        if not self.lesson_service:
            return False, "Lesson service not available"
        try:
            lessons = await self.lesson_service.list(self._current_filters)
            self._cached_lessons = lessons
            return True, None
        except Exception as e:
            logger.error(f"Failed to reload lessons: {e}")
            return False, str(e)

    def get_lessons(self) -> list[Lesson]:
        return self._cached_lessons

    def get_total(self) -> int:
        return len(self._cached_lessons)

    def has_more(self) -> bool:
        return False

    def get_current_filters(self) -> LessonFilters:
        return self._current_filters

    async def start_session(self, lesson_id: UUID) -> tuple[UUID | None, str | None]:
        if not self.session_service or not self.require_auth():
            return None, "Not authenticated or session service unavailable"
        try:
            response = await self.session_service.create(lesson_id)
            self.app_state.current_session.session_id = response.session_id
            self.app_state.current_session.lesson_id = lesson_id
            self.app_state.current_session.status = status_from_state(response.state)
            return response.session_id, None
        except Exception as e:
            logger.error(f"Failed to start session: {e}")
            return None, str(e)

    async def get_reinforcement_lesson(self) -> tuple[Lesson | None, str | None]:
        if not self.lesson_service or not self.require_auth():
            return None, "Not authenticated or lesson service unavailable"
        try:
            lesson = await self.lesson_service.get_reinforcement()
            return lesson, None
        except Exception as e:
            logger.error(f"Failed to get reinforcement lesson: {e}")
            return None, str(e)