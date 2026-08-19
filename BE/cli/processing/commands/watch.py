"""Plan 90 Step 60 - `processing-cli watch` subcommand.

Anchors:
- `spec/21-app/75-processing-cli.md` §Subcommands + §Acceptance #2:
  "polls the Worker IPC dir, processes each `frame_ready` message
  exactly once (idempotency key = `run_id + frame_seq`), and writes
  `result_ready` back to the same dir".
- `spec/21-app/76-cli-log-and-ipc.md` §"IPC protocol" (drop-dir names,
  atomic rename, ack semantics) - re-used through `BE.cli.common.ipc`.
- `BE/cli/processing/commands/evaluate.py::handle` - single-frame
  contract; watch treats it as the pure kernel and never re-implements
  bundle loading or verdict shaping.

Idempotency scope: `spec/21-app/75` acceptance #2 pins the key on
`(RunId, Seq)`. The persistent `ipc_messages` table lands at Plan 90
Step 87 (`ResultReady` writer + Task-DB row). Until then we enforce
idempotency two ways:

1. On-disk: `ipc.ack(path)` renames `<ulid>.msg.json` to `.msg.ack.json`,
   so the same file cannot be re-picked by `receive()` in a later
   invocation (spec 76 §"IPC protocol").
2. In-process: a `set[(RunId, Seq)]` guards against a producer that
   emits duplicate messages under different ULIDs within one watch run.

We do NOT invent a stand-in DB row. Doing so would fork the schema from
Step 87 and violate the honesty rule (`evaluate.py:15`).

Bundle honesty: `evaluate.handle` raises `E_BE_UNAVAILABLE` for bundles
with Active/Silent rules (rule engine not wired until Step 79+). Watch
captures that per-message into `Failures[]` and keeps polling; a
half-wired engine must never abort the tail loop, but it must also
never disguise itself as a `Pass` verdict downstream.

Concurrency: `--max-workers 1` by default. `receive()` returns oldest
first, so serial processing preserves the FIFO invariant from
`spec/21-app/17-parallelism-guarantees.md` §5. Higher fan-out is
intentionally out of scope here; parallel watchers belong in Plan 90
Step 65+ once IPC row locking is implemented.

Exit conditions (first-hit wins):
- `--duration <sec>` elapsed (0 = infinite).
- `--max-messages <N>` processed (0 = unlimited).
- `--idle-exit <sec>` of consecutive empty polls (0 = never).
- `SIGINT` / `SIGTERM` -> flush the current in-flight message, then
  exit `Ok` with the aggregate envelope.

Not in scope for this step (tracked elsewhere in Plan 90):
- `ResultReady` DB row + `ipc_messages` idempotency table (Step 87).
- Multi-process fan-out and IPC row locking (Step 65+).
- Rule engine integration (Steps 79-87).
"""

from __future__ import annotations

import argparse
import signal
import time
from pathlib import Path
from typing import Any

from BE.cli.common import ipc as _ipc
from BE.cli.common.paths import resolve_root
from BE.cli.common.session import SessionCtx
from BE.cli.processing.commands import evaluate as _evaluate
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_DEFAULT_IN_DIR = "processing-in"
_DEFAULT_OUT_DIR = "processing-out"
_MIN_POLL = 0.05  # 50 ms floor keeps the loop from pegging a CPU on empty dirs.
_MAX_POLL = 60.0


def configure(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--bundle", required=True,
                        help="Rule bundle JSON applied to every FrameReady message.")
    parser.add_argument("--ipc-root", default=None,
                        help="Override APP_IPC_ROOT (env / OS default otherwise).")
    parser.add_argument("--in-dir", default=_DEFAULT_IN_DIR,
                        help=f"Drop-dir name to poll (default: {_DEFAULT_IN_DIR}).")
    parser.add_argument("--out-dir", default=_DEFAULT_OUT_DIR,
                        help=f"Drop-dir to emit ResultReady into (default: {_DEFAULT_OUT_DIR}).")
    parser.add_argument("--results-dir", default=None,
                        help="Append every ResultRecord to <results-dir>/<RunId>.jsonl.")
    parser.add_argument("--poll-interval", type=float, default=0.5,
                        help=f"Seconds between polls when idle [{_MIN_POLL}..{_MAX_POLL}].")
    parser.add_argument("--duration", type=float, default=0.0,
                        help="Hard cap in seconds; 0 = run until signal or --max-messages.")
    parser.add_argument("--max-messages", type=int, default=0,
                        help="Exit after N processed messages; 0 = unlimited.")
    parser.add_argument("--idle-exit", type=float, default=0.0,
                        help="Exit after this many consecutive idle seconds; 0 = never.")
    parser.add_argument(
        "--mode", choices=("auto", "short-circuit", "full"), default="auto",
        help=(
            "Validation order mode forwarded to every per-frame evaluate call "
            "(spec 21-app/49 §4). 'auto' defers to the bundle's validationMode; "
            "'short-circuit' and 'full' override the bundle for the whole watch "
            "session and are recorded in watch.begin logs."
        ),
    )



