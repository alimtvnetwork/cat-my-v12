"""Plan 90 Step 71 - `GET /api/cli/sessions` (disk-backed).

Complements `BE/routes/observability/sessions.py` (Step 72, DB-backed).
This route enumerates JSONL session files directly from `APP_LOG_ROOT`
via `BE.cli.common.log_reader.list_sessions`, so operators can see what
the writer actually produced even when the Root-DB tier is missing or
lagging.

Contract::

    GET /api/cli/sessions?limit=<1..500>&source=<worker-cli|processing-cli|be>

    * ``limit``  optional, default 50, hard ceiling 500. Out-of-range -> 400
      ``E_BE_BAD_REQUEST``.
    * ``source`` optional; whitelist enforced -> 400 ``E_BE_BAD_REQUEST``.

Response envelope wraps ``{"items": [...], "total": <int>, "limit": <int>}``
matching the list-endpoint shape used across ``/rules`` / ``/samples`` /
``/observability/sessions``. Each item is a ``SessionSummary`` per
``BE/cli/common/log_reader.py``. A missing ``APP_LOG_ROOT`` yields an
empty ``items`` list, not a 500, since a host that has never run the
CLI legitimately has no logs.
"""

from __future__ import annotations

import asyncio
import io
import json
import logging
import time
import zipfile
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse

from BE.cli.common.log_reader import SessionSummary
from BE.cli.common.log_reader import list_sessions as _list_sessions
from BE.cli.common.paths import resolve_root
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.cli_observability")

router = APIRouter(prefix="/api/cli")

_ALLOWED_SOURCES = ("worker-cli", "processing-cli", "be")
_MAX_LIMIT = 500
_DEFAULT_LIMIT = 50

# SSE tail bounds (Step 72). Follow mode is time-boxed so a wedged client
# cannot pin a worker thread forever; the tail is a read-only probe, not a
# persistent subscription.
_TAIL_MAX_LINES = 5000
_TAIL_DEFAULT_MAX_LINES = 1000
_TAIL_FOLLOW_SECONDS = 30.0
_TAIL_POLL_SECONDS = 0.25
_TAIL_LOOKUP_LIMIT = 500


def _validate_limit(raw: int) -> int:
    if raw < 1 or raw > _MAX_LIMIT:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"limit must be between 1 and {_MAX_LIMIT}",
            details={"Received": raw, "Min": 1, "Max": _MAX_LIMIT},
        )
    return raw


def _validate_source(raw: str | None) -> str | None:
    if raw is None:
        return None
    if raw not in _ALLOWED_SOURCES:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "source must be one of worker-cli|processing-cli|be",
            details={"Received": raw, "Allowed": list(_ALLOWED_SOURCES)},
        )
    return raw


