import logging
from typing import Any

import httpx

from ..config.settings import settings

logger = logging.getLogger(__name__)


class APIError(Exception):
    def __init__(self, status_code: int, message: str, code: str | None = None, details: dict | None = None):
        self.status_code = status_code
        self.message = message
        self.code = code
        self.details = details
        super().__init__(f"API Error {status_code}: {message}")


class ApiClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or settings.api_base_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None
        self._access_token: str | None = None

    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(settings.request_timeout),
            headers={"Content-Type": "application/json"},
        )
        return self

    async def __aexit__(self, *args):
        if self._client:
            await self._client.aclose()

    def set_access_token(self, token: str | None):
        self._access_token = token
        if self._client:
            if token:
                self._client.headers["Authorization"] = f"Bearer {token}"
            else:
                self._client.headers.pop("Authorization", None)

    def get_access_token(self) -> str | None:
        return self._access_token

    async def request(
        self,
        method: str,
        path: str,
        *,
        json_data: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        requires_auth: bool = True,
    ) -> httpx.Response:
        if not self._client:
            raise RuntimeError("ApiClient not initialized. Use async context manager.")

        headers = {}
        if requires_auth and self._access_token:
            headers["Authorization"] = f"Bearer {self._access_token}"

        try:
            logger.debug("HTTP Request -> %s %s params=%s json=%s", method, path, params, json_data)
            response = await self._client.request(
                method=method,
                url=path,
                json=json_data,
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            try:
                logger.debug("HTTP Response <- %s %s body=%s", method, path, response.json())
            except Exception:
                logger.debug("HTTP Response <- %s %s (non-json body)", method, path)
            return response
        except httpx.HTTPStatusError as e:
            try:
                error_data = e.response.json()
                message = error_data.get("error", {}).get("message", str(e))
                code = error_data.get("error", {}).get("code")
                details = error_data.get("error", {}).get("details")
            except Exception:
                message = e.response.text or str(e)
                code = None
                details = None
            logger.debug("HTTP Error Response <- %s %s status=%s body=%s", method, path, e.response.status_code, e.response.text)
            raise APIError(e.response.status_code, message, code, details)
        except httpx.RequestError as e:
            logger.error(f"Request error: {e}")
            raise APIError(0, f"Network error: {e}")

    async def get(self, path: str, params: dict | None = None, requires_auth: bool = True) -> httpx.Response:
        return await self.request("GET", path, params=params, requires_auth=requires_auth)

    async def post(
        self, path: str, json_data: dict | None = None, requires_auth: bool = True
    ) -> httpx.Response:
        return await self.request("POST", path, json_data=json_data, requires_auth=requires_auth)

    async def patch(
        self, path: str, json_data: dict | None = None, requires_auth: bool = True
    ) -> httpx.Response:
        return await self.request("PATCH", path, json_data=json_data, requires_auth=requires_auth)

    async def delete(self, path: str, requires_auth: bool = True) -> httpx.Response:
        return await self.request("DELETE", path, requires_auth=requires_auth)