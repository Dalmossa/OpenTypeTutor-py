import json
import logging
from contextlib import suppress

import keyring
from pydantic import BaseModel, ValidationError

from ..models import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
    UpdateLayoutRequest,
    UserProfile,
)
from .api_client import ApiClient, APIError

logger = logging.getLogger(__name__)

SERVICE_NAME = "opentype-tutor"
TOKEN_KEY = "tokens"


class TokenData(BaseModel):
    access_token: str
    refresh_token: str | None = None
    expires_in: int = 0


class AuthService:
    def __init__(self, api_client: ApiClient):
        self.api = api_client
        self._token_data: TokenData | None = None
        self._user_profile: UserProfile | None = None
        self._load_tokens()

    def _load_tokens(self) -> None:
        try:
            stored = keyring.get_password(SERVICE_NAME, TOKEN_KEY)
            if stored:
                data = json.loads(stored)
                self._token_data = TokenData(**data)
                if self._token_data.access_token:
                    self.api.set_access_token(self._token_data.access_token)
                    logger.info("Loaded stored access token")
        except Exception as e:
            logger.warning(f"Failed to load tokens from keyring: {e}")

    def _save_tokens(self) -> None:
        try:
            if self._token_data:
                keyring.set_password(SERVICE_NAME, TOKEN_KEY, self._token_data.model_dump_json())
                logger.debug("Saved tokens to keyring")
        except Exception as e:
            logger.warning(f"Failed to save tokens to keyring: {e}")

    def _clear_tokens(self) -> None:
        with suppress(Exception):
            keyring.delete_password(SERVICE_NAME, TOKEN_KEY)
        self._token_data = None
        self.api.set_access_token(None)

    @property
    def is_authenticated(self) -> bool:
        return self._token_data is not None and bool(self._token_data.access_token)

    @property
    def access_token(self) -> str | None:
        return self._token_data.access_token if self._token_data else None

    @property
    def user_profile(self) -> UserProfile | None:
        return self._user_profile

    async def login(self, email: str, password: str) -> TokenResponse:
        request = LoginRequest(email=email, password=password)
        response = await self.api.post(
            "/auth/login",
            json_data=request.model_dump(by_alias=True),
            requires_auth=False,
        )
        token_response = TokenResponse(**response.json())
        self._token_data = TokenData(
            access_token=token_response.access_token,
            refresh_token=token_response.refresh_token,
            expires_in=token_response.expires_in,
        )
        self._save_tokens()
        self.api.set_access_token(token_response.access_token)
        await self._fetch_profile()
        return token_response

    async def register(
        self, name: str, email: str, password: str, layout: str = "ABNT2"
    ) -> TokenResponse:
        request = RegisterRequest(name=name, email=email, password=password)
        await self.api.post(
            "/auth/register",
            json_data=request.model_dump(by_alias=True),
            requires_auth=False,
        )

        token_response = await self.login(email, password)
        if layout != "ABNT2":
            await self.update_layout(layout)
        return token_response

    async def _fetch_profile(self) -> None:
        try:
            response = await self.api.get("/users/me")
            self._user_profile = UserProfile(**response.json())
        except (APIError, ValidationError, ValueError) as e:
            logger.warning(f"Failed to fetch profile after login: {e}")

    async def refresh_token(self) -> bool:
        if not self._token_data or not self._token_data.refresh_token:
            return False
        try:
            request = RefreshTokenRequest(refresh_token=self._token_data.refresh_token)
            response = await self.api.post(
                "/auth/refresh",
                json_data=request.model_dump(by_alias=True),
                requires_auth=False,
            )
            token_response = TokenResponse(**response.json())
            self._token_data = TokenData(
                access_token=token_response.access_token,
                refresh_token=token_response.refresh_token,
                expires_in=token_response.expires_in,
            )
            self._save_tokens()
            self.api.set_access_token(token_response.access_token)
        except APIError as e:
            if e.status_code == 401:
                await self.logout()
            return False
        else:
            return True

    async def logout(self) -> None:
        self._clear_tokens()
        self._user_profile = None

    async def get_profile(self) -> UserProfile:
        if not self._user_profile:
            response = await self.api.get("/users/me")
            self._user_profile = UserProfile(**response.json())
        return self._user_profile

    async def update_layout(self, layout: str) -> UserProfile:
        api_layout = "US-INTERNATIONAL" if layout == "US-International" else layout
        request = UpdateLayoutRequest(layout=api_layout)
        await self.api.patch("/users/me", json_data=request.model_dump(by_alias=True))
        await self._fetch_profile()
        assert self._user_profile is not None, "Profile not loaded"
        return self._user_profile