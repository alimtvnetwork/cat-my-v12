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

    def list_rules(self) -> list[CatRule]:
        return []

    def get_rule(self, rule_id: int) -> CatRule:
        raise AppError(
            ErrorCode.E_BE_NOT_FOUND,
            f"rule {rule_id} not found",
            {"rule_id": rule_id, "provider": "SqliteRulesRepo"},
        )

    def save_rule_set(self, envelope: RuleSetEnvelope) -> RuleSetEnvelope:
        try:
            cur = self.conn.execute(
                "SELECT Version FROM Recipe WHERE RuleSetId = ?",
                (envelope.RuleSetId,),
            )
            row = cur.fetchone()
            if row is not None:
                prior_version = row[0]
                if envelope.Version < prior_version:
                    raise AppError(
                        ErrorCode.E_BE_CONFLICT,
                        "rule set version is behind server",
                        {
                            "RuleSetId": envelope.RuleSetId,
                            "client_version": envelope.Version,
                            "server_version": prior_version,
                        },
                    )
                new_version = prior_version + 1
            else:
                new_version = envelope.Version + 1

            now_iso = datetime.now(UTC).isoformat()
            dm = DraftMeta(
                ClientId=envelope.DraftMeta.ClientId,
                UpdatedAt=now_iso,
                Origin="server",
            )
            committed = RuleSetEnvelope(
                SchemaVersion=envelope.SchemaVersion,
                RuleSetId=envelope.RuleSetId,
                Name=envelope.Name,
                Version=new_version,
                Enabled=envelope.Enabled,
                Rules=envelope.Rules,
                DraftMeta=dm,
            )

            payload_json = json.dumps(committed.to_wire())
            is_enabled = 1 if committed.Enabled else 0

            if row is not None:
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
