"""`RulesRepo` Protocol + two adapters.

Protocol lives here (not `BE.sdk_facade`) because rules are a persisted
domain slice, not a hardware/blob SDK. Same shape though: `runtime_checkable`
Protocol, in-memory adapter for tests + FE unblocking, vendor adapter that
today raises `E_SDK_INIT_FAILED` (503) until Plan 88 wires the real SQLite
bundle reader (`spec/21-app/70-rule-bundle-import-export.md`).

Route wiring:
- `BE/routes/rules.py` calls `get_rules_repo()` (module-level accessor) so
  tests can `set_rules_repo(InMemoryRulesRepo(seed=[...]))` without patching
  imports. Default is an empty `InMemoryRulesRepo`, which reproduces the
  pre-existing "empty list / 404 on get" behavior.
"""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timezone
from typing import Iterable, Protocol, runtime_checkable

from BE.app.domain.cat_rule import CatRule
from BE.app.domain.rule_set import DraftMeta, RuleSetEnvelope
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


@runtime_checkable
class RulesRepo(Protocol):
    """Read + draft-save surface (mutations added Plan 90 Step 133)."""

    def list_rules(self) -> list[CatRule]: ...
    def get_rule(self, rule_id: int) -> CatRule: ...
    def save_rule_set(self, envelope: RuleSetEnvelope) -> RuleSetEnvelope: ...
    def get_rule_set(self, rule_set_id: int) -> RuleSetEnvelope: ...


class InMemoryRulesRepo:
    """Deterministic in-memory adapter. Empty by default; seed via constructor."""

    def __init__(self, seed: Iterable[CatRule] | None = None) -> None:
        self._by_id: dict[int, CatRule] = {r.id: r for r in (seed or ())}
        self._rule_sets: dict[int, RuleSetEnvelope] = {}

    def list_rules(self) -> list[CatRule]:
        return sorted(self._by_id.values(), key=lambda r: r.id)

    def get_rule(self, rule_id: int) -> CatRule:
        rule = self._by_id.get(rule_id)
        if rule is None:
            raise AppError(
                ErrorCode.E_BE_NOT_FOUND,
                f"rule {rule_id} not found",
                {"rule_id": rule_id, "provider": "InMemoryRulesRepo"},
            )
        return rule

    def save_rule_set(self, envelope: RuleSetEnvelope) -> RuleSetEnvelope:
        """Persist a validated envelope. Stamps `Origin="server"` and bumps `Version`."""
        prior = self._rule_sets.get(envelope.RuleSetId)
        if prior is not None and envelope.Version < prior.Version:
            raise AppError(
                ErrorCode.E_BE_CONFLICT,
                "rule set version is behind server",
                {"RuleSetId": envelope.RuleSetId, "client_version": envelope.Version,
                 "server_version": prior.Version},
            )
        new_version = (prior.Version if prior else envelope.Version) + 1
        committed = replace(
            envelope,
            Version=new_version,
            DraftMeta=DraftMeta(
                ClientId=envelope.DraftMeta.ClientId,
                UpdatedAt=datetime.now(timezone.utc).isoformat(),
                Origin="server",
            ),
        )
        self._rule_sets[envelope.RuleSetId] = committed
        return committed

    def get_rule_set(self, rule_set_id: int) -> RuleSetEnvelope:
        """Return the current server-committed envelope for `rule_set_id`.

        Raises `E_BE_NOT_FOUND` if the rule set was never saved so callers
        (FE `loadRuleSet`, reconcile-drafts) can distinguish "server has no
        copy" from a transport failure and route the UX accordingly.
        """
        env = self._rule_sets.get(rule_set_id)
        if env is None:
            raise AppError(
                ErrorCode.E_BE_NOT_FOUND,
                f"rule set {rule_set_id} not found",
                {"RuleSetId": rule_set_id, "provider": "InMemoryRulesRepo"},
            )
        return env


class VendorRulesRepo:
    """Placeholder vendor adapter (SQLite bundle reader lands post-Plan-88).

    Refuses to fabricate data: every call raises `E_SDK_INIT_FAILED` so
    callers cannot silently degrade to a stub when they expected real data.
    """

    def list_rules(self) -> list[CatRule]:
        raise AppError(
            ErrorCode.E_SDK_INIT_FAILED,
            "VendorRulesRepo not initialised",
            {"provider": "VendorRulesRepo", "op": "list_rules"},
        )

    def get_rule(self, rule_id: int) -> CatRule:
        raise AppError(
            ErrorCode.E_SDK_INIT_FAILED,
            "VendorRulesRepo not initialised",
            {"provider": "VendorRulesRepo", "op": "get_rule", "rule_id": rule_id},
        )

    def save_rule_set(self, envelope: RuleSetEnvelope) -> RuleSetEnvelope:
        raise AppError(
            ErrorCode.E_SDK_INIT_FAILED,
            "VendorRulesRepo not initialised",
            {"provider": "VendorRulesRepo", "op": "save_rule_set",
             "RuleSetId": envelope.RuleSetId},
        )

    def get_rule_set(self, rule_set_id: int) -> RuleSetEnvelope:
        raise AppError(
            ErrorCode.E_SDK_INIT_FAILED,
            "VendorRulesRepo not initialised",
            {"provider": "VendorRulesRepo", "op": "get_rule_set",
             "RuleSetId": rule_set_id},
        )


# Contract self-check at import: fail fast on Protocol drift.
assert isinstance(InMemoryRulesRepo(), RulesRepo), "InMemoryRulesRepo drifted from RulesRepo"
assert isinstance(VendorRulesRepo(), RulesRepo), "VendorRulesRepo drifted from RulesRepo"


# ---- module-level accessor (test-swappable) --------------------------------

_active: RulesRepo = InMemoryRulesRepo()


def get_rules_repo() -> RulesRepo:
    return _active


def set_rules_repo(facade: RulesRepo) -> None:
    """Swap the active facade. Tests should restore the previous value in teardown."""
    global _active
    _active = facade


__all__ = [
    "InMemoryRulesRepo",
    "RulesRepo",
    "VendorRulesRepo",
    "get_rules_repo",
    "set_rules_repo",
]
