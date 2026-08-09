"""Plan 21 Step 7 wiring test: append_event fires the mirror writer.

Contract: spec/21-app/72-audit-persistence.md §72.5 (mirror is best-effort;
local SQLite is the source of truth; mirror failure MUST NOT block local
persistence).
"""
from __future__ import annotations

from pathlib import Path

from app.core.audit.sink_sqlite import AuditEvent, AuditPersistenceFacade


class _RecordingMirror:
    def __init__(self, *, ok: bool = True):
        self.ok = ok
        self.calls: list[AuditEvent] = []

    def try_append(self, event: AuditEvent) -> bool:
        self.calls.append(event)
        return self.ok


def _event() -> AuditEvent:
    return AuditEvent.new(
        code="I_SEC_ADMIN_WRITE",
        policy="settings.capture.device",
        correlation_id="c" * 12,
        payload={"prior": None, "next": {"vendor": "Basler", "serial": "s1"}},
        ts="2026-07-14T00:00:00Z",
        actor={"sub": "u1"},
    )


def test_append_event_invokes_mirror(tmp_path: Path) -> None:
    mirror = _RecordingMirror(ok=True)
    facade = AuditPersistenceFacade(tmp_path / "audit.db", mirror_writer=mirror)
    facade.self_test()
    facade.append_event(_event())
    assert len(mirror.calls) == 1


def test_append_event_survives_mirror_failure(tmp_path: Path) -> None:
    mirror = _RecordingMirror(ok=False)
    facade = AuditPersistenceFacade(tmp_path / "audit.db", mirror_writer=mirror)
    facade.self_test()
    ev = _event()
    facade.append_event(ev)
    # Local is source of truth: row must be present even when mirror returns False.
    rows = list(facade.read_window(policy=ev.policy, limit=10))
    assert len(rows) == 1
    assert rows[0].event_id == ev.event_id


def test_append_event_without_mirror_is_optional(tmp_path: Path) -> None:
    facade = AuditPersistenceFacade(tmp_path / "audit.db")
    facade.self_test()
    facade.append_event(_event())  # must not raise
