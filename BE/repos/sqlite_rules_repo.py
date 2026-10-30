"""SQLite implementation of RulesRepo for Day 1 MVP persistence."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from BE.app.domain.cat_rule import CatRule
from BE.app.domain.rule_set import DraftMeta, RuleSetEnvelope, parse_envelope
from BE.db.connections import get_root_conn
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


class SqliteRulesRepo:
    def __init__(self) -> None:
        self.conn = get_root_conn()
        self._ensure_recipe_table()

    def _ensure_recipe_table(self) -> None:
        """Self-healing bootstrap: ensure Recipe table exists before executing queries."""
        self.conn.executescript(
            """
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
        )

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
        except AppError:
            raise
        except Exception as e:
            raise AppError(
                ErrorCode.E_BE_INTERNAL,
                f"Failed to save recipe: {e}",
                {"provider": "SqliteRulesRepo"},
            ) from e

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
        except AppError:
            raise
        except Exception as e:
            raise AppError(
                ErrorCode.E_BE_INTERNAL,
                f"Failed to load recipe: {e}",
                {"provider": "SqliteRulesRepo"},
            ) from e
