"""Operator consent module (spec 21-app/44 §5, F-44).

Enforces the local-first consent contract:

- Consent is purpose-specific — an `EXPORT` grant does NOT authorize
  `AI_REVIEW` or `SUPPORT_BUNDLE`.
- Consent is per action; each grant is single-use and bound to one
  `Destination`. Reuse against a different destination raises
  `E_SEC_CONSENT_REUSED`.
- Missing / unknown grant raises `E_SEC_CONSENT_MISSING`.

This module owns the in-memory ledger only. Persistence (DB row + audit
log line, spec §5, §Table) is intentionally out of scope for this slice
so the gate can guard callers immediately without waiting on schema work.
"""
from __future__ import annotations

import logging
import secrets
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Callable, Iterable, Protocol

from app.core.errors.codes import ErrorCode


class ConsentSink(Protocol):
    """Persistence hook — task-DB writer in production, noop in tests."""

    def on_grant(self, record: "ConsentRecord") -> None: ...
    def on_consume(self, consent_id: str, destination: str, consumed_at: str) -> None: ...

log = logging.getLogger(__name__)


class ConsentPurpose(str, Enum):
    AI_REVIEW = "AI_REVIEW"
    EXPORT = "EXPORT"
    SUPPORT_BUNDLE = "SUPPORT_BUNDLE"


class ConsentError(RuntimeError):
    """Base class; subclasses set `code` to a spec-defined ErrorCode."""

    code: ErrorCode


class ConsentMissingError(ConsentError):
    code = ErrorCode.E_SEC_CONSENT_MISSING


class ConsentReusedError(ConsentError):
    code = ErrorCode.E_SEC_CONSENT_REUSED


@dataclass(frozen=True)
class ConsentRecord:
    consent_id: str
    task_id: str
    run_session_id: str | None
    purpose: ConsentPurpose
    data_classes: tuple[str, ...]
    destination: str
    granted_by: str
    granted_at: str  # ISO8601 UTC


@dataclass
class ConsentLedger:
    """Single-use consent grants keyed by `consent_id`.

    Not thread-safe by design — callers hold the supervisor loop lock.
    """

    _grants: dict[str, ConsentRecord] = field(default_factory=dict)
    _consumed: set[str] = field(default_factory=set)
    sink: ConsentSink | None = None

    def grant(
        self,
        *,
        task_id: str,
        purpose: ConsentPurpose,
        data_classes: Iterable[str],
        destination: str,
        granted_by: str = "operator",
        run_session_id: str | None = None,
    ) -> ConsentRecord:
        consent_id = _new_consent_id()
        record = ConsentRecord(
            consent_id=consent_id,
            task_id=task_id,
            run_session_id=run_session_id,
            purpose=purpose,
            data_classes=tuple(data_classes),
            destination=destination,
            granted_by=granted_by,
            granted_at=datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
        )
        self._grants[consent_id] = record
        log.info(
            "security.consent.grant consentId=%s purpose=%s destination=%s taskId=%s",
            consent_id, purpose.value, destination, task_id,
        )
        if self.sink is not None:
            try:
                self.sink.on_grant(record)
            except Exception:
                log.exception("security.consent.persistGrantFailed consentId=%s", consent_id)
        return record

    def require(
        self,
        *,
        consent_id: str | None,
        purpose: ConsentPurpose,
        destination: str,
    ) -> ConsentRecord:
        """Consume a grant. Raises typed errors on missing / reuse / mismatch."""
        if consent_id is None or consent_id not in self._grants:
            log.error(
                "security.consent.missing consentId=%s purpose=%s destination=%s",
                consent_id, purpose.value, destination,
            )
            raise ConsentMissingError(
                f"no consent for purpose={purpose.value} destination={destination}"
            )
        record = self._grants[consent_id]
        if consent_id in self._consumed:
            log.error(
                "security.consent.reused consentId=%s destination=%s",
                consent_id, destination,
            )
            raise ConsentReusedError(f"consent {consent_id} already consumed")
        # Purpose-specific: EXPORT does NOT authorize AI_REVIEW (spec §5 rule 1).
        if record.purpose is not purpose:
            log.error(
                "security.consent.purposeMismatch consentId=%s want=%s got=%s",
                consent_id, purpose.value, record.purpose.value,
            )
            raise ConsentReusedError(
                f"consent {consent_id} purpose={record.purpose.value} != {purpose.value}"
            )
        # Per-destination binding (spec §5 rule 4).
        if record.destination != destination:
            log.error(
                "security.consent.destinationMismatch consentId=%s want=%s got=%s",
                consent_id, destination, record.destination,
            )
            raise ConsentReusedError(
                f"consent {consent_id} destination={record.destination} != {destination}"
            )
        self._consumed.add(consent_id)
        consumed_at = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
        log.info(
            "security.consent.consume consentId=%s purpose=%s destination=%s",
            consent_id, purpose.value, destination,
        )
        if self.sink is not None:
            try:
                self.sink.on_consume(consent_id, destination, consumed_at)
            except Exception:
                log.exception("security.consent.persistConsumeFailed consentId=%s", consent_id)
        return record


def _new_consent_id() -> str:
    # ULID-shaped stand-in until the ULID util lands; entropy is what matters here.
    return "01J" + secrets.token_hex(13).upper()