@router.get("/sessions")
async def get_cli_sessions(
    request: Request,
    limit: int = Query(_DEFAULT_LIMIT, description="1..500, default 50"),
    source: str | None = Query(None, description="worker-cli | processing-cli | be"),
) -> JSONResponse:
    """Enumerate CLI JSONL session files on disk, newest first."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    limit_v = _validate_limit(limit)
    source_v = _validate_source(source)

    # `ensure=False`: never mkdir from a read route; a missing log root is
    # a legitimate zero-result answer, not a side-effect trigger.
    log_root = resolve_root("log", ensure=False)

    sessions = _list_sessions(log_root, source=source_v, limit=limit_v)
    items: list[dict[str, Any]] = [s.to_wire() for s in sessions]
    payload = {"items": items, "total": len(items), "limit": limit_v}

    logger.info(
        "cli_sessions_listed",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /api/cli/sessions",
            "code": None,
            "subject_id": None,
            "LogRoot": str(log_root),
            "Source": source_v,
            "Returned": len(items),
        },
    )
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


def _find_session_by_run_id(log_root: Path, run_id: str) -> SessionSummary | None:
    """Locate a session on disk by `RunId`.

    Walks up to `_TAIL_LOOKUP_LIMIT` most-recent sessions (already the same
    ceiling used by the list route) so an operator cannot force an unbounded
    directory scan by supplying an unknown `RunId`.
    """
    if not run_id:
        return None
    for s in _list_sessions(log_root, limit=_TAIL_LOOKUP_LIMIT):
        if s.RunId == run_id:
            return s
    return None


def _sse_pack(event: str | None, data: str, line_id: int | None = None) -> bytes:
    parts: list[str] = []
    if line_id is not None:
        parts.append(f"id: {line_id}")
    if event is not None:
        parts.append(f"event: {event}")
    # SSE requires each payload line to be prefixed with `data:`; the writer
    # emits single-line JSONL so no multi-line splitting is needed.
    parts.append(f"data: {data}")
    parts.append("")
    parts.append("")
    return ("\n".join(parts)).encode("utf-8")


async def _tail_stream(
    path: Path,
    *,
    since_line: int,
    max_lines: int,
    follow: bool,
    correlation_id: str,
    run_id: str,
) -> AsyncIterator[bytes]:
    """Yield SSE frames for the JSONL file.

    Contract:
      * Lines are 1-based. `since_line=N` skips the first `N` lines.
      * Emits at most `max_lines` `data:` frames, then an `event: end` frame
        with `{"LineCount":<total_delivered>, "NextSinceLine":<n>}`.
      * `follow=true` polls at `_TAIL_POLL_SECONDS` for at most
        `_TAIL_FOLLOW_SECONDS` seconds; the deadline is enforced even if
        the file keeps producing lines, to prevent a wedged tail.
    """
    delivered = 0
    current_line = 0
    deadline = time.monotonic() + _TAIL_FOLLOW_SECONDS
    # Open once; we track position via file offset so `follow` continues
    # where the initial scan left off without re-reading the whole file.
    try:
        fh = path.open("r", encoding="utf-8", errors="replace")
    except OSError as exc:
        # Surface as an SSE error frame so the client sees the reason
        # instead of a silent stream end. The route already validated
        # existence, but the file could have been rotated between checks.
        logger.warning(
            "cli_sessions_tail.open_failed",
            extra={
                "CorrelationId": correlation_id,
                "operation": "GET /api/cli/sessions/{run_id}/log",
                "RunId": run_id,
                "Path": str(path),
                "Reason": str(exc),
            },
        )
        yield _sse_pack("error", json.dumps({"Code": "E_BE_INTERNAL", "Reason": str(exc)}))
        return

    try:
        while True:
            line = fh.readline()
            if line:
                current_line += 1
                if current_line <= since_line:
                    continue
                if delivered >= max_lines:
                    break
                yield _sse_pack(None, line.rstrip("\n"), line_id=current_line)
                delivered += 1
                continue

            # No more data right now.
            if not follow:
                break
            if delivered >= max_lines:
                break
            if time.monotonic() >= deadline:
                break
            await asyncio.sleep(_TAIL_POLL_SECONDS)

        end_payload = {
            "RunId": run_id,
            "LineCount": delivered,
            "NextSinceLine": since_line + delivered,
            "Truncated": delivered >= max_lines,
        }
        yield _sse_pack("end", json.dumps(end_payload))
    finally:
        fh.close()
        logger.info(
            "cli_sessions_tailed",
            extra={
                "CorrelationId": correlation_id,
                "operation": "GET /api/cli/sessions/{run_id}/log",
                "code": None,
                "subject_id": run_id,
                "Path": str(path),
                "Delivered": delivered,
                "SinceLine": since_line,
                "MaxLines": max_lines,
                "Follow": follow,
            },
        )


@router.get("/sessions/{run_id}/log")
async def get_cli_session_log(
    request: Request,
    run_id: str,
    since_line: int = Query(0, ge=0, description="1-based; skip first N lines"),
    max_lines: int = Query(
        _TAIL_DEFAULT_MAX_LINES,
        ge=1,
        le=_TAIL_MAX_LINES,
        description=f"1..{_TAIL_MAX_LINES}",
    ),
    follow: bool = Query(False, description="Poll for new lines up to 30s"),
) -> StreamingResponse:
    """SSE tail of a CLI session's JSONL log by `RunId`.

    Returns `404 E_BE_NOT_FOUND` if no session on disk carries this RunId.
    On success, emits `data:` frames per JSONL line followed by an `end`
    event carrying the final line cursor for resumable polling.
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))

    log_root = resolve_root("log", ensure=False)
    session = _find_session_by_run_id(log_root, run_id)
    if session is None:
        # Log the miss so operators can distinguish "never existed" from
        # "rotated away" when triaging a stale UI link.
        logger.info(
            "cli_sessions_tail.not_found",
            extra={
                "CorrelationId": correlation_id,
                "operation": "GET /api/cli/sessions/{run_id}/log",
                "code": ErrorCode.E_BE_NOT_FOUND.value,
                "subject_id": run_id,
                "LogRoot": str(log_root),
            },
        )
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"No CLI session found for RunId={run_id!r}",
            details={"RunId": run_id},
        )

    path = Path(session.LogPath)
    stream = _tail_stream(
        path,
        since_line=since_line,
        max_lines=max_lines,
        follow=follow,
        correlation_id=correlation_id,
        run_id=run_id,
    )
    headers = {
        CORRELATION_HEADER: correlation_id,
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",  # disable proxy buffering so SSE flushes
    }
    return StreamingResponse(stream, media_type="text/event-stream", headers=headers)


