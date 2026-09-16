import asyncio
import logging
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from uuid import UUID

from ..models import (
    KeystrokeEvent,
    SessionMetrics,
    SessionResult,
    SessionState,
    SessionStatus,
    status_from_state,
)
from ..services.api_client import APIError
from .base import BaseController

logger = logging.getLogger(__name__)


@dataclass
class SessionCallbacks:
    on_metrics_update: Callable[[SessionMetrics], Awaitable[None]] | None = None
    on_session_complete: Callable[[SessionResult], Awaitable[None]] | None = None
    on_status_change: Callable[[SessionStatus], Awaitable[None]] | None = None
    on_keystroke: Callable[[KeystrokeEvent], Awaitable[None]] | None = None


class SessionController(BaseController):
    def __init__(self, app_state):
        super().__init__(app_state)
        self._callbacks = SessionCallbacks()
        self._session_start_time: float | None = None
        self._total_paused_time = 0.0
        self._pause_start_time: float | None = None

    def set_callbacks(self, callbacks: SessionCallbacks):
        self._callbacks = callbacks

    def _get_active_duration_ms(self) -> int:
        if self._session_start_time is None:
            return 0
        now = time.monotonic()
        active = (now - self._session_start_time) - self._total_paused_time
        if self._pause_start_time is not None:
            active -= (now - self._pause_start_time)
        return max(0, int(active * 1000))

    async def start_session(self, lesson_id: UUID) -> tuple[bool, str | None]:
        if not self.session_service or not self.require_auth():
            return False, "Not authenticated or session service unavailable"

        self.app_state.current_session = SessionState(
            lesson_id=lesson_id,
            status=SessionStatus.CREATED,
        )
        self._session_start_time = None
        self._total_paused_time = 0.0
        self._pause_start_time = None

        try:
            response = await self.session_service.create(lesson_id)
            self.app_state.current_session.session_id = response.session_id
            self.app_state.current_session.status = status_from_state(response.state)
            self._session_start_time = time.monotonic()
            if self._callbacks.on_status_change:
                await self._callbacks.on_status_change(self.app_state.current_session.status)
            return True, None
        except Exception as e:
            # Handle server-side LESSON_NOT_FOUND gracefully: refresh lessons cache and inform user
            logger.error(f"Failed to start session: {e}")
            try:
                if isinstance(e, APIError) and e.code == 'LESSON_NOT_FOUND':
                    logger.info("Lesson not found on server, refreshing lesson list")
                    if self.lesson_service:
                        await self.lesson_service.list({})
            except Exception:
                logger.exception("Failed while handling LESSON_NOT_FOUND")
            return False, str(e)

    def add_keystroke(self, keystroke: KeystrokeEvent):
        self.app_state.current_session.keystrokes_buffer.append(keystroke)
        self.app_state.current_session.active_duration_ms = self._get_active_duration_ms()
        if self._callbacks.on_keystroke:
            callback = self._callbacks.on_keystroke(keystroke)
            asyncio.ensure_future(callback)

    async def pause(self) -> tuple[bool, str | None]:
        if not self.session_service or not self.app_state.current_session.session_id:
            return False, "No active session"
        if self.app_state.current_session.status != SessionStatus.ACTIVE:
            return False, "Session not active"
        try:
            await self.session_service.pause(self.app_state.current_session.session_id)
            self.app_state.current_session.status = SessionStatus.PAUSED
            self._pause_start_time = time.monotonic()
            if self._callbacks.on_status_change:
                await self._callbacks.on_status_change(SessionStatus.PAUSED)
            return True, None
        except Exception as e:
            logger.error(f"Failed to pause session: {e}")
            return False, str(e)

    async def resume(self) -> tuple[bool, str | None]:
        if not self.session_service or not self.app_state.current_session.session_id:
            return False, "No active session"
        if self.app_state.current_session.status != SessionStatus.PAUSED:
            return False, "Session not paused"
        try:
            await self.session_service.resume(self.app_state.current_session.session_id)
            if self._pause_start_time is not None:
                self._total_paused_time += time.monotonic() - self._pause_start_time
                self._pause_start_time = None
            self.app_state.current_session.status = SessionStatus.ACTIVE
            if self._callbacks.on_status_change:
                await self._callbacks.on_status_change(SessionStatus.ACTIVE)
            return True, None
        except Exception as e:
            logger.error(f"Failed to resume session: {e}")
            return False, str(e)

    async def abandon(self) -> tuple[bool, str | None]:
        if not self.session_service or not self.app_state.current_session.session_id:
            return False, "No active session"
        try:
            await self.session_service.abandon(self.app_state.current_session.session_id)
            self.app_state.current_session.status = SessionStatus.ABANDONED
            if self._callbacks.on_status_change:
                await self._callbacks.on_status_change(SessionStatus.ABANDONED)
            return True, None
        except Exception as e:
            logger.error(f"Failed to abandon session: {e}")
            return False, str(e)

    async def submit(self) -> tuple[SessionResult | None, str | None]:
        if not self.session_service or not self.app_state.current_session.session_id:
            return None, "No active session"
        if self.app_state.current_session.status not in (SessionStatus.ACTIVE, SessionStatus.PAUSED):
            return None, "Session not in progress"

        keystrokes = list(self.app_state.current_session.keystrokes_buffer)

        try:
            result = await self.session_service.submit(
                self.app_state.current_session.session_id,
                keystrokes,
            )
            self.app_state.current_session.status = SessionStatus.COMPLETED
            self.app_state.current_result = result
            if self._callbacks.on_session_complete:
                await self._callbacks.on_session_complete(result)
            return result, None
        except Exception as e:
            logger.error(f"Failed to submit session: {e}")
            return None, str(e)

    def get_current_metrics(self) -> dict:
        session = self.app_state.current_session
        return {
            "session_id": str(session.session_id) if session.session_id else None,
            "status": session.status.value,
            "keystrokes_count": len(session.keystrokes_buffer),
            "active_duration_ms": self._get_active_duration_ms(),
        }

    @property
    def current_session_id(self) -> UUID | None:
        return self.app_state.current_session.session_id

    @property
    def is_active(self) -> bool:
        return self.app_state.current_session.status in (SessionStatus.ACTIVE, SessionStatus.PAUSED)