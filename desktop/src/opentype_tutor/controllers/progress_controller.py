import logging

from ..models import (
    KeyPerformance,
    MasteryState,
    ProgressResponse,
)
from .base import BaseController

logger = logging.getLogger(__name__)


class ProgressController(BaseController):
    def __init__(self, app_state):
        super().__init__(app_state)
        self._cached_progress: ProgressResponse | None = None

    async def load_progress(self) -> tuple[bool, str | None]:
        if not self.require_auth() or not self.progress_service:
            return False, "Not authenticated or progress service unavailable"
        try:
            self._cached_progress = await self.progress_service.get_progress()
            return True, None
        except Exception as e:
            logger.error(f"Failed to load progress: {e}")
            return False, str(e)

    def get_progress(self) -> ProgressResponse | None:
        return self._cached_progress

    def get_key_performances(self) -> list[KeyPerformance]:
        return []

    def get_mastered_keys(self) -> list[KeyPerformance]:
        return [
            kp for kp in self.get_key_performances()
            if kp.mastery_state == MasteryState.MASTERED
        ]

    def get_learning_keys(self) -> list[KeyPerformance]:
        return [
            kp for kp in self.get_key_performances()
            if kp.mastery_state == MasteryState.LEARNING
        ]

    def get_consolidating_keys(self) -> list[KeyPerformance]:
        return [
            kp for kp in self.get_key_performances()
            if kp.mastery_state == MasteryState.CONSOLIDATING
        ]

    def get_unknown_keys(self) -> list[KeyPerformance]:
        return [
            kp for kp in self.get_key_performances()
            if kp.mastery_state == MasteryState.UNKNOWN
        ]