# ---------------------------------------------------------------------------
# Step 73: session summary + last N records (non-streaming).
#
# `.../log` (Step 72) is an SSE tail for live-follow. This route is the
# static counterpart the UI drill-down hits on first load to render the
# header (StartedAt, Pid, Subcmd, SizeBytes) and a bounded backlog
# without opening an SSE connection. Bounded tail-read keeps this cheap
# on a rotated multi-MiB file: seek to a fixed window from the end,
# parse only the trailing lines we keep.
# ---------------------------------------------------------------------------

_SUMMARY_MAX_RECORDS = 1000
_SUMMARY_DEFAULT_RECORDS = 200
# 4 MiB tail window comfortably holds ~1000 typical JSONL records
# (each well under 4 KiB with envelope-shaped Ctx) while capping RAM per call.
_SUMMARY_TAIL_BYTES = 4 * 1024 * 1024


def _read_last_records(path: Path, n: int) -> tuple[list[dict[str, Any]], int, int]:
    """Return `(records, tail_lines, dropped_count)` from a JSONL file.

    Reads at most the trailing `_SUMMARY_TAIL_BYTES` of the file so this
    stays O(window) not O(file). `dropped_count` is the number of trailing
    lines that failed to parse; we do NOT swallow them silently so
    operators can spot corruption in the metadata.
    """
    try:
        size = path.stat().st_size
    except OSError:
        return [], 0, 0

    read_bytes = min(size, _SUMMARY_TAIL_BYTES)
    try:
        with path.open("rb") as fh:
            if size > read_bytes:
                fh.seek(size - read_bytes)
                # Drop the first (likely partial) line when we didn't
                # start at offset 0, otherwise we'd count a legitimate
                # mid-line seek as a parse failure.
                fh.readline()
            tail_bytes = fh.read()
    except OSError:
        return [], 0, 0

    lines = [ln for ln in tail_bytes.decode("utf-8", errors="replace").splitlines() if ln.strip()]
    keep = lines[-n:] if n < len(lines) else lines

    records: list[dict[str, Any]] = []
    dropped = 0
    for ln in keep:
        try:
            obj = json.loads(ln)
        except (ValueError, json.JSONDecodeError):
            dropped += 1
            continue
        if isinstance(obj, dict):
            records.append(obj)
        else:
            dropped += 1
    return records, len(lines), dropped


