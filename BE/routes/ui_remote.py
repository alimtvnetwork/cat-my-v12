"""CLI-to-UI remote-control routes (spec 54).

Transport for the AGM-style chain without a Tauri event bus: the CLI
posts action packets, the frontend hook polls `/pending`, performs the
real DOM action, and posts the result. Every packet is audited.

Envelope shape per `BE/envelope.py` (frozen): `Results` always an array.
Failures use registered `E_*` wire codes, never bare messages.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, failure, success
from BE.ui_remote import queue, registry

logger = logging.getLogger("BE.routes.ui_remote")

router = APIRouter(prefix="/ui-remote")

_VALID_ACTIONS = ("click", "scroll", "focus", "set", "navigate")


class PacketRequest(BaseModel):
    action: str
    elementId: str | None = None
    xpath: str | None = None
    route: str | None = None
    value: str | None = None
    actor: str = "cli"


class ResultRequest(BaseModel):
    packetId: str
    performed: bool
    resolvedVia: str | None = None
    error: str | None = None


def _wire(request: Request, envelope) -> JSONResponse:
    """Envelope response with the correlation header echoed."""

    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))

    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


def _fail(request: Request, code: str, message: str, status: int) -> JSONResponse:
    """Failure envelope; the caller still gets a parseable body."""

    envelope = failure(code=code, message=message, requested_at=str(request.url), http_status=status)

    return _wire(request, envelope)


def _validate_packet(body: PacketRequest) -> str | None:
    """Error message for an invalid packet, or None when valid."""

    if body.action not in _VALID_ACTIONS:
        return f"Unknown action: {body.action}"

    if body.action == "navigate" and not body.route:
        return "navigate requires route"

    if body.action == "set" and body.value is None:
        return "set requires value"

    if body.elementId is None and body.xpath is None and body.action != "navigate":
        return "elementId or xpath is required"

    if body.elementId is not None and registry.find_by_id(body.elementId) is None:
        return f"Unknown element id: {body.elementId}"

    return None


@router.get("/elements")
async def list_ui_elements(request: Request, route: str | None = None) -> JSONResponse:
    """Registry elements for a route; all entries when route is empty."""

    payload = registry.list_elements(route)
    envelope = success(payload, requested_at=str(request.url))

    return _wire(request, envelope)


@router.post("/packets")
async def post_packet(request: Request, body: PacketRequest) -> JSONResponse:
    """Validate and enqueue one CLI action packet."""

    problem = _validate_packet(body)

    if problem is not None:
        return _fail(request, "E_BE_BAD_REQUEST", problem, 400)

    packet = queue.enqueue(body.model_dump())
    logger.info("ui_remote_packet_queued", extra={"operation": "POST /ui-remote/packets"})
    envelope = success({"packetId": packet["packetId"], "status": "queued"}, requested_at=str(request.url))

    return _wire(request, envelope)


@router.get("/pending")
async def list_pending(request: Request) -> JSONResponse:
    """Queued packets for the frontend hook to perform."""

    envelope = success(queue.pending(), requested_at=str(request.url))

    return _wire(request, envelope)


@router.post("/results")
async def post_result(request: Request, body: ResultRequest) -> JSONResponse:
    """Record a hook execution result and audit the packet."""

    completed = queue.resolve(body.packetId, body.model_dump())

    if completed is None:
        return _fail(request, "E_BE_NOT_FOUND", f"Unknown packet id: {body.packetId}", 404)

    logger.info("ui_remote_result", extra={"operation": "POST /ui-remote/results"})
    envelope = success(completed, requested_at=str(request.url))

    return _wire(request, envelope)


@router.get("/results/{packet_id}")
async def get_result(request: Request, packet_id: str) -> JSONResponse:
    """Completed or queued state for one packet."""

    found = queue.lookup(packet_id)

    if found is None:
        return _fail(request, "E_BE_NOT_FOUND", f"Unknown packet id: {packet_id}", 404)

    envelope = success(found, requested_at=str(request.url))

    return _wire(request, envelope)


@router.get("/audit")
async def list_audit(request: Request, limit: int = 50) -> JSONResponse:
    """Recent audited CLI-driven actions, newest last."""

    capped = max(1, min(limit, 500))
    envelope = success(queue.audit(capped), requested_at=str(request.url))

    return _wire(request, envelope)


__all__ = ["router"]
