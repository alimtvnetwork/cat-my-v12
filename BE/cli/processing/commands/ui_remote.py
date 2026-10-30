"""`processing-cli ui` — drive the app UI from the CLI (spec 54).

Adapted from the Antigravity Manager `agm ui` chain: `ls` reads the
static element manifest, `click`/`scroll`/`navigate`/`set` post action
packets to the backend, and the frontend hook performs the real DOM
action. A click is never claimed performed before the hook reports it:
without `--wait` the result is honestly `queued`; with `--wait` the
command polls until performed, failed, or timed out — and exits
non-zero on failure (dispatcher maps AppError to a failure envelope).

Stdout contract (dispatcher): exactly one Universal Envelope JSON.
Handlers never print to stdout themselves.
"""

from __future__ import annotations

import argparse
import json
import os
import time
import urllib.error
import urllib.request
from typing import Any

from BE.cli.common.session import SessionCtx
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_DEFAULT_BACKEND = "http://127.0.0.1:8787"
_POLL_INTERVAL_S = 0.5


def configure(parser: argparse.ArgumentParser) -> None:
    """CLI flags for the `ui` subcommand."""

    parser.add_argument("action", choices=["ls", "click", "scroll", "navigate", "set", "audit", "result"])
    parser.add_argument("target", nargs="?", default=None, help="Element id, xpath, route, or packet id.")
    parser.add_argument("value", nargs="?", default=None, help="Value for `set` (and only for `set`).")
    parser.add_argument("--route", default=None, help="Screen route the element lives on.")
    parser.add_argument("--wait", action="store_true", help="Wait for the hook to perform or fail the action.")
    parser.add_argument("--timeout", type=float, default=15.0, help="Seconds to wait with --wait.")
    parser.add_argument("--backend", default=None, help="Backend base URL (env UI_REMOTE_BACKEND_URL).")
    parser.add_argument("--limit", type=int, default=50, help="Audit entries for `audit`.")


def _backend_url(ns: argparse.Namespace) -> str:
    """Backend base URL: flag, env, then the local default."""

    raw = ns.backend or os.environ.get("UI_REMOTE_BACKEND_URL") or _DEFAULT_BACKEND

    return raw.rstrip("/")


def _code_for_status(status: int) -> ErrorCode:
    """Wire error code for a backend HTTP status."""

    if status == 400:
        return ErrorCode.E_BE_BAD_REQUEST

    if status == 404:
        return ErrorCode.E_BE_NOT_FOUND

    return ErrorCode.E_BE_INTERNAL


def _call(method: str, url: str, payload: dict[str, Any] | None) -> dict[str, Any]:
    """One backend call; transport and envelope failures raise AppError."""

    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(url, data=body, method=method)
    request.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        envelope = _read_envelope(err)

        raise AppError(
            _code_for_status(err.code),
            envelope.get("message", f"Backend HTTP {err.code}"),
            details={"status": err.code},
        ) from err
    except (urllib.error.URLError, TimeoutError, OSError) as err:
        raise AppError(
            ErrorCode.E_BE_UNAVAILABLE,
            f"Backend unreachable at {url}: {err}",
        ) from err


def _read_envelope(err: urllib.error.HTTPError) -> dict[str, Any]:
    """Best-effort message extraction from a failure envelope body."""

    try:
        data = json.loads(err.read().decode("utf-8"))
        status = data.get("Status", {})
        return {"message": status.get("Message", f"Backend HTTP {err.code}")}
    except (json.JSONDecodeError, UnicodeDecodeError, ValueError):
        return {"message": f"Backend HTTP {err.code}"}


def _results(envelope: dict[str, Any]) -> list[Any]:
    """Envelope Results array; failure envelopes raise AppError."""

    status = envelope.get("Status", {})

    if not status.get("IsSuccess", False):
        errors = envelope.get("Errors", {}) or {}
        raise AppError(ErrorCode.E_BE_INTERNAL, errors.get("BackendMessage") or status.get("Message", "Backend failed"))

    return envelope.get("Results", [])


def _split_target(target: str) -> tuple[str, str]:
    """Xpath targets start with / or (; anything else is an element id."""

    if target.startswith("/") or target.startswith("("):
        return ("xpath", target)

    return ("elementId", target)


def _post_packet(backend: str, packet: dict[str, Any]) -> dict[str, Any]:
    """Enqueue one packet and return its packet id record."""

    envelope = _call("POST", f"{backend}/ui-remote/packets", packet)
    results = _results(envelope)

    if not results:
        raise AppError(ErrorCode.E_BE_INTERNAL, "Backend returned no packet id")

    return results[0]


def _wait_result(backend: str, packet_id: str, timeout: float) -> dict[str, Any]:
    """Poll until the hook reports, or raise on failure/timeout."""

    deadline = time.monotonic() + timeout

    while time.monotonic() < deadline:
        envelope = _call("GET", f"{backend}/ui-remote/results/{packet_id}", None)
        found = _results(envelope)[0]

        if found.get("status") == "done":
            result = found.get("result", {})

            if result.get("performed"):
                return found

            raise AppError(ErrorCode.E_BE_INTERNAL, result.get("error") or "UI action was not performed")

        time.sleep(_POLL_INTERVAL_S)

    raise AppError(ErrorCode.E_BE_INTERNAL, f"Timed out after {timeout}s waiting for the UI hook")


def _handle_ls(ns: argparse.Namespace) -> dict[str, Any]:
    """Local manifest read; needs no running backend."""

    from BE.ui_remote.registry import list_elements

    return {"Elements": list_elements(ns.route)}


def _handle_action(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    """Enqueue an action packet, optionally waiting for the hook."""

    backend = _backend_url(ns)
    packet: dict[str, Any] = {"action": ns.action, "actor": "cli"}

    if ns.action == "navigate":
        packet["route"] = ns.target
    else:
        key, val = _split_target(ns.target or "")
        packet[key] = val
        packet["route"] = ns.route

    if ns.action == "set":
        if ns.value is None:
            raise AppError(ErrorCode.E_BE_BAD_REQUEST, "set requires a value")

        packet["value"] = ns.value

    queued = _post_packet(backend, packet)
    context.logger.log("INFO", "ui.action_queued", f"ui {ns.action} queued", ctx=queued)

    if not ns.wait:
        return queued

    return _wait_result(backend, queued["packetId"], ns.timeout)


def handle(ns: argparse.Namespace, context: SessionCtx) -> dict[str, Any]:
    """Dispatch one `ui` action; the dispatcher wraps the envelope."""

    if ns.action == "ls":
        return _handle_ls(ns)

    if ns.action == "audit":
        envelope = _call("GET", f"{_backend_url(ns)}/ui-remote/audit?limit={ns.limit}", None)

        return {"Entries": _results(envelope)}

    if ns.action == "result":
        envelope = _call("GET", f"{_backend_url(ns)}/ui-remote/results/{ns.target}", None)

        return _results(envelope)[0]

    return _handle_action(ns, context)
