from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_base_url: str = Field(default="http://localhost:3000", alias="API_BASE_URL")
    token_storage_path: Path = Field(
        default=Path.home() / ".config" / "opentype-tutor" / "tokens.json",
        alias="TOKEN_STORAGE_PATH",
    )
    theme_mode: str = Field(default="dark", alias="THEME_MODE")
    theme_color: str = Field(default="blue", alias="THEME_COLOR")
    polling_interval_ms: int = Field(default=500, alias="POLLING_INTERVAL_MS")
    keystroke_batch_size: int = Field(default=50, alias="KEYSTROKE_BATCH_SIZE")
    keystroke_flush_interval_ms: int = Field(default=1000, alias="KEYSTROKE_FLUSH_INTERVAL_MS")
    request_timeout: float = Field(default=30.0, alias="REQUEST_TIMEOUT")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")

    def ensure_token_dir(self) -> None:
        self.token_storage_path.parent.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_token_dir()