from __future__ import annotations

from BE.config import Settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


def install_cors(app: FastAPI, settings: Settings) -> None:
    """Attach CORS config to reject non-localhost origins by default."""
    origins = list(settings.cors_origins) if settings.cors_origins else []

    for origin in (
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ):
        if origin not in origins:
            origins.append(origin)
    if "chrome-extension://*" not in origins:
        origins.append("chrome-extension://*")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Correlation-Id", "X-Request-Id"],
    )
