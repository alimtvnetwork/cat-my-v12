"""AI transport — v1 stub.

Spec 21-app/43 §7: with `ai.enabled=true` but no model wired, invocation is
`E_AI_MODEL_MISSING` (startup-fatal in a real deployment). In v1 there is no
model bundled; `run_stub` always raises so that a mis-configured `ai.enabled`
cannot silently fabricate an `AiOpinion` (`E_AI_FABRICATED_OPINION`).

No network egress: this module MUST NOT import `httpx`, `requests`, sockets,
or subprocesses. Any addition is a spec 43 §5 violation (`E_AI_NETWORK_EGRESS`).
"""
from __future__ import annotations

import logging

from app.core.errors.codes import ErrorCode

log = logging.getLogger(__name__)


class AiModelMissingError(RuntimeError):
    code: str = ErrorCode.E_AI_MODEL_MISSING.value

    def __init__(self, detail: str = "") -> None:
        super().__init__(f"{self.code} {detail}".strip())


def run_stub(bundle_id: str) -> None:
    log.error("ai.transport bundleId=%s code=%s", bundle_id, ErrorCode.E_AI_MODEL_MISSING.value)
    raise AiModelMissingError(f"bundleId={bundle_id} — no model wired in v1")
