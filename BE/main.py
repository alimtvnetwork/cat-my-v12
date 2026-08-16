"""FastAPI app factory and uvicorn dev entry.

Wires together Steps 9-14: config (`get_settings`), structured JSON logging
(`configure_logging`), and frozen-envelope exception handlers
(`register_exception_handlers`). Steps 16-19 mount routers here.

Spec: spec/21-app/backend-implementation-request-v1.md
Guideline: spec/coding-guidelines/python.md (functions ≤ 15 lines, typed at boundary).
"""

from __future__ import annotations

import logging
import signal
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from BE.src.api.router import api_router

from BE.config import Settings, get_settings
from BE.errors.handlers import register_exception_handlers
from BE.middleware.request_id import RequestIdMiddleware
from BE.middleware.rate_limit import RateLimitMiddleware
from BE.security.cors import install_cors
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


def _sigterm_handler(signum, frame):
    logger.info("sigterm_received", extra={"operation": "shutdown"})
    logging.shutdown()
    sys.exit(0)


def _setup_signals() -> None:
    try:
        signal.signal(signal.SIGTERM, _sigterm_handler)
    except Exception:
        pass


@asynccontextmanager
async def _app_lifespan(app: FastAPI):
    yield
    logger.info("lifespan_shutdown", extra={"operation": "shutdown"})
    logging.shutdown()


def _register_middlewares(app: FastAPI, cfg: Settings) -> None:
    install_cors(app, cfg)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestIdMiddleware)

    @app.middleware("http")
    async def echo_correlation_id(request: Request, call_next):
        correlation_id = request.headers.get("X-Correlation-Id")
        response = await call_next(request)
        if correlation_id:
            response.headers["X-Correlation-Id"] = correlation_id
        return response


def _register_routers(app: FastAPI) -> None:
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


def _log_startup(app: FastAPI, cfg: Settings) -> None:
    logger.info(
        "be_app_created",
        extra={
            "CorrelationId": None,
            "operation": "startup",
            "code": None,
            "subject_id": None,
            "env": cfg.env.value,
            "host": cfg.host,
            "port": cfg.port,
            "version": app.version,
        },
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the FastAPI app with logging, CORS, and envelope handlers wired."""
    cfg = settings or get_settings()
    configure_logging(cfg.log_level)
    _setup_signals()
    
    app = FastAPI(title="BE", version="1.0.0", lifespan=_app_lifespan)
    _register_middlewares(app, cfg)
    register_exception_handlers(app)
    _register_routers(app)
    _log_startup(app, cfg)
    
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


__all__ = ["create_app", "dev", "app"]

app = create_app()
