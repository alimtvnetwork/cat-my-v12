"""Plan 90 Step 59 - `processing-cli batch` subcommand.

Anchors:
- `spec/21-app/75-processing-cli.md` §Subcommands: `batch` fans `evaluate`
  across a folder or manifest and produces "one `<RunSessionId>.jsonl`
  per RunSession, N `Result` lines".
- `spec/21-app/17-parallelism-guarantees.md` §3 "one writer per DB file"
  invariant, generalized here to "one writer per JSONL file": the shared
  results file MUST be serialized behind a lock even when frames are
  fanned out to worker threads.
- `spec/13-generic-cli/18-batch-execution.md` §"Continue on failure":
  a failing frame MUST NOT abort the batch; per-frame failures are
  collected into `Failures[]` and reported alongside successful `Results[]`.
- `spec/21-app/24-results-json.md` §1 Write policy (append-only, fsync).
- Honesty rule (inherited from `commands/evaluate.py:12`): we do not
  fabricate verdicts. `E_BE_UNAVAILABLE` from `evaluate.handle` is
  captured per-frame; the batch itself only fails hard on argparse /
  bundle / enumeration errors that make the whole run meaningless.

Concurrency:
- Default `--max-workers 1` keeps this step trivially serial. Bounded
  `ThreadPoolExecutor` is used when >1 because `evaluate.handle` is
  IO+JSON-bound (no CPython lock contention on rule evaluation yet;
  the real engine lands at Steps 79-87 and will pick its own model).
- Per-frame ordering of `Results` is deterministic (sorted enumeration
  input order), independent of completion order. Spec 17 §5 "Assignment
  order = FIFO by ImageSequence" is honored via `sorted()`.
- JSONL writes are serialized behind `_write_lock` so multi-worker
  interleaving cannot corrupt a line.

Discovery:
- `--input-dir <dir>`: non-recursive glob of image extensions
  (`.png .jpg .jpeg .bmp .tif .tiff`), sorted by filename. Empty dir ->
  `E_BE_NOT_FOUND` because "batch over zero frames" is almost always a
  wrong path, not an intentional no-op.
- `--manifest <path>`: JSON file whose top-level shape is either
  `["path1", ...]` or `{"frames": ["path1", ...]}`. Missing frames in
  the manifest surface as per-frame `Failures[]` entries with
  `E_BE_NOT_FOUND` (partial success is a valid outcome for a manifest).
- Exactly one of the two is required; both or neither -> `E_CLI_USAGE`.

Output envelope shape (handler return value; dispatcher wraps):
    {
      "RunSessionId": "<id>",
      "FrameCount": N,
      "SuccessCount": M,
      "FailureCount": N - M,
      "Results": [ResultRecord, ...],   # spec 24 §3 per-image records
      "Failures": [{"FramePath": "...", "Code": "E_...", "Message": "..."}, ...],
    }
"""

from __future__ import annotations

import argparse
import json
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any

from BE.cli.common.session import SessionCtx
from BE.cli.processing.commands import evaluate as _evaluate
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff")
_MAX_WORKERS_HARD_CAP = 16  # spec 17 §7 envelope: 8 processes × 3 in-flight = 24;
                            # threads inside a single CLI process stay well below that
                            # so the batch never starves the real Worker pool.


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--bundle", required=True,
                        help="Path to the rule bundle JSON (per spec 21-app/70).")
    src = parser.add_mutually_exclusive_group(required=False)
    src.add_argument("--input-dir", default=None,
                     help="Folder of image frames (non-recursive; sorted by name).")
    src.add_argument("--manifest", default=None,
                     help="JSON file: array of paths OR {\"frames\":[...]}.")
    parser.add_argument("--run-id", default=None,
                        help="Explicit RunSessionId; auto-generated when omitted.")
    parser.add_argument("--results-dir", default=None,
                        help="If set, append every ResultRecord to "
                             "<results-dir>/<RunSessionId>.jsonl (fsync per spec 24 §1).")
    parser.add_argument("--max-workers", type=int, default=1,
                        help=f"Bounded thread fan-out [1..{_MAX_WORKERS_HARD_CAP}]. "
                             "Default 1 keeps batch trivially serial.")


def _enumerate_frames(ns: argparse.Namespace) -> list[Path]:
    if bool(ns.input_dir) == bool(ns.manifest):
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            "exactly one of --input-dir or --manifest is required",
            {"InputDir": ns.input_dir, "Manifest": ns.manifest},
        )
    if ns.input_dir:
        d = Path(ns.input_dir).expanduser()
        if d.exists() is False or d.is_dir() is False:
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
    if mpath.exists() is False or mpath.is_file() is False:
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
    # Preserve manifest order (author intent), do NOT re-sort.
    return [Path(p).expanduser() for p in items]


def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    frames = _enumerate_frames(ns)
    workers = max(1, min(int(ns.max_workers or 1), _MAX_WORKERS_HARD_CAP))
    run_id = ns.run_id or _evaluate._generate_run_id()
    results_dir = Path(ns.results_dir).expanduser() if ns.results_dir else None

    ctx.logger.log(
        "INFO", "batch.begin",
        f"batch frames={len(frames)} workers={workers} run_id={run_id}",
        ctx={"RunSessionId": run_id, "FrameCount": len(frames), "MaxWorkers": workers},
    )

    write_lock = threading.Lock()
    results: list[dict[str, Any]] = [None] * len(frames)  # type: ignore[list-item]
    failures: list[dict[str, Any]] = []
    fail_lock = threading.Lock()

    def _one(idx: int, frame: Path) -> None:
        sub_ns = argparse.Namespace(
            frame=str(frame),
            bundle=ns.bundle,
            run_id=run_id,
            # Persistence is done centrally (single writer per JSONL) so
            # the sub-call must NOT write on its own.
            results_dir=None,
        )
        try:
            recs = _evaluate.handle(sub_ns, ctx)
        except AppError as exc:
            with fail_lock:
                failures.append({
                    "FramePath": str(frame),
                    "Code": exc.code.value,
                    "Message": str(exc),
                    "Details": dict(exc.details or {}),
                })
            return
        rec = recs[0]
        results[idx] = rec
        if results_dir is not None:
            with write_lock:
                _evaluate._write_jsonl(results_dir, run_id, rec)

    if workers == 1:
        for i, f in enumerate(frames):
            _one(i, f)
    else:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            list(pool.map(lambda p: _one(*p), enumerate(frames)))

    ok_results = [r for r in results if r is not None]
    ctx.logger.log(
        "INFO", "batch.done",
        f"batch complete success={len(ok_results)} failure={len(failures)}",
        ctx={
            "RunSessionId": run_id,
            "SuccessCount": len(ok_results),
            "FailureCount": len(failures),
        },
    )
    return {
        "RunSessionId": run_id,
        "FrameCount": len(frames),
        "SuccessCount": len(ok_results),
        "FailureCount": len(failures),
        "Results": ok_results,
        "Failures": failures,
    }
