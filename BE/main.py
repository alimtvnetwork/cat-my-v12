"""FastAPI app factory and uvicorn dev entry.

Wires together Steps 9-14: config (`get_settings`), structured JSON logging
(`configure_logging`), and frozen-envelope exception handlers
(`register_exception_handlers`). Steps 16-19 mount routers here.

Spec: spec/21-app/backend-implementation-request-v1.md
Guideline: spec/coding-guidelines/python.md (functions ≤ 15 lines, typed at boundary).
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from BE.src.api.router import api_router

from BE.config import Settings, get_settings
from BE.errors.handlers import register_exception_handlers
from BE.logging_config import configure_logging
from BE.routes import health as health_route
from BE.routes import meta as meta_route
from BE.routes import rules as rules_route
from BE.routes import samples as samples_route
from BE.routes.observability import ipc as observability_ipc_route
from BE.routes.observability import logs as observability_logs_route
from BE.routes.observability import retention as observability_retention_route
from BE.routes.observability import runs as observability_runs_route
from BE.routes.observability import sessions as observability_sessions_route
from BE.routes import cli_observability as cli_observability_route
from BE.routes import cli_config as cli_config_route
from BE.routes import cli_doctor as cli_doctor_route

logger = logging.getLogger("BE.main")


def _install_cors(app: FastAPI, settings: Settings) -> None:
    """Attach CORS from settings; dev-only origins by default."""
    origins = list(settings.cors_origins)
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
        expose_headers=["X-Correlation-Id"],
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the FastAPI app with logging, CORS, and envelope handlers wired."""
    cfg = settings or get_settings()
    configure_logging(cfg.log_level)
    app = FastAPI(title="BE", version="1.0.0")
    _install_cors(app, cfg)
    register_exception_handlers(app)

    @app.middleware("http")
    async def echo_correlation_id(request: Request, call_next):
        correlation_id = request.headers.get("X-Correlation-Id")
        response = await call_next(request)
        if correlation_id:
            response.headers["X-Correlation-Id"] = correlation_id
        return response

    app.include_router(api_router)
    app.include_router(health_route.router)
    app.include_router(meta_route.router)
    app.include_router(rules_route.router)
    app.include_router(samples_route.router)
    app.include_router(observability_sessions_route.router)
    app.include_router(cli_observability_route.router)
    app.include_router(observability_logs_route.router)
    app.include_router(observability_ipc_route.router)
    app.include_router(observability_runs_route.router)
    app.include_router(observability_retention_route.router)
    app.include_router(cli_config_route.router)
    app.include_router(cli_doctor_route.router)
    logger.info(
        "be_app_created",
        extra={
            "CorrelationId": None,
            "operation": "startup",
            "code": None,
            "subject_id": None,
            "env": cfg.env.value,
            "port": cfg.port,
        },
    )
    return app


def dev() -> None:
    """`be-dev` script entry: run uvicorn against `create_app()`."""
    import uvicorn

    cfg = get_settings()
    uvicorn.run(
        "BE.main:create_app",
        factory=True,
        host=cfg.host,
        port=cfg.port,
        log_level=cfg.log_level.value.lower(),
        reload=cfg.is_dev,
    )


__all__ = ["create_app", "dev"]
