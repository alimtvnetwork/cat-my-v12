"""SQLite implementation of RulesRepo for Day 1 MVP persistence."""

from __future__ import annotations

import json
import logging
import sqlite3
import traceback
import uuid
from datetime import UTC, datetime
from typing import Any

from BE.app.domain.cat_rule import CatRule
from BE.app.domain.rule_set import DraftMeta, RuleSetEnvelope, parse_envelope
from BE.db.connections import get_root_conn
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_log = logging.getLogger(__name__)

# Self-healing DDL for the Recipe table. Mirrors
# BE/db/migrations/root/0020_recipes.sql exactly (table + index only).
# SchemaVersion bookkeeping stays with bin/db-bootstrap.py: a later
# bootstrap run sees version 20 unapplied and re-runs 0020, which is a
# no-op for the table and records the version row.
_RECIPE_DDL = """
CREATE TABLE IF NOT EXISTS Recipe (
  RecipeId     INTEGER PRIMARY KEY AUTOINCREMENT,
  RuleSetId    INTEGER NOT NULL,
  Name         TEXT    NOT NULL,
  Version      INTEGER NOT NULL CHECK (Version >= 0),
  IsEnabled    INTEGER NOT NULL DEFAULT 1 CHECK (IsEnabled IN (0, 1)),
  PayloadJson  TEXT    NOT NULL,
  CreatedAt    INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
  UpdatedAt    INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
);

CREATE UNIQUE INDEX IF NOT EXISTS IdxRecipe_RuleSetId
  ON Recipe (RuleSetId);
"""


def _ensure_recipe_table(conn: sqlite3.Connection) -> None:
    """Create the Recipe table when a fresh root.db lacks it (spec 04 §3.2).

    BE/db/connections.py opens connections only and never runs DDL, so a
    backend started against an unmigrated data dir otherwise fails its
    first Recipe query with "no such table: Recipe" (screenshot
    mr6_-1EdpFtG). The sqlite_master probe keeps the per-call cost to
    one cheap query when the table already exists.
    """

    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='Recipe'"
    ).fetchone()
    has_recipe_table = row is not None

    if has_recipe_table:
        return

    try:
        conn.executescript(_RECIPE_DDL)
    except sqlite3.Error as exc:
        raise AppError(
            ErrorCode.E_BE_INTERNAL,
            f"Recipe table bootstrap failed: {exc}; run python bin/db-bootstrap.py",
            {"provider": "SqliteRulesRepo"},
        ) from exc


def _record_repo_failure(
    *,
    operation: str,
    rule_set_id: int | None,
    error: AppError,
) -> None:
    """Best-effort persistence of a repo failure into the wave-1 Error table.

    Never raises: a persistence failure (e.g. an unmigrated task.db with
    no Error table yet) must never mask the original SAVE/LOAD error,
    which still travels via the envelope to the frontend error store and
    the POST /errors sync path, where the CLI errors command can read it.
    """

    try:
        from BE.app.db.writers import error as error_writer
        from BE.db.connections import get_task_conn

        record = {
            "CorrelationId": uuid.uuid4().hex,
            "Code": error.code.name,
            "Level": "ERROR",
            "Message": str(error),
            "StackTrace": traceback.format_exc(),
            "Endpoint": f"SqliteRulesRepo.{operation}",
            "TriggerComponent": "SqliteRulesRepo",
            "Details": {"provider": "SqliteRulesRepo", "RuleSetId": rule_set_id},
        }
        task_conn = get_task_conn()

        try:
            error_writer.write_errors(task_conn, errors=[record])
        finally:
            task_conn.close()
    except Exception as exc:
        _log.warning("rules_repo.error_record_failed error=%s", exc)


