"""Background calibration runner for the validation worker.

Runs `worker/calibrate.py` as a subprocess so its stdout can be scraped
line-by-line into a progress model without importing/monkey-patching it.
The service exposes three operations used by the FastAPI shim:

  start()     -> kicks off a run when idle, no-op when already running.
  status()    -> returns the current job state (idle/running/done/error).
  report()    -> returns the parsed calibration-report.json when present.

A single-slot design is intentional: recalibration is a rare admin action
and running two at once would corrupt calibration-report.json.
"""
from __future__ import annotations

import json
import subprocess
import sys
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).parent
REPORT_PATH = ROOT / "calibration-report.json"
CALIBRATE_PATH = ROOT / "calibrate.py"


class _Job:
    def __init__(self) -> None:
        self.state: str = "idle"  # idle | running | done | error
        self.started_at: Optional[float] = None
        self.finished_at: Optional[float] = None
        self.lines: List[str] = []
        self.error: Optional[str] = None
        self.job_id: Optional[str] = None


_lock = threading.Lock()
_job = _Job()


def _run(job: _Job) -> None:
    try:
        proc = subprocess.Popen(
            [sys.executable, "-u", str(CALIBRATE_PATH)],
            cwd=str(ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        assert proc.stdout is not None
        for line in proc.stdout:
            job.lines.append(line.rstrip())
            if len(job.lines) > 200:
                del job.lines[0 : len(job.lines) - 200]
        code = proc.wait()
        job.finished_at = time.time()
        if code == 0:
            job.state = "done"
        else:
            job.state = "error"
            job.error = f"calibrate.py exited with code {code}"
    except Exception as exc:  # pragma: no cover - defensive
        job.state = "error"
        job.error = f"{type(exc).__name__}: {exc}"
        job.finished_at = time.time()


def start() -> Dict[str, Any]:
    """Start a run if none is active; return the current job snapshot."""
    with _lock:
        if _job.state == "running":
            return {"status": "already-running", **_snapshot()}
        _job.__init__()  # reset all fields
        _job.state = "running"
        _job.started_at = time.time()
        _job.job_id = f"cal-{int(_job.started_at)}"
        thread = threading.Thread(target=_run, args=(_job,), daemon=True)
        thread.start()
        return {"status": "started", **_snapshot()}


def _snapshot() -> Dict[str, Any]:
    total = 5  # one line per kind in calibrate.py's summary loop
    step = min(total, max(0, len(_job.lines) - 1))  # header line first
    return {
        "state": _job.state,
        "jobId": _job.job_id,
        "startedAt": _job.started_at,
        "finishedAt": _job.finished_at,
        "progress": {"step": step, "total": total, "message": _job.lines[-1] if _job.lines else ""},
        "lines": list(_job.lines),
        "error": _job.error,
    }


def status() -> Dict[str, Any]:
    with _lock:
        return _snapshot()


def report() -> Optional[Dict[str, Any]]:
    if not REPORT_PATH.exists():
        return None
    return json.loads(REPORT_PATH.read_text())