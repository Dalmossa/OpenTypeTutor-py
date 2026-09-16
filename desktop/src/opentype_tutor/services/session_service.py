import logging
from uuid import UUID

from ..models import (
    KeystrokeEvent,
    SessionCreateResponse,
    SessionResult,
)
from .api_client import ApiClient

logger = logging.getLogger(__name__)


class SessionService:
    def __init__(self, api_client: ApiClient):
        self.api = api_client

    async def create(self, lesson_id: UUID) -> SessionCreateResponse:
        response = await self.api.post(
            "/sessions",
            json_data={"lessonId": str(lesson_id)},
        )
        return SessionCreateResponse(**response.json())

    async def pause(self, session_id: UUID) -> None:
        await self.api.post(f"/sessions/{session_id}/pause")

    async def resume(self, session_id: UUID) -> None:
        await self.api.post(f"/sessions/{session_id}/resume")

    async def abandon(self, session_id: UUID) -> None:
        await self.api.post(f"/sessions/{session_id}/abandon")

    async def submit(
        self,
        session_id: UUID,
        keystrokes: list[KeystrokeEvent],
    ) -> SessionResult:
        body = {
            "keystrokes": [k.model_dump(by_alias=True) for k in keystrokes],
        }
        response = await self.api.post(
            f"/sessions/{session_id}/submit",
            json_data=body,
        )
        return SessionResult(**response.json())