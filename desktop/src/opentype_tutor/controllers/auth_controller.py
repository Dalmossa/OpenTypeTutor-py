import logging
from collections.abc import Awaitable, Callable

from ..models import UserProfile
from .base import AppState, BaseController

logger = logging.getLogger(__name__)


class AuthController(BaseController):
    def __init__(self, app_state: AppState):
        super().__init__(app_state)
        self._on_login_success: Callable[[], Awaitable[None]] | None = None
        self._on_logout: Callable[[], Awaitable[None]] | None = None

    def set_callbacks(
        self,
        on_login_success: Callable[[], Awaitable[None]] | None = None,
        on_logout: Callable[[], Awaitable[None]] | None = None,
    ):
        self._on_login_success = on_login_success
        self._on_logout = on_logout

    async def login(self, email: str, password: str) -> tuple[bool, str | None]:
        if not self.auth_service:
            return False, "Serviço de autenticação não inicializado"
        try:
            await self.auth_service.login(email, password)
            self.app_state.current_user = self.auth_service.user_profile
            self.app_state.access_token = self.auth_service.access_token
            logger.info(f"Usuário autenticado: {email}")
            if self._on_login_success:
                await self._on_login_success()
            return True, None
        except Exception as e:
            logger.error(f"Falha no login: {e}")
            return False, str(e)

    async def register(
        self, name: str, email: str, password: str, layout: str = "ABNT2"
    ) -> tuple[bool, str | None]:
        if not self.auth_service:
            return False, "Serviço de autenticação não inicializado"
        try:
            await self.auth_service.register(name, email, password, layout)
            self.app_state.current_user = self.auth_service.user_profile
            self.app_state.access_token = self.auth_service.access_token
            logger.info(f"Usuário registrado: {email}")
            if self._on_login_success:
                await self._on_login_success()
            return True, None
        except Exception as e:
            logger.error(f"Falha no registro: {e}")
            return False, str(e)

    async def logout(self) -> None:
        if self.auth_service:
            await self.auth_service.logout()
        self.app_state.current_user = None
        self.app_state.access_token = None
        self.app_state.reset_session()
        logger.info("Usuário desconectado")
        if self._on_logout:
            await self._on_logout()

    async def refresh_profile(self) -> UserProfile | None:
        if not self.auth_service or not self.require_auth():
            return None
        try:
            profile = await self.auth_service.get_profile()
            self.app_state.current_user = profile
            return profile
        except Exception as e:
            logger.error(f"Falha ao atualizar perfil: {e}")
            return None

    async def update_layout(self, layout: str) -> tuple[bool, str | None]:
        if not self.auth_service or not self.require_auth():
            return False, "Não autenticado"
        try:
            profile = await self.auth_service.update_layout(layout)
            self.app_state.current_user = profile
            return True, None
        except Exception as e:
            logger.error(f"Falha ao atualizar layout: {e}")
            return False, str(e)

    @property
    def is_authenticated(self) -> bool:
        return self.auth_service.is_authenticated if self.auth_service else False