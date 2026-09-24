from __future__ import annotations

from collections.abc import Iterable
from enum import Enum
from typing import Final

from BE.config import Settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


class DevHosts:
    """Standard loopback hostnames used in local development."""

    LOCALHOST: Final[str] = "localhost"
    IPV4_LOOPBACK: Final[str] = "127.0.0.1"

    ALL: Final[tuple[str, ...]] = (LOCALHOST, IPV4_LOOPBACK)


class DevPorts:
    """Configurable ports for local frontends (Vite, Next.js, Storybook, etc.)."""

    VITE_PRIMARY: Final[int] = 5173
    VITE_SECONDARY: Final[int] = 5174

    ACTIVE_PORTS: Final[tuple[int, ...]] = (
        VITE_PRIMARY,
        VITE_SECONDARY,
    )


class ExtensionOrigin:
    """Browser extension origins."""

    CHROME_WILDCARD: Final[str] = "chrome-extension://*"


def build_http_origins(
    ports: Iterable[int],
    hosts: Iterable[str] = DevHosts.ALL,
    scheme: str = "http",
) -> tuple[str, ...]:
    """Generates a normalized, unique tuple of HTTP origin URLs from hosts and ports."""
    return tuple(f"{scheme}://{host}:{port}" for port in ports for host in hosts)


COMPILED_DEV_ORIGIN_ITEMS: Final[tuple[str, ...]] = build_http_origins(DevPorts.ACTIVE_PORTS)

LocalhostOriginType = Enum(
    "LocalhostOriginType",
    {
        f"PORT_{origin.split(':')[-1]}_{'LOCALHOST' if 'localhost' in origin else 'LOOPBACK'}": origin
        for origin in COMPILED_DEV_ORIGIN_ITEMS
    },
    type=str,
)

# Compatibility alias
LocalhostOriginEnum = LocalhostOriginType


class CorsDefaults:
    """Centralized, immutable defaults ready for injection into middleware."""

    DEFAULT_DEV_ORIGINS: Final[tuple[str, ...]] = COMPILED_DEV_ORIGIN_ITEMS
    DEFAULT_EXTENSION_ORIGINS: Final[tuple[str, ...]] = (ExtensionOrigin.CHROME_WILDCARD,)

    ALL_DEFAULT_ORIGINS: Final[tuple[str, ...]] = (
        DEFAULT_DEV_ORIGINS + DEFAULT_EXTENSION_ORIGINS
    )


def configure_cors_origins(settings: Settings) -> list[str]:
    """Attach CORS config ensuring default localhost and extension origins are allowed."""
    origins: list[str] = list(settings.cors_origins) if settings.cors_origins else []

    for default_origin in CorsDefaults.ALL_DEFAULT_ORIGINS:
        if default_origin not in origins:
            origins.append(default_origin)

    return origins


def install_cors(app: FastAPI, settings: Settings) -> None:
    """Attach CORS config to reject non-localhost origins by default."""
    origins = configure_cors_origins(settings)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-Id", "X-Request-Id"],
    )

