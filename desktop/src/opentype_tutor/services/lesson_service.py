import logging
from uuid import UUID

from ..models import Lesson, LessonFilters
from .api_client import ApiClient

logger = logging.getLogger(__name__)


class LessonService:
    def __init__(self, api_client: ApiClient):
        self.api = api_client

    async def list(self, filters: LessonFilters | None = None) -> list[Lesson]:
        params = {}
        if filters:
            if filters.level is not None:
                params["level"] = filters.level
            if filters.type is not None:
                params["type"] = filters.type.value
            if filters.layout:
                params["layout"] = filters.layout
        response = await self.api.get("/lessons", params=params)
        return [Lesson(**item) for item in response.json()]

    async def get(self, lesson_id: UUID) -> Lesson:
        response = await self.api.get(f"/lessons/{lesson_id}")
        return Lesson(**response.json())

    async def get_reinforcement(self) -> Lesson:
        response = await self.api.get("/me/reinforcement-lesson")
        return Lesson(**response.json())