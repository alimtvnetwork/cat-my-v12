"""SQLite implementation of ResultsRepo for Day 1 MVP TaskDb persistence."""

from __future__ import annotations

import sqlite3
import time
from typing import Any

from BE.db.connections import get_task_conn
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


class SqliteResultsRepo:
    def __init__(self, conn: sqlite3.Connection | None = None) -> None:
        self.conn = conn if conn is not None else get_task_conn()

    def create_run_session(
        self,
        run_id: str,
        task_id: str | None = None,
        mode: str = "auto",
        verdict: str = "Pass",
    ) -> int:
        """Create a RunSession record. Returns RunSessionId."""
        try:
            cur = self.conn.execute(
                "INSERT INTO RunSession (RunId, TaskId, Verdict, Mode) VALUES (?, ?, ?, ?)",
                (run_id, task_id, verdict, mode),
            )
            return cur.lastrowid
        except Exception as e:
            raise AppError(
                ErrorCode.E_BE_INTERNAL,
                f"Failed to create run session: {e}",
                {"provider": "SqliteResultsRepo", "run_id": run_id},
            ) from e

    def create_frame(
        self,
        run_id: str,
        frame_index: int = 0,
        width: int = 1920,
        height: int = 1080,
        pixel_format: str = "Mono8",
        byte_size: int = 2073600,
        sha256: str = "0" * 64,
    ) -> int:
        """Create Capture and Frame records for a run. Returns FrameId."""
        try:
            frame_key = f"{run_id}_frame_{frame_index}"
            cap_key = f"{run_id}_cap_{frame_index}"
            now = int(time.time())
            cur_cap = self.conn.execute(
                "INSERT INTO Capture (RunId, CaptureSessionId, FrameKey, Width, Height, PixelFormat, ByteSize, Sha256, CapturedAt) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (run_id, 1, cap_key, width, height, pixel_format, byte_size, sha256, now),
            )
            capture_id = cur_cap.lastrowid
            cur_frame = self.conn.execute(
                "INSERT INTO Frame (CaptureId, FrameIndex, FrameKey, Width, Height, PixelFormat, ByteSize, Sha256, DerivedAt) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (capture_id, frame_index, frame_key, width, height, pixel_format, byte_size, sha256, now),
            )
            return cur_frame.lastrowid
        except Exception as e:
            raise AppError(
                ErrorCode.E_BE_INTERNAL,
                f"Failed to create frame: {e}",
                {"provider": "SqliteResultsRepo", "run_id": run_id},
            ) from e

    def save_result(
        self,
        run_id: str,
        frame_id: int,
        bundle_id: int = 1,
        bundle_version: int = 1,
        decision: str = "PASS",
        score_percent: float | None = None,
        duration_ms: int = 0,
    ) -> int:
        """Save a Result record referencing FrameId. Returns ResultId."""
        try:
            cur = self.conn.execute(
                "INSERT INTO Result (RunId, FrameId, RuleBundleId, RuleBundleVersion, Decision, ScorePercent, DurationMs) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
                (run_id, frame_id, bundle_id, bundle_version, decision, score_percent, duration_ms),
            )
            return cur.lastrowid
        except Exception as e:
            raise AppError(
                ErrorCode.E_BE_INTERNAL,
                f"Failed to save result: {e}",
                {"provider": "SqliteResultsRepo", "run_id": run_id, "frame_id": frame_id},
            ) from e

    def get_run_sessions(self, limit: int = 10) -> list[dict[str, Any]]:
        """Retrieve recent RunSession rows."""
        try:
            cur = self.conn.execute(
                "SELECT RunSessionId, RunId, TaskId, Verdict, Mode, PersistedAt FROM RunSession ORDER BY PersistedAt DESC LIMIT ?",
                (limit,),
            )
            rows = cur.fetchall()
            return [
                {
                    "RunSessionId": r[0],
                    "RunId": r[1],
                    "TaskId": r[2],
                    "Verdict": r[3],
                    "Mode": r[4],
                    "PersistedAt": r[5],
                }
                for r in rows
            ]
        except Exception as e:
            raise AppError(
                ErrorCode.E_BE_INTERNAL,
                f"Failed to fetch run sessions: {e}",
                {"provider": "SqliteResultsRepo"},
            ) from e

    def get_results_for_run(self, run_id: str) -> list[dict[str, Any]]:
        """Retrieve results for a given RunId."""
        try:
            cur = self.conn.execute(
                "SELECT ResultId, RunId, FrameId, RuleBundleId, RuleBundleVersion, Decision, ScorePercent, DurationMs, EvaluatedAt "
                "FROM Result WHERE RunId = ?",
                (run_id,),
            )
            rows = cur.fetchall()
            return [
                {
                    "ResultId": r[0],
                    "RunId": r[1],
                    "FrameId": r[2],
                    "RuleBundleId": r[3],
                    "RuleBundleVersion": r[4],
                    "Decision": r[5],
                    "ScorePercent": r[6],
                    "DurationMs": r[7],
                    "EvaluatedAt": r[8],
                }
                for r in rows
            ]
        except Exception as e:
            raise AppError(
                ErrorCode.E_BE_INTERNAL,
                f"Failed to fetch results for run: {e}",
                {"provider": "SqliteResultsRepo", "run_id": run_id},
            ) from e
