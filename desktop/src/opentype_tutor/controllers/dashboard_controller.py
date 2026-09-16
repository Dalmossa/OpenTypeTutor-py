import logging
from datetime import datetime
from uuid import UUID

from ..models import Lesson, ProgressResponse
from .base import BaseController

logger = logging.getLogger(__name__)


class DashboardController(BaseController):
    def __init__(self, app_state):
        super().__init__(app_state)
        self._cached_progress: ProgressResponse | None = None

    async def load_dashboard_data(self) -> tuple[bool, str | None]:
        if not self.require_auth():
            return False, "Not authenticated"
        if not self.progress_service:
            return False, "Progress service not available"
        try:
            self._cached_progress = await self.progress_service.get_progress()
            return True, None
        except Exception as e:
            logger.error(f"Failed to load dashboard data: {e}")
            return False, str(e)

    def get_cached_progress(self) -> ProgressResponse | None:
        return self._cached_progress

    def get_current_lesson(self) -> Lesson | None:
        return self._cached_progress.current_lesson if self._cached_progress else None

    def get_current_lesson_id(self) -> UUID | None:
        lesson = self.get_current_lesson()
        return lesson.id if lesson else None

    def get_current_level(self) -> int:
        return self._cached_progress.current_level if self._cached_progress else 1

    def get_completed_lessons_count(self) -> int:
        return self._cached_progress.completed_lessons if self._cached_progress else 0

    def get_level_completion_rate(self) -> float:
        return self._cached_progress.level_completion_rate if self._cached_progress else 0.0

    def get_last_completed_at(self) -> datetime | None:
        return self._cached_progress.last_completed_at if self._cached_progress else None