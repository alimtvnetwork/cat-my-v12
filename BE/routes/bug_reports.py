"""Bug-report routes (spec 54): email + Supabase delivery.

Endpoints (all loopback-only, like /shutdown — sending email and
reading/writing a Supabase key must never be remotely callable):

* ``POST /bug-reports``
    Compose a report from a Task-DB Error (by ``correlation_id``) or
    from freeform fields, then deliver via ``channels`` (``email``,
    ``supabase``, or both). Attachment bytes are NOT accepted here:
    the HTTP body carries attachment metadata as references only;
    local file bytes travel via the CLI ``--attach`` path.
* ``GET /bug-reports/pending?limit=``
    Pending reports from Supabase (developer download queue).
* ``GET /bug-reports/config``
    Sanitized settings: Supabase URL/enabled/key-presence + whether an
    email sender and notifier resolve. Never returns the API key.
* ``POST /bug-reports/config``
    Save Supabase settings (URL + key + role + enabled) to the
    app-data settings file (0600). Key never echoed back.
* ``POST /bug-reports/test``
    Endpoint reachability + table verification (schema.sql applied?).

Failures use registered codes only (see BE/errors/codes.py):
validation -> ``E_BE_BAD_REQUEST``, unconfigured downstream ->
``E_BE_UNAVAILABLE``, email failure -> ``E_BUG_EMAIL_FAILED``,
Supabase failure -> ``E_BUG_SUPABASE_FAILED``.
"""

from __future__ import annotations

import base64
import json
import logging
from pathlib import Path
import tempfile
from typing import Any
import uuid

from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

from BE.app.db.writers import error as error_writer
from BE.bug_reports import config as bug_config
from BE.bug_reports import reports as bug_reports
from BE.bug_reports.email_sender import EmailSendError
from BE.bug_reports.supabase_client import SupabaseError, client_from_config
from BE.db.connections import get_task_conn
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.routes.bug_reports")

router = APIRouter(prefix="/bug-reports")

_LOOPBACK_HOSTS = ("127.0.0.1", "::1", "localhost", "testclient")
_DEFAULT_LIMIT = 50
_MAX_LIMIT = 200


def _is_loopback_client(request: Request) -> bool:
    """True when the caller connects from this machine only."""
    client = request.client

    return client is not None and client.host in _LOOPBACK_HOSTS


