from __future__ import annotations

from BE.config import get_settings
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Stub rate limit: allow all in dev. Hook point for later expansion.
        settings = get_settings()
        if settings.is_dev:
            pass
        return await call_next(request)