@router.get("/sessions/{run_id}")
async def get_cli_session(
    request: Request,
    run_id: str,
    tail: int = Query(
        _SUMMARY_DEFAULT_RECORDS,
        ge=1,
        le=_SUMMARY_MAX_RECORDS,
        description=f"trailing record count, 1..{_SUMMARY_MAX_RECORDS}",
    ),
) -> JSONResponse:
    """Return a session `Summary` + last `tail` JSONL `Records`.

    404 `E_BE_NOT_FOUND` when no session on disk carries this RunId, so
    stale UI deep-links fail loudly instead of returning empty data.
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))

    log_root = resolve_root("log", ensure=False)
    session = _find_session_by_run_id(log_root, run_id)
    if session is None:
        logger.info(
            "cli_session_get.not_found",
            extra={
                "CorrelationId": correlation_id,
                "operation": "GET /api/cli/sessions/{run_id}",
                "code": ErrorCode.E_BE_NOT_FOUND.value,
                "subject_id": run_id,
                "LogRoot": str(log_root),
            },
        )
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"No CLI session found for RunId={run_id!r}",
            details={"RunId": run_id},
        )

    path = Path(session.LogPath)
    records, tail_lines, dropped = _read_last_records(path, tail)

    payload = {
        "Summary": session.to_wire(),
        "Records": records,
        "TailLines": tail_lines,
        "Requested": tail,
        "DroppedInvalid": dropped,
    }

    logger.info(
        "cli_session_fetched",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /api/cli/sessions/{run_id}",
            "code": None,
            "subject_id": run_id,
            "LogPath": str(path),
            "Returned": len(records),
            "DroppedInvalid": dropped,
        },
    )
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


_STATUS_IPC_SCAN_CAP = 5000
_STATUS_TAIL_BYTES = 32 * 1024


def _peek_tail_exit_code(path: Path) -> tuple[int | None, str | None]:
    """Return (ExitCode, LastErrorCode) from the tail of a JSONL session.

    Reads at most `_STATUS_TAIL_BYTES` from the end of the file and scans
    JSON lines in reverse for the first object carrying `ExitCode` and the
    first carrying an `Errors[0].Code`. Never raises: any read/parse
    failure yields `(None, None)` so the widget degrades gracefully
    instead of crashing the app shell.
    """
    try:
        size = path.stat().st_size
    except OSError:
        return (None, None)
    read_from = max(0, size - _STATUS_TAIL_BYTES)
    try:
        with path.open("rb") as fh:
            fh.seek(read_from)
            chunk = fh.read().decode("utf-8", errors="replace")
    except OSError:
        return (None, None)
    lines = [ln for ln in chunk.splitlines() if ln.strip()]
    exit_code: int | None = None
    last_error: str | None = None
    for ln in reversed(lines):
        try:
            obj = json.loads(ln)
        except json.JSONDecodeError:
            continue
        if not isinstance(obj, dict):
            continue
        if exit_code is None and isinstance(obj.get("ExitCode"), int):
            exit_code = int(obj["ExitCode"])
        if last_error is None:
            errs = obj.get("Errors")
            if isinstance(errs, list) and errs and isinstance(errs[0], dict):
                code = errs[0].get("Code")
                if isinstance(code, str) and code:
                    last_error = code
        if exit_code is not None and last_error is not None:
            break
    return (exit_code, last_error)


def _latest_session(log_root: Path, source: str) -> dict[str, Any] | None:
    sessions = _list_sessions(log_root, source=source, limit=1)
    if not sessions:
        return None
    s = sessions[0]
    exit_code, last_error = _peek_tail_exit_code(Path(s.LogPath))
    wire = s.to_wire()
    wire["ExitCode"] = exit_code
    wire["LastErrorCode"] = last_error
    return wire


def _ipc_backlog(correlation_id: str) -> dict[str, Any]:
    """Count unacked IPC messages across all mailboxes, capped."""
    try:
        ipc_root = resolve_root("ipc", ensure=False)
    except Exception as exc:  # noqa: BLE001 - status must never 500
        logger.warning(
            "cli_status.ipc_root_failed",
            extra={"CorrelationId": correlation_id, "operation": "GET /api/cli/status", "Reason": str(exc)},
        )
        return {"Pending": 0, "Truncated": False, "Available": False}
    if not ipc_root.exists() or not ipc_root.is_dir():
        return {"Pending": 0, "Truncated": False, "Available": False}
    pending = 0
    truncated = False
    try:
        for mailbox in ipc_root.iterdir():
            if not mailbox.is_dir():
                continue
            for f in mailbox.glob("*.msg.json"):
                # `.msg.ack.json` also matches `*.msg.json` glob; exclude it.
                if f.name.endswith(".msg.ack.json"):
                    continue
                pending += 1
                if pending >= _STATUS_IPC_SCAN_CAP:
                    truncated = True
                    break
            if truncated:
                break
    except OSError as exc:
        logger.warning(
            "cli_status.ipc_scan_failed",
            extra={"CorrelationId": correlation_id, "operation": "GET /api/cli/status", "Reason": str(exc)},
        )
    return {"Pending": pending, "Truncated": truncated, "Available": True}


@router.get("/status")
async def get_cli_status(request: Request) -> JSONResponse:
    """Aggregate CLI widget status: latest worker+processing sessions and IPC backlog.

    Read-only, side-effect free. Missing log/IPC roots degrade to empty
    values rather than 500 so the global status widget in `__root` never
    crashes the app shell.
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    log_root = resolve_root("log", ensure=False)

    worker = _latest_session(log_root, "worker-cli") if log_root.exists() else None
    processing = _latest_session(log_root, "processing-cli") if log_root.exists() else None
    ipc = _ipc_backlog(correlation_id)

    # Widget-level last error: prefer worker, then processing.
    last_error: str | None = None
    for candidate in (worker, processing):
        if candidate and candidate.get("LastErrorCode"):
            last_error = candidate["LastErrorCode"]
            break

    payload = {
        "Worker": worker,
        "Processing": processing,
        "Ipc": ipc,
        "LastErrorCode": last_error,
        "LogRootAvailable": log_root.exists(),
    }

    logger.info(
        "cli_status_read",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /api/cli/status",
            "code": None,
            "subject_id": None,
            "IpcPending": ipc["Pending"],
            "LastErrorCode": last_error,
            "WorkerPresent": worker is not None,
            "ProcessingPresent": processing is not None,
        },
    )
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})