# --- helpers ---------------------------------------------------------------


def _install_signal_shutdown() -> dict[str, bool]:
    """Register SIGINT/SIGTERM handlers that flip a shared `stop` flag.

    We deliberately do NOT raise `KeyboardInterrupt` from the handler:
    that would tear down mid-write and leave a half-processed FrameReady
    unacked but its ResultReady already sent. A cooperative flag lets
    the main loop finish the in-flight message before returning.
    """
    state = {"stop": False}

    def _handler(signum: int, _frame: Any) -> None:  # noqa: ANN401
        _ = signum
        state["stop"] = True

    # Best-effort: SIGTERM does not exist on Windows console apps.
    for sig_name in ("SIGINT", "SIGTERM"):
        sig = getattr(signal, sig_name, None)
        if sig is None:
            continue
        try:
            signal.signal(sig, _handler)
        except (ValueError, OSError):
            # ValueError: not in main thread (tests). Fine to skip; the
            # duration/max-messages guards still bound the loop.
            pass
    return state


def _process_one(
    msg: _ipc.Message,
    ns: argparse.Namespace,
    ctx: SessionCtx,
    ipc_root: Path,
    out_dir: str,
    results_dir: Path | None,
) -> dict[str, Any]:
    """Evaluate one FrameReady message and emit its ResultReady.

    Returns a dict summarising the outcome for the aggregate envelope.
    Never raises: per-message failures are captured so the tail loop
    can keep draining the drop-dir.
    """
    payload = msg.payload or {}
    frame_path = payload.get("FramePath")
    if not isinstance(frame_path, str) or not frame_path:
        # Malformed payload should have been rejected by `ipc.receive`,
        # but defence-in-depth: surface as a Failure and ack so the
        # poison message does not spin forever.
        _ipc.ack(msg.path)
        return {
            "MsgId": msg.msg_id,
            "RunId": msg.run_id,
            "Seq": msg.seq,
            "Ok": False,
            "Code": ErrorCode.E_IPC_PAYLOAD_INVALID.value,
            "Message": "FrameReady missing FramePath",
        }

    sub_ns = argparse.Namespace(
        frame=frame_path,
        bundle=ns.bundle,
        run_id=msg.run_id,
        results_dir=str(results_dir),
        mode=getattr(ns, "mode", "auto"),
    )

    try:
        recs = _evaluate.handle(sub_ns, ctx)
    except AppError as exc:
        # Per-message failure. Ack the source to satisfy the idempotency
        # invariant (same message must not be redelivered), then log.
        _ipc.ack(msg.path)
        ctx.logger.log(
            "WARN", "watch.frame.failed",
            f"frame failed: {exc.code.value}: {exc}",
            code=exc.code.value,
            ctx={
                "MsgId": msg.msg_id, "RunId": msg.run_id, "Seq": msg.seq,
                "FramePath": frame_path,
            },
        )
        return {
            "MsgId": msg.msg_id,
            "RunId": msg.run_id,
            "Seq": msg.seq,
            "Ok": False,
            "Code": exc.code.value,
            "Message": str(exc),
        }

    rec = recs[0]
    # ResultReady payload per BE/cli/common/ipc_models.py::ResultReadyPayload.
    summary = rec.get("Summary", {}) or rec.get("RuleSet", {}) or {}
    # Plan 90 Step 92: promote per-rule ErrorCode (e.g. E_RULE_TIMEOUT).
    from BE.cli.processing.commands.evaluate import _promote_error_code
    promoted = _promote_error_code(rec.get("Judgments") or [])
    rr_payload: dict[str, Any] = {
        "ResultsPath": str(results_dir / f"{msg.run_id}.jsonl"),
        "RunId": msg.run_id,
        "FrameSeq": int(msg.seq),
        "Decision": str(rec.get("Verdict", "Pass")).lower(),
        "RuleCount": int(summary.get("RuleCount", 0)),
        "PassCount": int(summary.get("PassCount", 0)),
        "FailCount": int(summary.get("FailCount", 0)),
        "ErrorCount": int(summary.get("ErrorCount", 0)),
    }
    if promoted is not None:
        rr_payload["ErrorCode"] = promoted

    _ipc.send(
        ipc_root, out_dir, "ResultReady", rr_payload,
        run_id=msg.run_id, from_="processing-cli", to="worker-cli",
        seq=int(msg.seq),
    )
    _ipc.ack(msg.path)
    ctx.logger.log(
        "INFO", "watch.frame.done",
        f"processed msg={msg.msg_id} run={msg.run_id} seq={msg.seq}",
        ctx={"MsgId": msg.msg_id, "RunId": msg.run_id, "Seq": msg.seq},
    )
    return {
        "MsgId": msg.msg_id,
        "RunId": msg.run_id,
        "Seq": msg.seq,
        "Ok": True,
        "Decision": rr_payload["Decision"],
    }


