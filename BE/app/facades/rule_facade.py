"""`RuleFacade` Protocol + adapters (aliased to `BE.repos.rules_repo`).

Preserves backwards-compatibility for existing tests/modules importing from `BE.app.facades`.
"""

from __future__ import annotations

from BE.repos.rules_repo import (
    InMemoryRulesRepo as InMemoryRuleFacade,
    RulesRepo as RuleFacade,
    VendorRulesRepo as VendorRuleFacade,
    get_rules_repo as get_rule_facade,
    set_rules_repo as set_rule_facade,
)

__all__ = [
    "InMemoryRuleFacade",
    "RuleFacade",
    "VendorRuleFacade",
    "get_rule_facade",
    "set_rule_facade",
]