class SqliteRulesRepo:
    def __init__(self) -> None:
        self.conn = get_root_conn()
        self._ensure_recipe_table()

    def _ensure_recipe_table(self) -> None:
        """Self-healing bootstrap: ensure Recipe table exists before executing queries."""
        try:
            _ensure_recipe_table(self.conn)
        except Exception as exc:
            _log.warning("rules_repo.recipe_ensure_deferred error=%s", exc)

    def list_rules(self) -> list[CatRule]:
        return []

    def get_rule(self, rule_id: int) -> CatRule:
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"rule {rule_id} not found",
            {"rule_id": rule_id, "provider": "SqliteRulesRepo"},
        )

    def _fetch_existing_version(self, rule_set_id: int) -> int | None:
        cur = self.conn.execute(
            "SELECT Version FROM Recipe WHERE RuleSetId = ?",
            (rule_set_id,),
        )
        row = cur.fetchone()
        return row[0] if row is not None else None

    def _resolve_next_version(
        self, client_version: int, prior_version: int | None, rule_set_id: int
    ) -> int:
        if prior_version is not None:
            if client_version < prior_version:
                raise AppError(
                    ErrorCode.E_BE_CONFLICT,
                    "rule set version is behind server",
                    {
                        "RuleSetId": rule_set_id,
                        "client_version": client_version,
                        "server_version": prior_version,
                    },
                )
            return prior_version + 1
        return client_version + 1

    def _commit_envelope(self, envelope: RuleSetEnvelope, new_version: int) -> RuleSetEnvelope:
        now_iso = datetime.now(UTC).isoformat()
        dm = DraftMeta(ClientId=envelope.DraftMeta.ClientId, UpdatedAt=now_iso, Origin="server")
        return RuleSetEnvelope(
            SchemaVersion=envelope.SchemaVersion,
            RuleSetId=envelope.RuleSetId,
            Name=envelope.Name,
            Version=new_version,
            Enabled=envelope.Enabled,
            Rules=envelope.Rules,
            DraftMeta=dm,
        )

    def _upsert_recipe(self, committed: RuleSetEnvelope, has_existing: bool) -> None:
        payload_json = json.dumps(committed.to_wire())
        is_enabled = 1 if committed.Enabled else 0
        if has_existing:
            self.conn.execute(
                "UPDATE Recipe SET Name = ?, Version = ?, IsEnabled = ?, PayloadJson = ?, "
                "UpdatedAt = CAST(strftime('%s', 'now') AS INTEGER) WHERE RuleSetId = ?",
                (committed.Name, committed.Version, is_enabled, payload_json, committed.RuleSetId),
            )
        else:
            self.conn.execute(
                "INSERT INTO Recipe (RuleSetId, Name, Version, IsEnabled, PayloadJson) "
                "VALUES (?, ?, ?, ?, ?)",
                (committed.RuleSetId, committed.Name, committed.Version, is_enabled, payload_json),
            )

    def save_rule_set(self, envelope: RuleSetEnvelope) -> RuleSetEnvelope:
        self._ensure_recipe_table()
        try:
            prior_version = self._fetch_existing_version(envelope.RuleSetId)
            has_existing = prior_version is not None
            new_version = self._resolve_next_version(
                envelope.Version, prior_version, envelope.RuleSetId
            )
            committed = self._commit_envelope(envelope, new_version)
            self._upsert_recipe(committed, has_existing=has_existing)
            return committed
        except AppError as exc:
            _record_repo_failure(
                operation="save_rule_set",
                rule_set_id=envelope.RuleSetId,
                error=exc,
            )
            raise
        except Exception as e:
            wrapped = AppError(
                ErrorCode.E_BE_INTERNAL,
                f"Failed to save recipe: {e}",
                {"provider": "SqliteRulesRepo"},
            )
            _record_repo_failure(
                operation="save_rule_set",
                rule_set_id=envelope.RuleSetId,
                error=wrapped,
            )
            raise wrapped from e

    def get_rule_set(self, rule_set_id: int) -> RuleSetEnvelope:
        self._ensure_recipe_table()
        try:
            cur = self.conn.execute(
                "SELECT PayloadJson FROM Recipe WHERE RuleSetId = ?",
                (rule_set_id,),
            )
            row = cur.fetchone()
            if row is None:
                raise AppError(
                    ErrorCode.E_BE_NOT_FOUND,
                    f"rule set {rule_set_id} not found",
                    {"RuleSetId": rule_set_id, "provider": "SqliteRulesRepo"},
                )
            payload = json.loads(row[0])
            return parse_envelope(payload)
        except AppError as exc:
            if exc.code is not ErrorCode.E_BE_NOT_FOUND:
                _record_repo_failure(
                    operation="get_rule_set",
                    rule_set_id=rule_set_id,
                    error=exc,
                )
            raise
        except Exception as e:
            wrapped = AppError(
                ErrorCode.E_BE_INTERNAL,
                f"Failed to load recipe: {e}",
                {"provider": "SqliteRulesRepo"},
            )
            _record_repo_failure(
                operation="get_rule_set",
                rule_set_id=rule_set_id,
                error=wrapped,
            )
            raise wrapped from e
