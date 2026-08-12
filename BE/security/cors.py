from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from BE.config import Settings


def install_cors(app: FastAPI, settings: Settings) -> None:
    """Attach CORS config to reject non-localhost origins by default."""
    origins = list(settings.cors_origins) if settings.cors_origins else []
    
    if "http://localhost:5173" not in origins:
        origins.append("http://localhost:5173")
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
