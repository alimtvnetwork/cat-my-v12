"""Plan 90 Step 61 - `processing-cli dry-run` subcommand.

Anchors:
- `spec/21-app/75-processing-cli.md` §Subcommands: `dry-run` is the
  read-only rehearsal of `evaluate` / `batch`. It MUST NOT write JSONL,
  MUST NOT emit `ResultReady` IPC (Step 64), and MUST NOT touch the
  Task-DB (Step 87). Its only job is to answer "what verdicts would we
  produce for this frame set against this bundle right now?" so QA and
  bundle authors can iterate without side effects.
- `spec/21-app/24-results-json.md` §1 "Write policy": persistence is
  opt-in; a dry-run is the canonical opt-out.
- Honesty rule (inherited from `commands/evaluate.py:14`): a dry-run
  still refuses to fabricate verdicts. `E_BE_UNAVAILABLE` for bundles
  with Active/Silent rules is surfaced per-frame in `Failures[]`, not
  hidden, so the operator sees the exact reason the rehearsal is
  incomplete today.

Discovery mirrors `commands/batch.py:91` (`--frame` OR `--input-dir`
OR `--manifest`; exactly one). Reusing `_evaluate.handle` guarantees
the same code path as production `evaluate` minus persistence: the
sub-call is invoked with `results_dir=None`, and this handler NEVER
constructs a `_write_jsonl` call. That is the entire behavioural delta
from `batch`.

Wire shape (handler return; dispatcher wraps in the Universal Envelope):
    {
      "RunSessionId": "<id>",
      "DryRun": True,           # explicit marker for downstream consumers
      "FrameCount": N,
      "SuccessCount": M,
      "FailureCount": N - M,
      "Results": [ResultRecord, ...],
      "Failures": [{"FramePath": "...", "Code": "...", "Message": "..."}],
    }
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from BE.cli.common.session import SessionCtx
from BE.cli.processing.commands import evaluate as _evaluate
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff")


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--bundle", required=True,
                        help="Path to the rule bundle JSON (per spec 21-app/70).")
    src = parser.add_mutually_exclusive_group(required=False)
    src.add_argument("--frame", default=None,
                     help="Single frame image path (rehearses one evaluate call).")
    src.add_argument("--input-dir", default=None,
                     help="Folder of image frames (non-recursive; sorted by name).")
    src.add_argument("--manifest", default=None,
                     help="JSON file: array of paths OR {\"frames\":[...]}.")
    parser.add_argument("--run-id", default=None,
                        help="Explicit RunSessionId; auto-generated when omitted.")


def _enumerate(ns: argparse.Namespace) -> list[Path]:
    provided = [bool(ns.frame), bool(ns.input_dir), bool(ns.manifest)]
    if sum(provided) != 1:
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            "exactly one of --frame, --input-dir, or --manifest is required",
            {"Frame": ns.frame, "InputDir": ns.input_dir, "Manifest": ns.manifest},
        )
    if ns.frame:
        return [Path(ns.frame).expanduser()]
    if ns.input_dir:
        d = Path(ns.input_dir).expanduser()
        if not d.exists() or not d.is_dir():
            raise AppError(
                ErrorCode.E_BE_NOT_FOUND,
                f"input dir not found: {d}",
                {"Path": str(d)},
            )
        frames = sorted(
            p for p in d.iterdir()
            if p.is_file() and p.suffix.lower() in _IMAGE_EXTS
        )
        if not frames:
            raise AppError(
                ErrorCode.E_BE_NOT_FOUND,
                f"no frames matched {_IMAGE_EXTS} in {d}",
                {"Path": str(d), "Extensions": list(_IMAGE_EXTS)},
            )
        return frames
    mpath = Path(ns.manifest).expanduser()
    if not mpath.exists() or not mpath.is_file():
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"manifest not found: {mpath}",
            {"Path": str(mpath)},
        )
    try:
        raw = json.loads(mpath.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            f"manifest is not valid JSON: {exc.msg}",
            {"Path": str(mpath), "Line": exc.lineno, "Col": exc.colno},
        ) from exc
    items = raw.get("frames") if isinstance(raw, dict) else raw
    if not isinstance(items, list) or not all(isinstance(x, str) for x in items):
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            "manifest must be a JSON array of strings or {\"frames\":[strings]}",
            {"Path": str(mpath)},
        )
    if not items:
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"manifest declares zero frames: {mpath}",
            {"Path": str(mpath)},
        )
    return [Path(p).expanduser() for p in items]


def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    frames = _enumerate(ns)
    run_id = ns.run_id or _evaluate._generate_run_id()

    ctx.logger.log(
        "INFO", "dry_run.begin",
        f"dry-run frames={len(frames)} run_id={run_id}",
        ctx={"RunSessionId": run_id, "FrameCount": len(frames), "DryRun": True},
    )

    results: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    for frame in frames:
        sub_ns = argparse.Namespace(
            frame=str(frame),
            bundle=ns.bundle,
            run_id=run_id,
            results_dir=None,  # invariant: dry-run NEVER persists.
        )
        try:
            recs = _evaluate.handle(sub_ns, ctx)
        except AppError as exc:
            failures.append({
                "FramePath": str(frame),
                "Code": exc.code.value,
                "Message": str(exc),
                "Details": dict(exc.details or {}),
            })
            continue
        results.append(recs[0])

    ctx.logger.log(
        "INFO", "dry_run.done",
        f"dry-run complete success={len(results)} failure={len(failures)}",
        ctx={
            "RunSessionId": run_id,
            "SuccessCount": len(results),
            "FailureCount": len(failures),
            "DryRun": True,
        },
    )
    return {
        "RunSessionId": run_id,
        "DryRun": True,
        "FrameCount": len(frames),
        "SuccessCount": len(results),
        "FailureCount": len(failures),
        "Results": results,
        "Failures": failures,
    }
