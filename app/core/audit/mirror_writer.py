"""Plan 21 Step 7: AuditMirrorWriter.

Pushes each AuditEvent to Supabase `public.audit_events` via
`SUPABASE_SERVICE_ROLE_KEY`. Local SQLite remains source of truth; the
mirror exists so the TS server functions (`getAuditRetentionStatus`,
`exportAuditBundle`) can read a stable, admin-gated projection.

Contract: spec/21-app/72-audit-persistence.md §72.5 (mirror), §72.8 (errors).

Design notes (user rule): no em dashes in prose or comments. Errors
surface with code + context; silent widening is not acceptable.
"""
from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any

from .sink_sqlite import AuditEvent, AuditSinkError

log = logging.getLogger("audit.mirror_writer")


class AuditMirrorError(AuditSinkError):
    code = "E_AUDIT_MIRROR_WRITE_FAILED"


class AuditMirrorUnavailable(AuditSinkError):
    code = "E_AUDIT_MIRROR_UNAVAILABLE"


@dataclass(frozen=True)
class MirrorConfig:
    url: str
    service_role_key: str

    @staticmethod
    def from_env() -> "MirrorConfig | None":
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            return None
        return MirrorConfig(url=url.rstrip("/"), service_role_key=key)


class AuditMirrorWriter:
    """Fire-and-log PostgREST insert into `public.audit_events`.

    Failures do NOT block local persistence: the local SQLite sink is the
    system of record. Mirror failures are logged with `E_AUDIT_MIRROR_*`
    so ops can detect divergence.
    """

    def __init__(self, cfg: MirrorConfig, *, timeout_seconds: float = 5.0):
        self._cfg = cfg
        self._timeout = timeout_seconds

    def append(self, event: AuditEvent) -> None:
        body = json.dumps({
            "event_id": event.event_id,
            "ts": event.ts,
            "code": event.code,
            "policy": event.policy,
            "correlation_id": event.correlation_id,
            "actor": event.actor,
            "payload": event.payload,
            "schema_version": event.schema_version,
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{self._cfg.url}/rest/v1/audit_events",
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "apikey": self._cfg.service_role_key,
                "Authorization": f"Bearer {self._cfg.service_role_key}",
                "Prefer": "return=minimal",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=self._timeout) as resp:
                if resp.status >= 300:
                    log.error(
                        "audit.mirror.append_failed",
                        extra={"code": "E_AUDIT_MIRROR_WRITE_FAILED", "http": resp.status, "event_id": event.event_id},
                    )
                    raise AuditMirrorError(f"http={resp.status}")
        except urllib.error.URLError as exc:
            log.error(
                "audit.mirror.append_unavailable",
                extra={"code": "E_AUDIT_MIRROR_UNAVAILABLE", "event_id": event.event_id, "err": str(exc)},
            )
            raise AuditMirrorUnavailable(str(exc)) from exc

    def try_append(self, event: AuditEvent) -> bool:
        """Non-throwing variant used by the append hot path; returns success."""
        try:
            self.append(event)
            return True
        except AuditSinkError:
            return False


def try_build_from_env() -> AuditMirrorWriter | None:
    """Boot helper: return a writer when env is configured, else None + log."""
    cfg = MirrorConfig.from_env()
    if cfg is None:
        log.info("audit.mirror.disabled reason=missing_env")
        return None
    return AuditMirrorWriter(cfg)


__all__: list[str] = [
    "AuditMirrorWriter",
    "AuditMirrorError",
    "AuditMirrorUnavailable",
    "MirrorConfig",
    "try_build_from_env",
]