# --- poison-safe drain -----------------------------------------------------


from dataclasses import dataclass as _dataclass


@_dataclass(frozen=True)
class _PoisonMessage:
    """A file that could not be parsed as a valid IPC Message.

    We capture the on-disk path + the originating `AppError` so the
    watch loop can ack the poison file (spec 75 §Acceptance #2: the loop
    MUST continue on per-message failure) while still preserving the
    exact wire code for the aggregate envelope.
    """

    path: Path
    error: AppError


def _poison_safe_receive(root: Path, in_dir: str):
    """Yield `Message` objects OR `_PoisonMessage` per source file.

    `_ipc.receive` is a generator that raises `AppError` the moment it
    hits an unreadable JSON body or an unknown `Kind`. Bubbling that
    out of the watch loop would abort the whole poll and leave sibling
    healthy messages stuck behind the poison, violating spec 75
    §Acceptance #2. We wrap `receive` so one bad file only takes itself
    down: on AppError, we identify the alphabetically-first remaining
    `*.msg.json` (which is what `receive` sorted first and choked on),
    yield it as `_PoisonMessage` for the caller to ack, then restart
    the underlying generator to drain the rest.
    """
    drop = root / in_dir
    if not drop.exists():
        return
    while True:
        gen = _ipc.receive(root, in_dir, kind_filter=("FrameReady",))
        try:
            yield from gen
            return
        except AppError as exc:
            live = sorted(drop.glob("*.msg.json"), key=lambda p: p.name)
            if not live:
                return
            yield _PoisonMessage(path=live[0], error=exc)
            # Caller acks the poison; loop restarts `receive` to
            # continue past it. If the caller did NOT ack (bug), the
            # next iteration would raise on the same file and we'd
            # infinite-loop, so ack in the caller is load-bearing.


# --- handler ---------------------------------------------------------------