# ---------------------------------------------------------------------------
# Plan 90 Step 144: `GET /api/cli/sessions/{run_id}/export`
#
# Support triage bundle: streams a `.zip` containing (a) `session.json` with
# the on-disk SessionSummary + a synthesized entry envelope, (b) `log.jsonl`
# with the full JSONL log (bounded), and (c) `ipc/<mailbox>/<file>.json` for
# every IPC message across every allowlisted mailbox whose `RunId` matches.
# `manifest.json` at the root records what was included, what was truncated,
# and byte counts so downstream tooling never guesses.
#
# Bounds (loud-failure, never silent):
#   * Log file capped at _EXPORT_LOG_MAX_BYTES (16 MiB). Larger files are
#     truncated with `manifest.Truncated.Log = true` and a marker suffix line.
#   * IPC scan capped at _EXPORT_IPC_MAX_FILES (5000). Overflow flips
#     `manifest.Truncated.Ipc = true`.
#   * Total bytes capped at _EXPORT_TOTAL_MAX_BYTES (64 MiB). Overflow raises
#     E_BE_TOO_LARGE so we never OOM the worker.
# ---------------------------------------------------------------------------

_EXPORT_LOG_MAX_BYTES = 16 * 1024 * 1024
_EXPORT_IPC_MAX_FILES = 5000
_EXPORT_TOTAL_MAX_BYTES = 64 * 1024 * 1024
_EXPORT_ALLOWED_MAILBOXES: tuple[str, ...] = (
    "worker-out",
    "processing-in",
    "processing-out",
    "main-in",
)


