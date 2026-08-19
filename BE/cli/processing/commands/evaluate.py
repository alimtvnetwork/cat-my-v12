"""Plan 90 Step 58 - `processing-cli evaluate` subcommand.

Anchors:
- `spec/21-app/75-processing-cli.md` §Acceptance #1: `processing-cli evaluate
  --frame <path> --bundle <path> --json` returns envelope with
  `Results = [ResultRecord]`.
- `spec/21-app/24-results-json.md` §3 (per-image line shape, `schemaVersion=2`,
  PascalCase enum values, `ruleSet.*Count` invariants:
  `activeCount + inactiveCount + silentCount == ruleCount`;
  `passCount + failCount + errorCount == activeCount`).
- `spec/21-app/47-rule-condition-model.md` and `49-validation-order.md`
  own the evaluator loop; this file is the CLI surface, not the engine.

Honesty rule (mirrors `BE/sdk_facade/camera.py:107`'s "no fabricated frames"):
    The rule-evaluation engine is not wired yet (Steps 79-87 land the
    Task-DB writers + evaluator). We MUST NOT invent Pass/Fail verdicts
    for rules we cannot execute. Behaviour:

    - Frame path missing / unreadable -> `E_BE_NOT_FOUND` (404-ish; the
      CLI dispatcher maps `E_BE_*` to `DomainError` exit code per
      `BE/cli/common/dispatcher.py` `_DOMAIN` bucket).
    - Bundle JSON missing, unparseable, or fails minimal shape checks ->
      `E_RULE_BUNDLE_INVALID` (spec 75 §Acceptance #4 uses the same code
      for `verify-bundle` failure; keeping the code shared means one
      remediation path in the FE Global Error Modal).
    - Bundle parses AND declares zero rules -> honest empty ResultRecord
      (`Verdict = "Pass"`, empty `Judgments`, all counters zero). This is
      NOT fabrication: with zero rules the deterministic image verdict
      per spec 21-app/22 §4 IS Pass (nothing to fail on).
    - Bundle declares one or more rules -> `E_BE_UNAVAILABLE` with
      `Details.RuleCount` so callers see exactly why we refused.

Wire shape returned in `Results[0]` mirrors spec 24 §3 field-for-field
(PascalCase JSON keys via `_result_wire()`), stripped to the fields the
evaluator can produce today. Adding fake `judgments` here would violate
spec/21-app/24 §2 "no fabricated verdicts" enforcement.

Persistence is opt-in via `--results-dir`; when set we write the JSONL
line to `<results-dir>/<RunSessionId>.jsonl` with `fsync` per spec 24 §1
"Write policy". No DB writes yet - the Task-DB `results` / `result_details`
writer arrives at Step 87.
"""

from __future__ import annotations

import argparse
import json
import os
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from BE.cli.common.session import SessionCtx
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

# ---- argparse -------------------------------------------------------------

def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--frame", required=True,
        help="Path to the frame image file to evaluate (must exist).",
    )
    parser.add_argument(
        "--bundle", required=True,
        help="Path to the rule bundle JSON (per spec 21-app/70).",
    )
    parser.add_argument(
        "--run-id", default=None,
        help="Explicit RunSessionId; when omitted a ULID-like ts-based id is generated.",
    )
    parser.add_argument(
        "--results-dir", default=None,
        help="If set, write `<RunSessionId>.jsonl` here (fsync per spec 24 §1).",
    )
    parser.add_argument(
        "--emit-ipc", action="store_true", default=False,
        help="After successful persistence, emit a ResultReady IPC message "
             "(spec 75 §Acceptance #2). Requires --results-dir.",
    )
    parser.add_argument(
        "--ipc-root", default=None,
        help="Override APP_IPC_ROOT for --emit-ipc (env / OS default otherwise).",
    )
    parser.add_argument(
        "--ipc-out-dir", default="processing-out",
        help="Drop-dir under IPC root to emit ResultReady into (default: processing-out).",
    )
    parser.add_argument(
        "--frame-seq", type=int, default=0,
        help="FrameSeq stamped on the emitted ResultReady payload (default: 0).",
    )
    parser.add_argument(
        "--mode", choices=("auto", "short-circuit", "full"), default="auto",
        help=(
            "Validation order mode (spec 21-app/49 §4). "
            "'auto' (default) reads `validationMode` from the bundle "
            "(parallel/sequential -> full/short-circuit); "
            "'short-circuit' stops at the first Fail (spec 49 sequential); "
            "'full' evaluates every Active rule (spec 49 parallel). "
            "Operator-supplied value overrides bundle authoring intent "
            "and is recorded in logs + E_BE_UNAVAILABLE Details.Mode."
        ),
    )
    parser.add_argument(
        "--task-db-root", default=None,
        help="Override APP_DB_ROOT so the RunSession/RuleResult/FrameArtifact "
             "Task-DB rows land under <db-root>/task.db. When unset, DB persistence "
             "auto-runs if APP_DB_ROOT is in the env, and is skipped otherwise.",
    )



