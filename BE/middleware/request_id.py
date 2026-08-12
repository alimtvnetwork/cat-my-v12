from __future__ import annotations

import logging
import time
import uuid
from contextvars import ContextVar

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("BE.middleware.request_id")

request_id_ctx: ContextVar[str | None] = ContextVar("request_id_ctx", default=None)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        request_id_ctx.set(req_id)
        
        start_time = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        logger.info(
            "request_completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status": response.status_code,
                "durMs": round(duration_ms, 2),
                "requestId": req_id,
            }
        )
        
        response.headers["X-Request-Id"] = req_id
        return response