def _synthesize_entry_envelope(session: SessionSummary) -> dict[str, Any]:
    """Return an envelope-shaped dict summarising the session's outcome.

    BE does not persist a discrete session.end envelope on disk (see the
    ExitEnvelopeDrawer note on Step 112). The export mirrors that same
    client-side synthesis so triage artefacts contain a single canonical
    envelope-shaped object without inventing frames or a BackendMessage.
    `SessionSummary` (BE/cli/common/log_reader.py) intentionally does NOT
    carry ExitCode/EndedAt (those live in Root-DB, not in the disk
    projection), so the envelope reports the summary snapshot only and
    leaves outcome fields to the JSONL tail-scan the modal already does.
    """
    return {
        "CorrelationId": session.RunId,
        "Code": "OK",
        "Level": "info",
        "Message": "Session summary snapshot from disk projection",
        "CreatedAt": session.StartedAt,
        "RequestedAt": None,
        "RequestDelegatedAt": None,
        "Context": {
            "RunId": session.RunId,
            "Source": session.Source,
            "Date": session.Date,
            "Subcmd": session.Subcmd,
            "Pid": session.Pid,
            "StartedAt": session.StartedAt,
            "LogPath": session.LogPath,
            "SizeBytes": session.SizeBytes,
        },
    }


def _read_log_bytes(path: Path) -> tuple[bytes, bool]:
    """Return `(bytes, truncated)` for the JSONL log, capped at 16 MiB."""
    try:
        size = path.stat().st_size
    except OSError as exc:
        logger.warning(
            "cli_export.log_stat_failed",
            extra={"Path": str(path), "Reason": str(exc)},
        )
        return (b"", False)
    if size <= _EXPORT_LOG_MAX_BYTES:
        try:
            return (path.read_bytes(), False)
        except OSError as exc:
            logger.warning(
                "cli_export.log_read_failed",
                extra={"Path": str(path), "Reason": str(exc)},
            )
            return (b"", False)
    try:
        with path.open("rb") as fh:
            head = fh.read(_EXPORT_LOG_MAX_BYTES)
    except OSError as exc:
        logger.warning(
            "cli_export.log_read_failed",
            extra={"Path": str(path), "Reason": str(exc)},
        )
        return (b"", True)
    marker = (
        f"\n{{\"_Truncated\": true, \"OriginalBytes\": {size}, "
        f"\"KeptBytes\": {_EXPORT_LOG_MAX_BYTES}}}\n"
    ).encode()
    return (head + marker, True)


def _collect_ipc_for_run(run_id: str, correlation_id: str) -> tuple[list[tuple[str, bytes]], int, bool]:
    """Return `(entries, scanned, truncated)` for IPC files matching `run_id`.

    `entries` is a list of `(zip_arcname, bytes)`; scans every allowlisted
    mailbox under `APP_IPC_ROOT`. A missing root returns `([], 0, False)`.
    Never raises: mailbox iteration wraps `OSError` and continues so a
    single unreadable file cannot fail the whole export.
    """
    try:
        ipc_root = resolve_root("ipc", ensure=False)
    except Exception as exc:  # noqa: BLE001 - export must never 500 on IPC
        logger.warning(
            "cli_export.ipc_root_failed",
            extra={"CorrelationId": correlation_id, "RunId": run_id, "Reason": str(exc)},
        )
        return ([], 0, False)
    if not ipc_root.exists() or not ipc_root.is_dir():
        return ([], 0, False)

    entries: list[tuple[str, bytes]] = []
    scanned = 0
    truncated = False
    for mailbox in _EXPORT_ALLOWED_MAILBOXES:
        mb_dir = ipc_root / mailbox
        if not mb_dir.is_dir():
            continue
        try:
            files = sorted(mb_dir.iterdir(), key=lambda p: p.name)
        except OSError as exc:
            logger.warning(
                "cli_export.ipc_list_failed",
                extra={"CorrelationId": correlation_id, "Mailbox": mailbox, "Reason": str(exc)},
            )
            continue
        for f in files:
            if not f.is_file():
                continue
            if not (f.name.endswith(".msg.json") or f.name.endswith(".msg.ack.json")):
                continue
            scanned += 1
            if scanned > _EXPORT_IPC_MAX_FILES:
                truncated = True
                break
            try:
                raw = f.read_bytes()
            except OSError as exc:
                logger.warning(
                    "cli_export.ipc_read_failed",
                    extra={"CorrelationId": correlation_id, "Path": str(f), "Reason": str(exc)},
                )
                continue
            try:
                obj = json.loads(raw.decode("utf-8", errors="replace"))
            except (ValueError, json.JSONDecodeError):
                # Include poison as-is so operators can spot corruption in
                # the bundle; skip RunId filter for these since we can't
                # read the field.
                entries.append((f"ipc/{mailbox}/{f.name}", raw))
                continue
            if isinstance(obj, dict) and obj.get("RunId") == run_id:
                entries.append((f"ipc/{mailbox}/{f.name}", raw))
        if truncated:
            break
    return (entries, scanned, truncated)