def handle(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    # Validate flags first: cheap failures beat "started polling then crashed".
    if not (_MIN_POLL <= float(ns.poll_interval) <= _MAX_POLL):
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            f"--poll-interval must be within [{_MIN_POLL}, {_MAX_POLL}] seconds",
            {"PollInterval": float(ns.poll_interval)},
        )
    if float(ns.duration) < 0 or int(ns.max_messages) < 0 or float(ns.idle_exit) < 0:
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            "--duration, --max-messages, --idle-exit must be >= 0",
            {
                "Duration": float(ns.duration),
                "MaxMessages": int(ns.max_messages),
                "IdleExit": float(ns.idle_exit),
            },
        )

    ipc_root = resolve_root("ipc", override=ns.ipc_root, ensure=True)
    in_dir = str(ns.in_dir)
    out_dir = str(ns.out_dir)
    # Make sure the OUT drop-dir exists before we start; a failed mkdir
    # halfway through the loop would be a much worse failure mode.
    (ipc_root / out_dir).mkdir(parents=True, exist_ok=True)
    # ResultsPath is a required, non-empty field on ResultReadyPayload
    # (spec 76 §"Payload shapes" -> BE/cli/common/ipc_models.py). If the
    # operator did not pass --results-dir we still need somewhere to
    # persist ResultRecords so the sibling ResultReady message can point
    # at a real file rather than "". Default to `<ipc_root>/results/`.
    results_dir = (
        Path(ns.results_dir).expanduser()
        if ns.results_dir else (ipc_root / "results")
    )
    results_dir.mkdir(parents=True, exist_ok=True)

    stop_state = _install_signal_shutdown()
    seen: set[tuple[str, int]] = set()
    processed: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    skipped_duplicates = 0

    start = time.monotonic()
    idle_since: float | None = None
    poll = float(ns.poll_interval)

    ctx.logger.log(
        "INFO", "watch.begin",
        f"watch in={in_dir} out={out_dir} bundle={ns.bundle} mode={ns.mode}",
        ctx={"IpcRoot": str(ipc_root), "InDir": in_dir, "OutDir": out_dir,
             "Mode": getattr(ns, "mode", "auto")},
    )


    def _should_stop() -> bool:
        if stop_state["stop"]:
            return True
        if ns.duration > 0 and (time.monotonic() - start) >= float(ns.duration):
            return True
        return bool(ns.max_messages > 0 and len(processed) + len(failures) >= int(ns.max_messages))

    while not _should_stop():
        drained_any = False
        for item in _poison_safe_receive(ipc_root, in_dir):
            if _should_stop():
                break
            drained_any = True
            if isinstance(item, _PoisonMessage):
                # Parse / kind / JSON failure on a single file. Ack it so
                # the tail loop can never spin on the same corrupt payload,
                # and record it as a Failure with its own AppError code so
                # the caller can see EXACTLY which invariant broke.
                # (spec 76 §"Message lifecycle": ack semantics; spec 75
                # §Acceptance #2: the loop must keep draining on error.)
                try:
                    _ipc.ack(item.path)
                except AppError as ack_exc:
                    ctx.logger.log(
                        "ERROR", "watch.poison.ack_failed",
                        f"failed to ack poison message {item.path.name}: {ack_exc}",
                        code=ack_exc.code.value,
                        ctx={"Path": str(item.path)},
                    )
                ctx.logger.log(
                    "WARN", "watch.poison",
                    f"poison IPC file acked: {item.path.name}: "
                    f"{item.error.code.value}: {item.error}",
                    code=item.error.code.value,
                    ctx={"Path": str(item.path), "Reason": str(item.error)},
                )
                failures.append({
                    "MsgId": "",
                    "RunId": "",
                    "Seq": 0,
                    "Ok": False,
                    "Code": item.error.code.value,
                    "Message": str(item.error),
                    "Path": str(item.path),
                })
                continue

            msg = item
            key = (msg.run_id, int(msg.seq))
            if key in seen:
                # Duplicate under a different ULID: ack and skip.
                skipped_duplicates += 1
                _ipc.ack(msg.path)
                continue
            seen.add(key)
            outcome = _process_one(msg, ns, ctx, ipc_root, out_dir, results_dir)
            (processed if outcome["Ok"] else failures).append(outcome)

        now = time.monotonic()
        if drained_any:
            idle_since = None
        else:
            if idle_since is None:
                idle_since = now
            if ns.idle_exit > 0 and (now - idle_since) >= float(ns.idle_exit):
                break
            # Sleep in small slices so signal handlers respond promptly.
            time.sleep(min(poll, 0.5))

    duration = round(time.monotonic() - start, 3)
    ctx.logger.log(
        "INFO", "watch.done",
        f"watch complete processed={len(processed)} failed={len(failures)} "
        f"duplicates={skipped_duplicates} duration={duration}s",
        ctx={
            "Processed": len(processed),
            "Failed": len(failures),
            "Duplicates": skipped_duplicates,
            "DurationSec": duration,
        },
    )
    return {
        "IpcRoot": str(ipc_root),
        "InDir": in_dir,
        "OutDir": out_dir,
        "Processed": len(processed),
        "Failed": len(failures),
        "SkippedDuplicates": skipped_duplicates,
        "DurationSec": duration,
        "Results": processed,
        "Failures": failures,
    }
