import logging

from ..models import ProgressResponse
from .api_client import ApiClient

logger = logging.getLogger(__name__)


class ProgressService:
    def __init__(self, api_client: ApiClient):
        self.api = api_client

    async def get_progress(self) -> ProgressResponse:
        response = await self.api.get("/me/progress")
        return ProgressResponse(**response.json())