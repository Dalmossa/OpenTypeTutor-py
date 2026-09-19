import httpx
import pytest
import respx

from opentype_tutor.controllers.auth_controller import AuthController
from opentype_tutor.controllers.base import AppState
from opentype_tutor.controllers.session_controller import SessionController
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

    async def test_get_practice_status_parses_pacing_contract(self):
        # RN33 - SessionService.get_practice_status parses o contrato camelCase
        with respx.mock:
            respx.get("http://test/me/practice-status").mock(
                return_value=httpx.Response(
                    200,
                    json={
                        "accumulatedActiveMs": 925000,
                        "practiceBlockMs": 900000,
                        "minBreakMs": 180000,
                        "breakRequired": True,
                        "breakRemainingMs": 45000,
                    },
                )
            )
            client = ApiClient(base_url="http://test")
            async with client:
                service = SessionService(client)
                status = await service.get_practice_status()
        assert status.break_required is True
        assert status.break_remaining_ms == 45000
        assert status.accumulated_active_ms == 925000

    async def test_session_controller_practice_status_requires_auth(self):
        # RN33 - sem usuário autenticado, controller não consulta o serviço
        client = ApiClient(base_url="http://test")
        controller = SessionController(AppState())
        async with client:
            controller.set_services(
                AuthService(client),
                LessonService(client),
                SessionService(client),
                ProgressService(client),
            )
            assert await controller.get_practice_status() is None

    async def test_session_controller_practice_status_on_network_error_returns_none(self):
        # RN33 - falha de rede não bloqueia: o backend reimpõe via BREAK_REQUIRED
        with respx.mock:
            respx.get("http://test/me/practice-status").mock(
                side_effect=httpx.ConnectError("network down")
            )
            client = ApiClient(base_url="http://test")
            controller = SessionController(AppState())
            controller.app_state.current_user = type(
                "FakeUser", (), {"id": USER_ID}
            )()
            async with client:
                controller.set_services(
                    AuthService(client),
                    LessonService(client),
                    SessionService(client),
                    ProgressService(client),
                )
                assert await controller.get_practice_status() is None