def _reject_non_loopback(request: Request) -> JSONResponse | None:
    """403 response for non-loopback callers, else None to proceed."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))

    if _is_loopback_client(request):
        return None

    logger.warning("bug_reports_rejected_non_loopback", extra={"operation": "bug-reports"})

    return JSONResponse(
        status_code=403,
        content={"detail": "bug reporting is only available from this machine"},
        headers={CORRELATION_HEADER: correlation_id},
    )


def _compose_report(payload: dict[str, Any]) -> dict[str, Any]:
    """Report from a Task-DB Error row, or from freeform fields."""
    correlation_id = payload.get("correlation_id")

    if correlation_id:
        conn = get_task_conn()
        try:
            row = error_writer.get_error_by_correlation(conn, correlation_id)
        finally:
            conn.close()

        if row is None:
            raise AppError(
                ErrorCode.E_BE_NOT_FOUND,
                f"Error {correlation_id} not found",
                {"CorrelationId": correlation_id},
            )

        report = bug_reports.compose_from_error_row(row, payload.get("reporter_context"))

        if payload.get("title"):
            report["title"] = payload["title"]

        markdown_prompt = (
            payload.get("markdown_prompt")
            or payload.get("prompt")
            or payload.get("ide_prompt")
            or payload.get("body_text")
            or payload.get("markdown")
        )

        if markdown_prompt:
            report["markdown_prompt"] = markdown_prompt

        if payload.get("attachments"):
            report["attachments"] = payload["attachments"]

        return report

    title = payload.get("title")
    message = payload.get("message") or payload.get("description")
    markdown_prompt = (
        payload.get("markdown_prompt")
        or payload.get("prompt")
        or payload.get("ide_prompt")
        or payload.get("body_text")
        or payload.get("markdown")
    )
    session_id = payload.get("session_id") or payload.get("sessionId")

    if not markdown_prompt and session_id:
        local_prompt_file = Path(".logs/recorded-bugs") / str(session_id) / "prompt.md"

        if local_prompt_file.exists():
            try:
                markdown_prompt = local_prompt_file.read_text(encoding="utf-8")
            except Exception:
                pass

    if not title and not message and not markdown_prompt:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "Provide correlation_id, markdown_prompt, or title/message for a freeform report",
            {"Field": "correlation_id|title|markdown_prompt"},
        )

    if not title and markdown_prompt:
        first_line = markdown_prompt.strip().splitlines()[0].lstrip("# ").strip()
        title = first_line[:80] or "Bug Report"

    return {
        "correlation_id": None,
        "title": title or (message[:80] if message else "Bug Report"),
        "code": payload.get("code"),
        "message": message or (title if not markdown_prompt else ""),
        "stack_trace": payload.get("stack_trace"),
        "endpoint": payload.get("endpoint"),
        "trigger_component": payload.get("trigger_component"),
        "session_id": payload.get("session_id") or payload.get("sessionId"),
        "created_at": None,
        "reporter_context": payload.get("reporter_context") or {},
        "details": payload.get("details") or {},
        "attachments": payload.get("attachments") or [],
        "markdown_prompt": markdown_prompt,
    }


def _resolve_attachments(payload: dict[str, Any], report: dict[str, Any]) -> list[Path]:
    """Resolve local attachment paths or base64 files from payload or session directory."""
    resolved: list[Path] = []
    raw = payload.get("attachments") or report.get("attachments") or []

    for item in raw:
        if isinstance(item, (str, Path)):
            p = Path(item)

            if p.exists() and p.is_file():
                resolved.append(p)

        elif isinstance(item, dict):
            item_path = item.get("path") or item.get("filePath") or item.get("relPath")

            if item_path:
                p = Path(item_path)

                if p.exists() and p.is_file():
                    resolved.append(p)

            elif item.get("data") or item.get("dataUrl") or item.get("dataUri") or item.get("base64"):
                data_str = (
                    item.get("data")
                    or item.get("dataUrl")
                    or item.get("dataUri")
                    or item.get("base64")
                    or ""
                )

                if "," in data_str:
                    data_str = data_str.split(",", 1)[1]

                file_name = (
                    item.get("name")
                    or item.get("file_name")
                    or f"attachment_{uuid.uuid4().hex[:6]}.png"
                )
                temp_dir = Path(tempfile.gettempdir()) / "catmy_attachments"
                temp_dir.mkdir(parents=True, exist_ok=True)
                tmp_file = temp_dir / file_name

                try:
                    tmp_file.write_bytes(base64.b64decode(data_str))
                    resolved.append(tmp_file)
                except Exception as exc:
                    logger.warning("Failed to decode attachment %s: %s", file_name, exc)

    # Automatically attach snapshots and prompt from session directory if available
    session_id = report.get("session_id") or payload.get("session_id") or payload.get("sessionId")

    if session_id:
        session_dir = Path(".logs/recorded-bugs") / str(session_id)

        if session_dir.exists():
            screenshots_dir = session_dir / "screenshots"

            if screenshots_dir.exists():
                for snap_file in sorted(screenshots_dir.glob("*.png")):
                    if snap_file.is_file() and snap_file not in resolved:
                        resolved.append(snap_file)

            prompt_file = session_dir / "prompt.md"

            if prompt_file.exists() and not report.get("markdown_prompt"):
                try:
                    report["markdown_prompt"] = prompt_file.read_text(encoding="utf-8")
                except Exception:
                    pass

    return resolved


@router.post("")
async def post_bug_report(request: Request) -> JSONResponse:
    """Compose + deliver a bug report via email and/or Supabase."""
    rejected = _reject_non_loopback(request)

    if rejected is not None:
        return rejected

    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    raw_payload = await request.json()
    payload = raw_payload if isinstance(raw_payload, dict) else {}
    report = _compose_report(payload)
    channels = payload.get("channels") or ["email", "supabase"]
    deliveries: dict[str, Any] = {}
    attachments = _resolve_attachments(payload, report)

    client = None

    if "supabase" in channels:
        client = client_from_config(bug_config.load_supabase_config())

        if client is None:
            raise AppError(
                ErrorCode.E_BE_UNAVAILABLE,
                "Supabase is not configured: save URL + key in Bug Reporting settings first.",
                {"Hint": "POST /bug-reports/config"},
            )

    if "email" in channels:
        try:
            deliveries["email"] = bug_reports.deliver_email(
                report,
                sender=payload.get("email_from") or payload.get("sender"),
                recipient=payload.get("email_to") or payload.get("recipient"),
                attachments=attachments,
                markdown_prompt=report.get("markdown_prompt"),
            )
        except EmailSendError as error:
            raise AppError(ErrorCode.E_BUG_EMAIL_FAILED, str(error), {}) from error

    if "supabase" in channels and client is not None:
        try:
            deliveries["supabase"] = bug_reports.deliver_supabase(
                report, client, attachments=attachments
            )
        except SupabaseError as error:
            raise AppError(ErrorCode.E_BUG_SUPABASE_FAILED, str(error), {}) from error

    envelope = success(
        {"report": report, "deliveries": deliveries},
        requested_at=str(request.url),
    )

    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.get("/pending")
async def get_pending_reports(
    request: Request, limit: int = Query(default=_DEFAULT_LIMIT, ge=1, le=_MAX_LIMIT)
) -> JSONResponse:
    """Pending Supabase reports (developer download queue)."""
    rejected = _reject_non_loopback(request)

    if rejected is not None:
        return rejected

    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    client = client_from_config(bug_config.load_supabase_config())

    if client is None:
        raise AppError(
            ErrorCode.E_BE_UNAVAILABLE,
            "Supabase is not configured.",
            {"Hint": "POST /bug-reports/config"},
        )

    try:
        rows = client.select(
            "bug_reports",
            f"?select=*&status=eq.pending&order=created_at.desc&limit={limit}",
        )
    except SupabaseError as error:
        raise AppError(ErrorCode.E_BUG_SUPABASE_FAILED, str(error), {}) from error

    envelope = success(rows, requested_at=str(request.url), total_records=len(rows))

    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.get("/config")
async def get_bug_report_config(request: Request) -> JSONResponse:
    """Sanitized settings (key never returned)."""
    rejected = _reject_non_loopback(request)

    if rejected is not None:
        return rejected

    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    payload = {
        "supabase": bug_config.sanitized_supabase_config(bug_config.load_supabase_config()),
        "email_sender_resolves": bug_config.resolve_email_sender() is not None,
        "email_notifier_resolves": bug_config.resolve_notifier() is not None,
        "go_email_reader_bin": bug_config.resolve_go_email_reader_bin(),
    }
    envelope = success(payload, requested_at=str(request.url))

    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.post("/config")
async def post_bug_report_config(request: Request) -> JSONResponse:
    """Save Supabase settings (URL + key + role + enabled), 0600 file."""
    rejected = _reject_non_loopback(request)

    if rejected is not None:
        return rejected

    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    payload = await request.json()

    if not isinstance(payload, dict):
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "Config body must be a JSON object", {})

    url = payload.get("url")
    api_key = payload.get("api_key")

    if not isinstance(url, str) or not url:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "url is required", {"Field": "url"})

    if not isinstance(api_key, str) or not api_key:
        # Blank key keeps the stored key (settings UI placeholder flow);
        # a blank key with nothing stored is still a validation error.
        stored = bug_config.load_supabase_config()
        stored_key = stored.get("api_key") if stored else None

        if not isinstance(stored_key, str) or not stored_key:
            raise AppError(ErrorCode.E_BE_BAD_REQUEST, "api_key is required", {"Field": "api_key"})

        api_key = stored_key

    stored = {
        "url": url,
        "api_key": api_key,
        "role": payload.get("role", "secondary"),
        "is_enabled": bool(payload.get("is_enabled", True)),
    }
    bug_config.save_supabase_config(stored)
    envelope = success(
        bug_config.sanitized_supabase_config(stored), requested_at=str(request.url)
    )

    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})


@router.post("/test")
async def post_bug_report_test(request: Request) -> JSONResponse:
    """Endpoint reachability + table verification for stored settings."""
    rejected = _reject_non_loopback(request)

    if rejected is not None:
        return rejected

    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    client = client_from_config(bug_config.load_supabase_config())

    if client is None:
        raise AppError(
            ErrorCode.E_BE_UNAVAILABLE,
            "Supabase is not configured.",
            {"Hint": "POST /bug-reports/config"},
        )

    try:
        probe = client.test_endpoint()
        tables = client.verify_tables()
    except SupabaseError as error:
        raise AppError(ErrorCode.E_BUG_SUPABASE_FAILED, str(error), {}) from error

    payload = {"is_reachable": probe["is_reachable"], **tables}
    envelope = success(payload, requested_at=str(request.url))

    return JSONResponse(content=envelope.to_wire(), headers={CORRELATION_HEADER: correlation_id})




@router.post("/local")
@router.post("/save-local")
async def post_bug_report_local(request: Request) -> JSONResponse:
    """Save bug report session and screenshots directly to local disk (.logs/recorded-bugs/<id>/)."""
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    rejected = _reject_non_loopback(request)

    if rejected is not None:
        return rejected

    try:
        body = await request.json()
    except Exception as exc:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "Invalid JSON body", {"Error": str(exc)})

    session_id = body.get("session_id") or body.get("sessionId") or f"bug-{uuid.uuid4().hex[:8]}"
    out_dir = Path(".logs/recorded-bugs") / session_id

    # Verify no asset directory pollution
    resolved_out = out_dir.resolve().as_posix().lower()

    if "/src/assets" in resolved_out or "/public/assets" in resolved_out or "/assets" in resolved_out:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "Prohibited output path: snapshots cannot be written to assets directories",
            {},
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    screenshots_dir = out_dir / "screenshots"
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    def _sanitize_token(text: Any, default: str) -> str:
        cleaned = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in str(text).lower()).strip("_-")

        return cleaned[:35] or default

    saved_images: list[dict[str, str]] = []
    screenshots = body.get("screenshots") or []

    for idx, snap in enumerate(screenshots, 1):
        data_uri = snap.get("dataUrl") or snap.get("dataUri") or snap.get("data") or ""
        seq_val = snap.get("sequence") or snap.get("sequenceNumber") or idx
        seq_str = f"{int(seq_val):02d}"
        instance_str = _sanitize_token(snap.get("instance") or snap.get("instanceId") or snap.get("source") or "inst01", "inst01")
        action_str = _sanitize_token(snap.get("action") or snap.get("source") or "click", "click")
        target_str = _sanitize_token(
            snap.get("target") or snap.get("targetComponent") or snap.get("title") or snap.get("label") or f"target_{seq_str}",
            f"target_{seq_str}",
        )

        file_name = f"{seq_str}_{instance_str}_{action_str}_{target_str}.png"
        img_path = screenshots_dir / file_name

        if "," in data_uri:
            data_uri = data_uri.split(",", 1)[1]

        try:
            if data_uri:
                img_bytes = base64.b64decode(data_uri)
                img_path.write_bytes(img_bytes)

            abs_posix = img_path.resolve().as_posix()
            abs_url = f"file:///{abs_posix}"
            rel_file_path = f".logs/recorded-bugs/{session_id}/screenshots/{file_name}"
            ide_link = f"[{seq_str}_{instance_str}_{action_str}_{target_str}](file:;{abs_posix})"

            saved_images.append({
                "name": file_name,
                "path": str(img_path),
                "relPath": rel_file_path,
                "fileUrl": abs_url,
                "ideTag": ide_link,
                "antigravityTag": ide_link,
            })
        except Exception as write_err:
            logger.warning("Failed to save screenshot %s: %s", file_name, write_err)

    # Save summary metadata
    meta_path = out_dir / "metadata.json"
    meta_path.write_text(json.dumps(body, indent=2), encoding="utf-8")

    # Format Antigravity / IDE prompt Markdown (V6 & V7 standards)
    summary = body.get("summary") or {}
    title = summary.get("title") or body.get("title") or "Recorded Bug Report"
    category = summary.get("category") or "UiGlitch"
    initial_route = body.get("initialRoute") or "/"
    final_route = body.get("finalRoute") or initial_route
    expected = summary.get("expectedBehavior") or "Expected normal operation without visual or logical defects."
    actual = summary.get("actualBehavior") or "Unexpected UI glitch or defect captured during workflow."
    description = summary.get("description") or "Industrial session recorded with interaction telemetry and visual snapshots."
    title_slug = _sanitize_token(title, "bugfix")

    non_asset_alert = (
        "> [!CRITICAL]\n"
        "> **Ephemeral Visual Learning Only (Strict Non-Asset Rule):**\n"
        "> IMPORTANT: The attached snapshot images are for learning purposes only to understand UI behavior and geometry. "
        "NEVER save or commit these images into codebase assets or git repository. Analyze the bug, understand it, formulate your fix, "
        "and forget the images. Leave image artifacts strictly in their local binary-adjacent runtime directory (`.logs/recorded-bugs/<session_id>/`)."
    )

    comprehension_gate = (
        "> [!IMPORTANT]\n"
        "> **Mandatory Turn-1 AI Comprehension Gate (Zero Code Edits Without Prior Proof):**\n"
        "> In your VERY FIRST response turn upon receiving this prompt, you MUST output a comprehensive comprehension block in visible chat before executing any code changes or tool modifications:\n"
        "> 1. **Visual & Telemetry Diagnosis**: State what you observed across the step sequence, element geometries, and visual diffs.\n"
        "> 2. **Root Cause Hypothesis**: Articulate why the failure occurred based on the bundled Split-DB errors and DOM state.\n"
        "> 3. **Exact Remediation Plan**: Detail which source files will be touched and what logic will change.\n"
        "> 4. **Clarification Protocol**: If any telemetry point or user action is ambiguous, ASK clarifying questions immediately before taking action.\n"
        "> Code editing is STRICTLY FORBIDDEN until this comprehension block is articulated."
    )

    five_pillars = (
        "### 🧠 Deep Comprehension & Understood Mandate (Phase 1A Turn 1)\n\n"
        "#### Pillar 1: Strategic Intent & Systems Reasoning\n"
        f"- Overarching architectural goal: Isolate the root cause of reported defect \"{title}\" in session `{session_id}`, rectify faulty component logic or state transitions, and restore verified expected behavior.\n"
        f"- System reasoning: Telemetry reveals interaction sequence from route `{initial_route}` to `{final_route}` with {len(body.get('events') or [])} user actions and {len(saved_images)} snapshots. Downstream event handlers and state slices must be synchronized without introducing regressions.\n\n"
        "#### Pillar 2: Explicit Scope Boundaries (In-Scope vs. Excluded / Deferred)\n"
        "- **In-Scope:** Remediation of failing components identified in telemetry, Split-DB error resolution, and local verification.\n"
        "- **Excluded / Deferred:** Unrelated routing rewrites, global styling overhauls, or premature external API modifications.\n\n"
        "#### Pillar 3: Non-Negotiable Constraints & Negative Guardrails Ingestion\n"
        "- Ephemeral snapshot invariant: NEVER copy, move, import, or commit diagnostic screenshots into codebase assets (`assets/`, `src/assets/`, `public/assets/`).\n"
        "- Zero builds & tests: No full build runs (`go build`, `npm run build`, `vite build`) or general test suites (`pytest`, `npm test`) unless explicitly commanded.\n"
        "- Strict relative Git paths: All referenced codebase files must use relative paths from repository root.\n"
        "- GitMap hyphen commit: Single atomic commit using `gitmap cpf \"<module> - <summary>\"`.\n"
        "- Zero raw searches: Strictly avoid `rg`, `ripgrep`, `grep`, `Select-String`.\n\n"
        "#### Pillar 4: Blast Radius & Dependency Topology\n"
        "- Impacted Subsystems: Components and hooks registered under telemetry actions, state stores (`useRecorderStore`, `useErrorStore`), and backend endpoints (`/bug-reports`).\n"
        "- Containment Strategy: Disjoint file modifications with micro-batching (5-8 files), verifying each change without cross-component contamination.\n\n"
        "#### Pillar 5: Multi-Agent Concurrency Topology\n"
        "- Tree Swarm Structure: Lead Orchestrator (Root Node) -> Branch Coordinators (Subtask Owners) -> Leaf Workers & Dynamic Assistants.\n"
        "- Concurrency Parameters: `A = 3` agents, `H = 2` hands, System Concurrency Capacity = 6 operations."
    )

    screenshot_lines = [
        f"- **Snapshot #{idx:02d}**: {img['ideTag']}"
        for idx, img in enumerate(saved_images, 1)
    ]
    screenshots_block = "\n".join(screenshot_lines) if screenshot_lines else "> No visual snapshots recorded for this session."

    events = body.get("events") or []
    event_rows = []

    for e_idx, ev in enumerate(events, 1):
        ts = ev.get("elapsedMs") or ev.get("timestamp") or 0
        kind = ev.get("eventType") or ev.get("type") or "action"
        tgt = (ev.get("targetComponent") or ev.get("target") or "N/A").replace("|", "\\|")
        xpath = (ev.get("xpath") or ev.get("selector") or "-").replace("|", "\\|")
        route = ev.get("route") or initial_route
        matched_img = next((img["ideTag"] for img in saved_images if f"_{e_idx:02d}_" in img["name"] or img["name"].startswith(f"{e_idx:02d}_")), "-")
        event_rows.append(f"| {e_idx:02d} | {ts}ms | `{kind}` on `{tgt}` | `{route}` | `{xpath}` | {matched_img} |")

    timeline_table = (
        "| Step | Elapsed | Action & Target | Route | XPath | Snapshot Link |\n"
        "|---|---|---|---|---|---|\n" + "\n".join(event_rows)

        if event_rows
        else "_No events captured in timeline._"
    )

    errors = body.get("errors") or []
    error_lines = []

    for err in errors[:10]:
        code = err.get("code") or "E_APP_UNKNOWN"
        msg = err.get("message") or "Unknown error"
        comp = err.get("triggerComponent") or "Unspecified"
        corr = f" (Correlation: `{err['correlationId']}`)" if err.get("correlationId") else ""
        error_lines.append(f"- [{code}] **{msg}** (Trigger: `{comp}`){corr}")

    errors_block = "\n".join(error_lines) if error_lines else "> [OK] No runtime or Split-DB errors logged during this recording."

    # Build V6 Markdown
    v6_lines = [
        f"# [V6] Bug Remediation & UI Telemetry Diagnostic Task: {title}",
        "",
        "```text",
        "N = 400 (Total self-loop steps budget — editable top-header parameter, default: 400)",
        "A = 3   (MANDATORY number of spawned autonomous subagents running concurrently via invoke_subagent, default: 3)",
        "H = 2   (Operational hands per agent: dual-task batch capacity & parallel tool dispatch, default: 2)",
        "C = 30  (Tool calls per worker before it must report, default: 30)",
        "",
        "System Concurrency Capacity = A × H = 3 agents × 2 hands = 6 concurrent subtask operations",
        "Tree Hierarchy = Lead Orchestrator (Root Node) -> Branch Coordinators (Subtask Owners) -> Leaf Workers & Dynamic Joining Assistants",
        "PHASE_1_BUDGET = 100     (Steps 1 .. 100: Planning, Discovery Subagents, Up-Front Brain & Roadmap Creation, Lean Subtasks)",
        "PHASE_2_BUDGET = 150     (Steps 101 .. 250: Intermediate Archival, Sanitization, Prerequisite Refactoring, Intermediate Checkpoints)",
        "PHASE_3_BUDGET = 150     (Steps 251 .. 400: Tree Swarm Parallel Execution, Dynamic Join Capacity Saturation, Targeted Quality Linting, Fleet Sync, Atomic Push)",
        "WAVES = ceil(subtasks / (A x H))",
        "```",
        "",
        "> [!IMPORTANT]",
        "> **Prompt Version:** 6.0.0",
        "> **Runtime:** Google Antigravity 2.0 (IDE and CLI)",
        f"> **Session ID:** `{session_id}`",
        f"> **Category:** `{category}`",
        f"> **Initial Route:** `{initial_route}`",
        f"> **Final Route:** `{final_route}`",
        ">",
        "> **Top-Instruction Priority Mandate (Above Precedence / Preamble Precedence):**",
        "> Whatever directives, constraints, checklists, or user instructions are given ABOVE this prompt (including in the user preamble, header blocks, or incoming user request above) are HIGHEST PRIORITY and MUST BE FOLLOWED as strictly NON-NEGOTIABLE. They supersede and strictly override any conflicting general advice, default conventions, or lower-level guidelines below.",
        "",
        non_asset_alert,
        "",
        comprehension_gate,
        "",
        five_pillars,
        "",
        "## 1. Incident Overview",
        f"- **Session ID**: `{session_id}`",
        f"- **Category**: `{category}`",
        f"- **Initial Route**: `{initial_route}` -> `{final_route}`",
        f"- **Events Recorded**: {len(events)}",
        f"- **Snapshots Captured**: {len(saved_images)}",
        "",
        "## 2. Problem Statement",
        "### Description",
        description,
        "",
        "### Expected Behavior",
        expected,
        "",
        "### Actual Behavior",
        actual,
        "",
        "## 3. Visual Evidence & Screenshots (IDE Encapsulation Standard)",
        screenshots_block,
        "",
        "## 4. UI Telemetry & Step Action Matrix",
        timeline_table,
        "",
        "## 5. Active Diagnostic Errors (Split-DB SQLite & Runtime)",
        errors_block,
        "",
        "## 6. CLI Inspection Command",
        "```pwsh",
        f"python -m BE.cli.processing.main errors list --session-id {session_id} --trace",
        "```",
        "",
        "## 7. GitMap Atomic Commit Directive",
        "```pwsh",
        f'gitmap cpf "recorder - fix {title_slug}"',
        "```",
    ]

    # Build V7 Markdown
    v7_lines = [
        f"# [V7] Autonomous Bug Remediation Engine: {title}",
        "",
        "```text",
        "N = 400 (Total self-loop steps budget — editable top-header parameter, default: 400)",
        "A = 3   (MANDATORY number of spawned autonomous subagents running concurrently via invoke_subagent, default: 3)",
        "H = 2   (Operational hands per agent: dual-task batch capacity & parallel tool dispatch, default: 2)",
        "C = 30  (Tool calls per worker before it must report, default: 30)",
        "",
        "System Concurrency Capacity = A × H = 3 agents × 2 hands = 6 concurrent subtask operations",
        "Tree Hierarchy = Lead Orchestrator (Root Node) -> Branch Coordinators (Subtask Owners) -> Leaf Workers & Dynamic Joining Assistants",
        "PHASE_1_BUDGET = 100     (Steps 1 .. 100: Planning, Discovery Subagents, Up-Front Brain & Roadmap Creation, Lean Subtasks)",
        "PHASE_2_BUDGET = 150     (Steps 101 .. 250: Intermediate Archival, Sanitization, Prerequisite Refactoring, Intermediate Checkpoints)",
        "PHASE_3_BUDGET = 150     (Steps 251 .. 400: Tree Swarm Parallel Execution, Dynamic Join Capacity Saturation, Targeted Quality Linting, Fleet Sync, Atomic Push)",
        "WAVES = ceil(subtasks / (A x H))",
        "```",
        "",
        "> [!IMPORTANT]",
        "> **Prompt Version:** 7.0.0",
        "> **Runtime:** Google Antigravity 2.0 (IDE and CLI)",
        f"> **Session ID:** `{session_id}`",
        f"> **Target Issue:** {title}",
        "",
        non_asset_alert,
        "",
        comprehension_gate,
        "",
        "## 🌟 Operating Mode Configuration",
        "- **Active Mode**: Option 2: Unrestricted Mode (Continuous Autonomous Loop)",
        "- **Timezone Hierarchy**: CLI flag `--tz` -> Preamble -> Split-DB `commit_timezone` -> Host local (UTC)",
        "- **Window Policy**: Weekday morning window (< 08:00 AM) & weekend 24h unconstrained rule",
        "- **AI Automation Bot Persona**: `gitmap automation bot - muse - runs autonomously <info@rgitmap.com>`",
        "",
        five_pillars,
        "",
        "## 1. Incident Overview",
        f"- **Session ID**: `{session_id}`",
        f"- **Category**: `{category}`",
        f"- **Initial Route**: `{initial_route}` -> `{final_route}`",
        "",
        "## 2. Problem Statement",
        "### Description",
        description,
        "",
        "### Expected vs. Actual",
        f"- **Expected**: {expected}",
        f"- **Actual**: {actual}",
        "",
        "## 3. Visual Evidence (IDE Encapsulation Standard)",
        screenshots_block,
        "",
        "## 4. UI Telemetry & Step Action Matrix",
        timeline_table,
        "",
        "## 5. Active Diagnostic Errors (Split-DB SQLite & Runtime)",
        errors_block,
        "",
        "## 6. CLI Diagnostics & Telemetry Commands",
        "```pwsh",
        f"python -m BE.cli.processing.main errors list --session-id {session_id} --trace",
        "gitmap pe -t",
        "```",
        "",
        "## 7. GitMap Atomic Commit Directive",
        "```pwsh",
        f'gitmap cpf "recorder - resolve {title_slug}"',
        "```",
    ]

    v6_content = "\n".join(v6_lines) + "\n"
    v7_content = "\n".join(v7_lines) + "\n"

    md_path = out_dir / "prompt.md"
    v6_path = out_dir / "prompt-v6.md"
    v7_path = out_dir / "prompt-v7.md"

    md_path.write_text(v6_content, encoding="utf-8")
    v6_path.write_text(v6_content, encoding="utf-8")
    v7_path.write_text(v7_content, encoding="utf-8")

    payload = {
        "sessionId": session_id,
        "savedDir": str(out_dir.resolve()),
        "promptFile": str(md_path.resolve()),
        "promptFileV6": str(v6_path.resolve()),
        "promptFileV7": str(v7_path.resolve()),
        "promptFileUrl": f"file:///{md_path.resolve().as_posix()}",
        "screenshotCount": len(saved_images),
        "savedImages": saved_images,
        "idePrompt": v6_content,
    }

    return JSONResponse(
        content=success(payload, requested_at=str(request.url)).to_wire(),
        headers={CORRELATION_HEADER: correlation_id},
    )


__all__ = ["router"]