# ---- helpers --------------------------------------------------------------

def _now_iso() -> str:
    return (
        datetime.now(UTC)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def _generate_run_id() -> str:
    # Not a real ULID (that lands with the ULID helper at Step 79). This is
    # a deterministic-enough fallback: ts-nanos + pid, base36-ish. Documented
    # so a reader does not mistake it for the canonical ULID contract.
    return f"RS{int(time.time_ns()):x}{os.getpid():x}"


def _read_bundle(path: Path) -> dict[str, Any]:
    if not path.exists() or not path.is_file():
        raise AppError(
            ErrorCode.E_RULE_BUNDLE_INVALID,
            f"bundle not found: {path}",
            {"Path": str(path), "Reason": "missing"},
        )
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise AppError(
            ErrorCode.E_RULE_BUNDLE_INVALID,
            f"bundle unreadable: {path}",
            {"Path": str(path), "Reason": "io_error"},
        ) from exc
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise AppError(
            ErrorCode.E_RULE_BUNDLE_INVALID,
            f"bundle is not valid JSON: {exc.msg}",
            {"Path": str(path), "Reason": "json_decode", "Line": exc.lineno, "Col": exc.colno},
        ) from exc
    if not isinstance(data, dict):
        raise AppError(
            ErrorCode.E_RULE_BUNDLE_INVALID,
            "bundle root must be a JSON object",
            {"Path": str(path), "Reason": "not_object", "Type": type(data).__name__},
        )
    rules = data.get("rules", [])
    if not isinstance(rules, list):
        raise AppError(
            ErrorCode.E_RULE_BUNDLE_INVALID,
            "bundle.rules must be a JSON array",
            {"Path": str(path), "Reason": "rules_not_array"},
        )
    return data


@dataclass(frozen=True)
class _RuleCounts:
    total: int
    active: int
    inactive: int
    silent: int


def _count_rules(bundle: dict[str, Any]) -> _RuleCounts:
    rules = bundle.get("rules") or []
    total = len(rules)
    active = 0
    inactive = 0
    silent = 0
    for r in rules:
        # Author-status defaults: `enabled=True` and not silent -> Active.
        # Explicit `status` field wins if present (spec 24 §3 field rules).
        status = str(r.get("status", "Active")) if isinstance(r, dict) else "Active"
        if status == "Inactive" or (isinstance(r, dict) and r.get("enabled") is False):
            inactive += 1
        elif status == "Silent":
            silent += 1
        else:
            active += 1
    return _RuleCounts(total=total, active=active, inactive=inactive, silent=silent)


def _empty_result_record(
    *,
    run_id: str,
    frame_path: Path,
    bundle_counts: _RuleCounts,
) -> dict[str, Any]:
    now = _now_iso()
    # Spec 24 §3 counter invariants hold trivially here: 0 active, 0 pass/fail/error.
    return {
        "SchemaVersion": 2,
        "RunSessionId": run_id,
        "Verdict": "Pass",
        "ImageFilePath": str(frame_path),
        "CapturedAt": now,
        "PersistedAt": now,
        "RuleSet": {
            "RuleCount": bundle_counts.total,
            "ActiveCount": bundle_counts.active,
            "InactiveCount": bundle_counts.inactive,
            "SilentCount": bundle_counts.silent,
            "PassCount": 0,
            "FailCount": 0,
            "ErrorCount": 0,
            "Rules": [],
        },
        "Judgments": [],
    }


def _write_jsonl(results_dir: Path, run_id: str, record: dict[str, Any]) -> Path:
    results_dir.mkdir(parents=True, exist_ok=True)
    out = results_dir / f"{run_id}.jsonl"
    line = json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n"
    # Append-only + fsync per spec 24 §1 "Write policy".
    with open(out, "a", encoding="utf-8") as fh:
        fh.write(line)
        fh.flush()
        os.fsync(fh.fileno())
    return out


# spec/21-app/49-validation-order.md §4 pins the two authored values:
#   validationMode: "parallel"   -> evaluate every Active rule ("full")
#   validationMode: "sequential" -> early-exit at first FAIL ("short-circuit")
# Any other bundle value is a bundle-authoring bug (E_RULE_BUNDLE_INVALID
# territory once the compiler lands at Step 87+); until then we accept
# the raw string but log ModeSource="bundle-unknown" so the anomaly is
# visible in the CLI logs rather than silently coerced.
_BUNDLE_MODE_MAP = {
    "parallel": "full",
    "sequential": "short-circuit",
}


def _resolve_mode(bundle: dict[str, Any], cli_mode: str) -> tuple[str, str]:
    """Return (effective_mode, source) per spec 49 authoring rules.

    Precedence:
      1. Explicit CLI --mode (short-circuit|full) wins and is tagged
         "cli-override" so operators can grep for authoring overrides.
      2. --mode auto (default) reads bundle.validationMode.
      3. Bundle missing / unknown / malformed -> default to "full"
         (spec 49 §3 v2->v3 migration sets parallel as the safe default)
         tagged with a source string that makes the fallback visible.
    """
    if cli_mode in ("short-circuit", "full"):
        return cli_mode, "cli-override"
    raw = bundle.get("validationMode") if isinstance(bundle, dict) else None
    if isinstance(raw, str):
        mapped = _BUNDLE_MODE_MAP.get(raw.lower())
        if mapped is not None:
            return mapped, "bundle"
        return "full", "bundle-unknown"
    return "full", "bundle-default"


# Plan 90 Step 92 — top-level ErrorCode promotion into ResultReady IPC.
# Priority mirrors spec 21-app/33 §5 (timeouts alert first) then falls back to
# the first Error judgment's ErrorCode. Keeps the payload deterministic so
# consumers can key alerting off a single string instead of scanning judgments.
_ERROR_CODE_PRIORITY: tuple[str, ...] = (
    "E_RULE_TIMEOUT",
    "E_TOLERANCE_INCOMPATIBLE",
    "E_TOLERANCE_UNRESOLVED",
    "E_RULE_EVAL_FAILED",
    "E_RULE_BUNDLE_INVALID",
)


def _promote_error_code(judgments: list[dict[str, Any]]) -> str | None:
    seen: list[str] = []
    for j in judgments:
        if not isinstance(j, dict):
            continue
        details = j.get("Details") or j.get("details") or {}
        if not isinstance(details, dict):
            continue
        code = details.get("ErrorCode")
        if isinstance(code, str) and code:
            seen.append(code)
    if not seen:
        return None
    for pref in _ERROR_CODE_PRIORITY:
        if pref in seen:
            return pref
    return seen[0]


# ---- Task-DB persistence (Plan 90 Step 99) --------------------------------


def _maybe_persist_task_db(
    ns: argparse.Namespace,
    ctx: SessionCtx,
    run_id: str,
    record: dict[str, Any],
    mode_effective: str,
    persisted_path: Path | None,
) -> None:
    """Persist RunSession + RuleResult + FrameArtifact rows for this run.

    Skipped silently when neither `--task-db-root` nor `APP_DB_ROOT` is
    set (keeps unit tests that only exercise the JSONL path unchanged).
    Every writer call is idempotent by its natural composite key, so a
    crash between writers heals on replay of the same JSONL.
    """
    task_db_root = getattr(ns, "task_db_root", None) or os.environ.get("APP_DB_ROOT")
    if not task_db_root:
        return
    from BE.app.db.writers import frame_artifact as _fa
    from BE.app.db.writers import rule_result as _rr
    from BE.app.db.writers import run_session as _rs
    from BE.db.connections import get_task_conn

    conn = get_task_conn(db_root=task_db_root)
    try:
        rs_out = _rs.write_run_session(
            conn, record, mode=mode_effective,
            results_jsonl_path=str(persisted_path) if persisted_path else None,
        )
        ctx.logger.log(
            "INFO", "evaluate.db.run_session",
            f"RunSession {'inserted' if rs_out.WasInserted else 'idempotent-skip'} "
            f"id={rs_out.RunSessionId}",
            ctx={
                "RunSessionId": run_id,
                "TaskRunSessionId": rs_out.RunSessionId,
                "WasInserted": rs_out.WasInserted,
            },
        )
        judgments = record.get("Judgments") or []
        rr_by_rule_id: dict[str, int] = {}
        if judgments:
            rr_out = _rr.write_rule_results(
                conn, run_session_id=rs_out.RunSessionId, judgments=judgments,
            )
            rr_by_rule_id = {row.RuleId: row.RuleResultId for row in rr_out.Rows}
            ctx.logger.log(
                "INFO", "evaluate.db.rule_results",
                f"RuleResult inserted={rr_out.InsertedCount} skipped={rr_out.SkippedCount}",
                ctx={
                    "RunSessionId": run_id,
                    "TaskRunSessionId": rs_out.RunSessionId,
                    "InsertedCount": rr_out.InsertedCount,
                    "SkippedCount": rr_out.SkippedCount,
                },
            )

        # Judgments may carry per-rule `Artifacts: [...]`; flatten with the
        # freshly-known RuleResultId so FrameArtifact rows FK-link exactly.
        artifacts: list[dict[str, Any]] = []
        for j in judgments:
            if not isinstance(j, dict):
                continue
            arts = j.get("Artifacts") or j.get("artifacts") or []
            if not isinstance(arts, list):
                continue
            rid = j.get("RuleId") or j.get("ruleId")
            rr_id = rr_by_rule_id.get(rid) if isinstance(rid, str) else None
            for a in arts:
                if not isinstance(a, dict):
                    continue
                if rr_id is not None and "RuleResultId" not in a and "ruleResultId" not in a:
                    a = {**a, "RuleResultId": rr_id}
                artifacts.append(a)
        # Run-level artifacts (SourceFrame etc.) live on the record itself;
        # RuleResultId stays NULL for these.
        for a in (record.get("Artifacts") or record.get("artifacts") or []):
            if isinstance(a, dict):
                artifacts.append(a)
        if artifacts:
            fa_out = _fa.write_frame_artifacts(
                conn, run_session_id=rs_out.RunSessionId, artifacts=artifacts,
            )
            ctx.logger.log(
                "INFO", "evaluate.db.frame_artifacts",
                f"FrameArtifact inserted={fa_out.InsertedCount} skipped={fa_out.SkippedCount}",
                ctx={
                    "RunSessionId": run_id,
                    "TaskRunSessionId": rs_out.RunSessionId,
                    "InsertedCount": fa_out.InsertedCount,
                    "SkippedCount": fa_out.SkippedCount,
                },
            )
    except AppError as exc:
        ctx.logger.log(
            "ERROR", "evaluate.db.write_failed",
            f"Task-DB persistence failed: {exc.code.value}: {exc.message}",
            ctx={"RunSessionId": run_id, "ErrorCode": exc.code.value},
        )
        raise
    finally:
        conn.close()


# ---- handler --------------------------------------------------------------







def handle(ns: argparse.Namespace, ctx: SessionCtx) -> list[dict[str, Any]]:
    frame_path = Path(ns.frame).expanduser()
    bundle_path = Path(ns.bundle).expanduser()

    if not frame_path.exists() or not frame_path.is_file():
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"frame not found: {frame_path}",
            {"Path": str(frame_path)},
        )

    if frame_path.suffix == ".npy":
        try:
            import numpy as np
            arr = np.load(frame_path)
            if len(arr.shape) != 3 or arr.shape[2] != 3 or arr.dtype != np.uint8:
                raise ValueError(f"Expected HxWx3 uint8, got {arr.shape} {arr.dtype}")
        except Exception as e:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"Invalid .npy frame format: {e}",
                {"Path": str(frame_path)},
            ) from e

    bundle = _read_bundle(bundle_path)
    counts = _count_rules(bundle)
    run_id = ns.run_id or _generate_run_id()
    mode_effective, mode_source = _resolve_mode(bundle, getattr(ns, "mode", "auto"))

    ctx.logger.log(
        "INFO", "evaluate.begin",
        f"evaluate frame={frame_path.name} bundle={bundle_path.name} "
        f"rules={counts.total} mode={mode_effective}({mode_source})",
        ctx={
            "RunSessionId": run_id,
            "RuleCount": counts.total,
            "ActiveCount": counts.active,
            "Mode": mode_effective,
            "ModeSource": mode_source,
        },
    )

    if counts.active > 0 or counts.silent > 0:
        # Honesty rule: refuse to fabricate verdicts for rules we cannot run.
        raise AppError(
            ErrorCode.E_BE_UNAVAILABLE,
            "rule evaluator not wired yet (Plan 90 Steps 79-87)",
            {
                "RunSessionId": run_id,
                "RuleCount": counts.total,
                "ActiveCount": counts.active,
                "SilentCount": counts.silent,
                "BundlePath": str(bundle_path),
                "Mode": mode_effective,
                "ModeSource": mode_source,
            },
        )


    record = _empty_result_record(
        run_id=run_id,
        frame_path=frame_path,
        bundle_counts=counts,
    )

    persisted_path: Path | None = None
    if ns.results_dir:
        persisted_path = _write_jsonl(Path(ns.results_dir).expanduser(), run_id, record)
        ctx.logger.log(
            "INFO", "evaluate.persisted",
            f"wrote {persisted_path}",
            ctx={"RunSessionId": run_id, "ResultsPath": str(persisted_path)},
        )

    # Plan 90 Step 99 - Task-DB wiring. RunSession + RuleResult + FrameArtifact
    # writers land as one sequential batch. Each writer opens its own
    # BEGIN IMMEDIATE and each is idempotent by its natural key (RunId /
    # (RunSessionId,RuleId) / (RunSessionId,RelPath)), so a crash between
    # writers heals on replay of the same JSONL (spec 24 §1 write policy).
    # Root cause guarded (pre-Step-99): JSONL was the only persisted signal;
    # DB tables from Steps 96-98 stayed empty at runtime, breaking the
    # Step 100 observability route and Step 141+ FE history drawer.
    _maybe_persist_task_db(ns, ctx, run_id, record, mode_effective, persisted_path)

    # Spec 75 §Acceptance #2 — evaluate MUST be able to emit ResultReady so
    # a downstream watcher (main app, packaging pipeline, etc.) sees a
    # single-shot evaluation the same way it sees a `watch`-driven one.
    # Guarded behind --emit-ipc so batch/CI callers stay side-effect-free.
    if getattr(ns, "emit_ipc", False):
        if persisted_path is None:
            raise AppError(
                ErrorCode.E_CLI_USAGE,
                "--emit-ipc requires --results-dir (ResultsPath must be a real file)",
                {"RunSessionId": run_id},
            )
        # Imported lazily to keep `evaluate` importable in environments
        # (unit tests, dry-run) that never touch IPC.
        from BE.cli.common import ipc as _ipc
        from BE.cli.common.paths import resolve_root

        ipc_root = resolve_root("ipc", override=ns.ipc_root, ensure=True)
        (ipc_root / str(ns.ipc_out_dir)).mkdir(parents=True, exist_ok=True)
        rs = record.get("RuleSet", {}) or {}
        error_count = int(rs.get("ErrorCount", 0))
        promoted = _promote_error_code(record.get("Judgments") or [])
        rr_payload = {
            "ResultsPath": str(persisted_path),
            "RunId": run_id,
            "FrameSeq": int(getattr(ns, "frame_seq", 0) or 0),
            "Decision": str(record.get("Verdict", "Pass")).lower(),
            "RuleCount": int(rs.get("RuleCount", 0)),
            "PassCount": int(rs.get("PassCount", 0)),
            "FailCount": int(rs.get("FailCount", 0)),
            "ErrorCount": error_count,
        }
        if promoted is not None:
            rr_payload["ErrorCode"] = promoted

        msg_path = _ipc.send(
            ipc_root, str(ns.ipc_out_dir), "ResultReady", rr_payload,
            run_id=run_id, from_="processing-cli", to="main",
            seq=rr_payload["FrameSeq"],
        )
        ctx.logger.log(
            "INFO", "evaluate.ipc.emitted",
            f"ResultReady -> {msg_path.name}",
            ctx={"RunSessionId": run_id, "IpcMessagePath": str(msg_path),
                 "OutDir": str(ns.ipc_out_dir)},
        )

    return [record]
