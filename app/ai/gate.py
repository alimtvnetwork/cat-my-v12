"""AI gate — enforces `27.AI.Enabled` (spec 21-app/43 §1, §7 error table).

Contract:
- `is_enabled()` reads `ai.enabled` via the config resolver; returns bool.
- `invoke(...)` is the single entry into any AI code path. If the gate is off,
  it raises `AiDisabledError(E_AI_STUB_INVOKED)` — never a silent no-op.
- No fabrication: with the gate off there is no `AiOpinion` (spec §6:
  fabrication is `E_AI_FABRICATED_OPINION`).

Guideline: positive conditions only; ≤ 15-line functions; no `!`.
"""
from __future__ import annotations

import logging
from typing import Any

from app.core.config.resolver import Resolver, resolve
from app.core.errors.codes import ErrorCode

log = logging.getLogger(__name__)


class AiDisabledError(RuntimeError):
    code: str = ErrorCode.E_AI_STUB_INVOKED.value

    def __init__(self, detail: str = "") -> None:
        super().__init__(f"{self.code} {detail}".strip())


def is_enabled(resolver: Resolver | None = None) -> bool:
    value = resolver.resolve("ai.enabled")[0] if resolver else resolve("ai.enabled")
    return value is True


def invoke(bundle_id: str, resolver: Resolver | None = None) -> Any:
    """Single entry into any AI code path. Raises when gate is off."""
    if is_enabled(resolver):
        from app.ai.transport import run_stub  # local import: keep cold path cold
        return run_stub(bundle_id)
    log.error("ai.invoke bundleId=%s gate=disabled code=%s", bundle_id, ErrorCode.E_AI_STUB_INVOKED.value)
    raise AiDisabledError(f"bundleId={bundle_id}")
