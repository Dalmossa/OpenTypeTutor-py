import logging
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from ..models import SessionResult, SessionState, UserProfile
from ..services import AuthService, LessonService, ProgressService, SessionService

logger = logging.getLogger(__name__)


@dataclass
class AppState:
    current_user: UserProfile | None = None
    access_token: str | None = None
    current_session: SessionState = field(default_factory=SessionState)
    current_result: SessionResult | None = None
    settings: dict[str, Any] = field(default_factory=dict)

    def reset_session(self):
        self.current_session = SessionState()
        self.current_result = None


class BaseController:
    def __init__(self, app_state: AppState):
        self.app_state = app_state
        self.auth_service: AuthService | None = None
        self.lesson_service: LessonService | None = None
        self.session_service: SessionService | None = None
        self.progress_service: ProgressService | None = None

    def set_services(
        self,
        auth: AuthService,
        lesson: LessonService,
        session: SessionService,
        progress: ProgressService,
    ):
        self.auth_service = auth
        self.lesson_service = lesson
        self.session_service = session
        self.progress_service = progress

    def require_auth(self) -> bool:
        if not self.app_state.current_user:
            logger.warning("Action requires authentication")
            return False
        return True

    def get_current_user_id(self) -> UUID | None:
        return self.app_state.current_user.id if self.app_state.current_user else None