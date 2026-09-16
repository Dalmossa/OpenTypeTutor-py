import httpx
import pytest
import respx

from opentype_tutor.controllers.auth_controller import AuthController
from opentype_tutor.controllers.base import AppState
from opentype_tutor.services import (
    ApiClient,
    AuthService,
    LessonService,
    ProgressService,
    SessionService,
)

USER_ID = "7a68a54e-6c9a-4f1e-9b1e-8d9c1f0e1a2b"


def _profile_json(layout: str = "ABNT2") -> dict:
    return {
        "id": USER_ID,
        "name": "Test User",
        "email": "test@example.com",
        "createdAt": "2026-09-11T00:00:00Z",
        "activeLayout": layout,
        "currentLevel": 1,
    }


@pytest.fixture
def auth_routes():
    state = {"layout": "ABNT2"}
    with respx.mock:
        respx.post("http://test/auth/register").mock(
            return_value=httpx.Response(201, json={"userId": USER_ID})
        )
        respx.post("http://test/auth/login").mock(
            return_value=httpx.Response(
                200,
                json={
                    "accessToken": "tok-access",
                    "refreshToken": "tok-refresh",
                },
            )
        )
        respx.get("http://test/users/me").mock(
            side_effect=lambda _request: httpx.Response(200, json=_profile_json(state["layout"]))
        )
        respx.patch("http://test/users/me").mock(
            side_effect=lambda request: _handle_patch(request, state)
        )
        yield


def _handle_patch(request: httpx.Request, state: dict) -> httpx.Response:
    import json

    body = json.loads(request.content)
    state["layout"] = body["layout"]
    return httpx.Response(
        200,
        json={
            "userId": USER_ID,
            "activeLayout": state["layout"],
            "currentLevel": 1,
        },
    )


class TestApiClientLifecycle:
    async def test_request_without_context_raises(self):
        client = ApiClient(base_url="http://test")
        with pytest.raises(RuntimeError, match="not initialized"):
            await client.post("/auth/register", json_data={}, requires_auth=False)

    async def test_register_works_inside_context(self, auth_routes):  # noqa: ARG002
        client = ApiClient(base_url="http://test")
        async with client:
            auth_service = AuthService(client)
            controller = AuthController(AppState())
            controller.set_services(
                auth_service,
                LessonService(client),
                SessionService(client),
                ProgressService(client),
            )
            ok, err = await controller.register(
                "Test User", "test@example.com", "pass12345", "ABNT2"
            )
            assert err is None, err
            assert ok is True
            assert controller.app_state.access_token == "tok-access"
            assert controller.app_state.current_user is not None
            assert controller.app_state.current_user.layout == "ABNT2"

    async def test_register_with_layout_applies_patch(self, auth_routes):  # noqa: ARG002
        client = ApiClient(base_url="http://test")
        async with client:
            auth_service = AuthService(client)
            controller = AuthController(AppState())
            controller.set_services(
                auth_service,
                LessonService(client),
                SessionService(client),
                ProgressService(client),
            )
            ok, err = await controller.register(
                "Test User", "test@example.com", "pass12345", "US-International"
            )
            assert err is None, err
            assert ok is True
            assert controller.app_state.access_token == "tok-access"
            assert controller.app_state.current_user.layout == "US-INTERNATIONAL"

    async def test_login_with_camel_contract(self, auth_routes):  # noqa: ARG002
        client = ApiClient(base_url="http://test")
        async with client:
            auth_service = AuthService(client)
            controller = AuthController(AppState())
            controller.set_services(
                auth_service,
                LessonService(client),
                SessionService(client),
                ProgressService(client),
            )
            ok, err = await controller.login("test@example.com", "pass12345")
            assert err is None, err
            assert ok is True
            assert auth_service.access_token == "tok-access"
            assert auth_service.user_profile is not None
            assert auth_service.user_profile.current_level == 1

    async def test_register_without_context_fails_clean(self):
        client = ApiClient(base_url="http://test")
        auth_service = AuthService(client)
        controller = AuthController(AppState())
        controller.set_services(
            auth_service,
            LessonService(client),
            SessionService(client),
            ProgressService(client),
        )
        ok, err = await controller.register("Test User", "test@example.com", "pass12345")
        assert ok is False
        assert err