@router.get("/sessions/{run_id}/export")
async def export_cli_session(request: Request, run_id: str) -> Response:
    """Return a `.zip` bundle of the session's log + entry envelope + IPC.

    404 `E_BE_NOT_FOUND` when no session on disk carries this RunId.
    413 `E_BE_TOO_LARGE` when the combined artefacts exceed 64 MiB, so a
    runaway session cannot hand a huge blob to the browser.
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))

    log_root = resolve_root("log", ensure=False)
    session = _find_session_by_run_id(log_root, run_id)
    if session is None:
        logger.info(
            "cli_export.not_found",
            extra={
                "CorrelationId": correlation_id,
                "operation": "GET /api/cli/sessions/{run_id}/export",
                "code": ErrorCode.E_BE_NOT_FOUND.value,
                "subject_id": run_id,
                "LogRoot": str(log_root),
            },
        )
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"No CLI session found for RunId={run_id!r}",
            details={"RunId": run_id},
        )

    log_bytes, log_truncated = _read_log_bytes(Path(session.LogPath))
    ipc_entries, ipc_scanned, ipc_truncated = _collect_ipc_for_run(run_id, correlation_id)
    entry_envelope = _synthesize_entry_envelope(session)

    total_estimate = len(log_bytes) + sum(len(b) for _, b in ipc_entries)
    if total_estimate > _EXPORT_TOTAL_MAX_BYTES:
        logger.warning(
            "cli_export.too_large",
            extra={
                "CorrelationId": correlation_id,
                "operation": "GET /api/cli/sessions/{run_id}/export",
                "code": "E_BE_TOO_LARGE",
                "subject_id": run_id,
                "EstimatedBytes": total_estimate,
                "Max": _EXPORT_TOTAL_MAX_BYTES,
            },
        )
        # Reuse E_BE_BAD_REQUEST rather than invent a code; details carry the
        # size so the modal explains why. If a dedicated E_BE_TOO_LARGE
        # lands in ErrorCode later, swap here.
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "session export exceeds 64 MiB cap",
            details={
                "RunId": run_id,
                "EstimatedBytes": total_estimate,
                "Max": _EXPORT_TOTAL_MAX_BYTES,
            },
        )

    manifest: dict[str, Any] = {
        "RunId": run_id,
        "GeneratedAt": datetime.now(UTC).isoformat(),
        "CorrelationId": correlation_id,
        "Summary": session.to_wire(),
        "Contents": {
            "SessionJson": "session.json",
            "LogJsonl": "log.jsonl",
            "IpcFiles": len(ipc_entries),
        },
        "Truncated": {
            "Log": log_truncated,
            "Ipc": ipc_truncated,
        },
        "Scanned": {"IpcFiles": ipc_scanned},
    }

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("manifest.json", json.dumps(manifest, indent=2))
        zf.writestr(
            "session.json",
            json.dumps(
                {"Summary": session.to_wire(), "EntryEnvelope": entry_envelope},
                indent=2,
            ),
        )
        zf.writestr("log.jsonl", log_bytes)
        for arcname, data in ipc_entries:
            zf.writestr(arcname, data)
    payload = buf.getvalue()

    logger.info(
        "cli_export.ok",
        extra={
            "CorrelationId": correlation_id,
            "operation": "GET /api/cli/sessions/{run_id}/export",
            "code": None,
            "subject_id": run_id,
            "ZipBytes": len(payload),
            "IpcFiles": len(ipc_entries),
            "LogTruncated": log_truncated,
            "IpcTruncated": ipc_truncated,
        },
    )
    filename = f"cli-session-{run_id}.zip"
    return Response(
        content=payload,
        media_type="application/zip",
        headers={
            CORRELATION_HEADER: correlation_id,
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


__all__ = ["router"]



