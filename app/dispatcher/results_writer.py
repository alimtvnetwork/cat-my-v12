"""Append-only results JSONL writer with size rotation (spec 24 §4, §7)."""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from app.core.telemetry.clock import monotonic_ms
from app.core.telemetry.log_record import StructuredLogger
from app.core.telemetry.metrics import MetricRegistry, record_processing_ms

RESULT_SCHEMA_VERSION = 1
MAX_RESULT_BYTES = 256 * 1024 * 1024


class ResultWriteError(RuntimeError):
    code = "E_RESULTS_WRITE"


class ResultRotateError(RuntimeError):
    code = "E_RESULTS_ROTATE_MISSED"


class ResultReferencePathError(RuntimeError):
    code = "E_RESULT_REFERENCE_PATH"


class ResultSchemaError(RuntimeError):
    code = "E_RESULT_SCHEMA"


def append_result(results_dir: Path, result: dict[str, Any], logger: StructuredLogger, metrics: MetricRegistry) -> Path:
    results_dir.mkdir(parents=True, exist_ok=True)
    line = _serialize(result)
    live = results_dir / f"{result['runSessionId']}.jsonl"
    _rotate_logged(live, len(line), logger)
    start = monotonic_ms()
    _append_logged(live, line, logger)
    _record_metrics(result, monotonic_ms() - start, metrics)
    logger.emit("INFO", "result appended", None, {"ResultId": result["resultId"], "Bytes": len(line)})
    return live


def write_summary_atomic(results_dir: Path, run_session_id: str, summary: dict[str, Any]) -> Path:
    results_dir.mkdir(parents=True, exist_ok=True)
    final = results_dir / f"{run_session_id}.summary.json"
    tmp = final.with_name(final.name + ".part")
    payload = json.dumps(summary, indent=2, sort_keys=True).encode("utf-8") + b"\n"
    _write_part(tmp, payload)
    os.replace(tmp, final)
    return final


def iter_result_lines(results_dir: Path, run_session_id: str) -> list[str]:
    files = sorted(results_dir.glob(f"{run_session_id}.jsonl.[0-9][0-9][0-9]"))
    files.append(results_dir / f"{run_session_id}.jsonl")
    return [line for f in files if f.exists() for line in _read_complete_lines(f)]


def _serialize(result: dict[str, Any]) -> bytes:
    _validate_result(result)
    payload = json.dumps(result, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return payload + b"\n"


def _validate_result(result: dict[str, Any]) -> None:
    if result.get("schemaVersion") != RESULT_SCHEMA_VERSION:
        raise ResultSchemaError(f"schemaVersion={result.get('schemaVersion')}")
    for judgment in result.get("judgments", []):
        _validate_judgment_reference(judgment)


def _validate_judgment_reference(judgment: dict[str, Any]) -> None:
    forbidden = {"referencePath", "referenceUrl", "referenceBytes"}
    if forbidden.intersection(judgment):
        raise ResultReferencePathError(str(sorted(forbidden.intersection(judgment))))


def _rotate_if_needed(live: Path, next_bytes: int, logger: StructuredLogger) -> None:
    if live.exists() is False:
        return
    current = live.stat().st_size
    if current + next_bytes <= MAX_RESULT_BYTES:
        return
    part = _next_part(live)
    _fsync_file(live)
    os.replace(live, part)
    logger.emit("INFO", "results.rotate", "I_RESULTS_ROTATED", {"Part": part.name, "Bytes": current})


def _rotate_logged(live: Path, next_bytes: int, logger: StructuredLogger) -> None:
    try:
        _rotate_if_needed(live, next_bytes, logger)
    except OSError as err:
        logger.emit("ERROR", "results rotation failed", "E_RESULTS_ROTATE_MISSED", {"Path": str(live), "Err": str(err)})
        raise ResultRotateError(str(err)) from err


def _append_logged(path: Path, line: bytes, logger: StructuredLogger) -> None:
    try:
        _append_line(path, line)
    except OSError as err:
        logger.emit("ERROR", "result append failed", "E_RESULTS_WRITE", {"Path": str(path), "Err": str(err)})
        raise ResultWriteError(str(err)) from err


def _next_part(live: Path) -> Path:
    for idx in range(1, 1000):
        part = live.with_name(f"{live.name}.{idx:03d}")
        if part.exists() is False:
            return part
    raise ResultRotateError(live.name)


def _append_line(path: Path, line: bytes) -> None:
    fd = os.open(path, os.O_CREAT | os.O_APPEND | os.O_WRONLY, 0o644)
    try:
        os.write(fd, line)
        os.fsync(fd)
    finally:
        os.close(fd)


def _write_part(path: Path, payload: bytes) -> None:
    fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
    try:
        os.write(fd, payload)
        os.fsync(fd)
    finally:
        os.close(fd)


def _fsync_file(path: Path) -> None:
    with path.open("rb") as handle:
        os.fsync(handle.fileno())


def _record_metrics(result: dict[str, Any], elapsed_ms: int, metrics: MetricRegistry) -> None:
    labels = {"task_id": result["taskId"], "verdict": result["verdict"]}
    metrics.record("ca.pipeline.frames_processed_total", 1, labels)
    for judgment in result.get("judgments", []):
        record_processing_ms(metrics, result["taskId"], judgment["ruleKind"], elapsed_ms)


def _read_complete_lines(path: Path) -> list[str]:
    data = path.read_bytes()
    if data.endswith(b"\n") is False:
        data = data.rsplit(b"\n", 1)[0] + b"\n"
    return data.decode("utf-8").splitlines()
