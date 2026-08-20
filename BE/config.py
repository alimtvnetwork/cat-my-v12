"""Runtime settings for BE.

Spec: spec/21-app/backend-implementation-request-v1.md (§ Config & CORS).
Guideline: spec/coding-guidelines/python.md (typed at boundary, functions ≤ 15 lines).

Env var prefix: `BE_` (e.g. `BE_PORT=9000`). Defaults ship a dev-safe loopback bind.
"""

from __future__ import annotations

from enum import StrEnum
from functools import lru_cache

from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(StrEnum):
    """Deployment environment; drives error-envelope verbosity in `BE.errors.handlers`."""

    Dev = "dev"
    Staging = "staging"
    Prod = "prod"


class LogLevel(StrEnum):
    """Subset of stdlib logging levels exposed as config."""

    Debug = "DEBUG"
    Info = "INFO"
    Warning = "WARNING"
    Error = "ERROR"


class CameraProvider(StrEnum):
    InMemory = "InMemory"
    Daheng = "Daheng"
    Replay = "Replay"


class CameraDahengConfig(BaseModel):
    default_serial: str | None = None
    packet_size: int = 1500


class CameraConfig(BaseModel):
    provider: CameraProvider = CameraProvider.InMemory
    daheng: CameraDahengConfig = Field(default_factory=CameraDahengConfig)


class Settings(BaseSettings):
    """Immutable runtime settings; instantiate via `get_settings()`."""

    model_config = SettingsConfigDict(env_prefix="BE_", env_file=None, frozen=True)

    host: str = "127.0.0.1"
    port: int = 8787
    env: Environment = Environment.Dev
    log_level: LogLevel = LogLevel.Info
    cors_origins: tuple[str, ...] = (
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    )
    camera: CameraConfig = Field(default_factory=CameraConfig)

    @property
    def is_prod(self) -> bool:
        return self.env is Environment.Prod

    @property
    def is_dev(self) -> bool:
        return self.env is Environment.Dev


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the process-wide `Settings` singleton."""
    return Settings()
