"""Plan 20 Step 9 (reframed): AuditSink append-only invariant.

Plan 20 originally wired `prune_by_policy` into `audit_sink.py`. Specs
51 §Retention + 68 §68.3 forbid that: deletion lives ONLY in
`app/core/audit/retention_worker.py`. This test locks the invariant so a
future regression cannot silently add a DELETE path to the sink.
"""
from __future__ import annotations

import ast
import inspect
import sqlite3
from pathlib import Path

from app.core.security.audit_sink import AuditSink


SINK_FILE = Path("app/core/security/audit_sink.py")


def test_sink_module_declares_no_prune_symbol() -> None:
    tree = ast.parse(SINK_FILE.read_text())
    names = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
    method_names = {
        m.name
        for cls in (n for n in ast.walk(tree) if isinstance(n, ast.ClassDef))
        for m in cls.body
        if isinstance(m, ast.FunctionDef)
    }
    forbidden = {"prune", "prune_by_policy", "delete", "purge"}
    assert names.isdisjoint(forbidden), f"sink defines forbidden helper: {names & forbidden}"
    assert method_names.isdisjoint(forbidden), (
        f"AuditSink method violates append-only seam (spec 68 §68.3): "
        f"{method_names & forbidden}"
    )


def test_sink_source_contains_no_delete_from_audit_log() -> None:
    src = SINK_FILE.read_text()
    lowered = src.lower().replace("\n", " ")
    assert "delete from audit_log" not in lowered, (
        "AuditSink source issues a DELETE against audit_log; only "
        "app/core/audit/retention_worker.py may delete audit rows "
        "(spec 51 §Retention + spec 68 §68.3)."
    )


def test_sink_instance_exposes_no_delete_method() -> None:
    conn = sqlite3.connect(":memory:")
    sink = AuditSink(conn=conn)
    public = {n for n in dir(sink) if not n.startswith("_")}
    forbidden = {"prune", "prune_by_policy", "delete", "purge"}
    leak = public & forbidden
    assert not leak, f"AuditSink public surface leaks deletion method: {leak}"
    # And no callable named suggestively.
    for name in ("prune", "delete", "purge"):
        assert not hasattr(sink, name) or not callable(getattr(sink, name))


def test_sink_docstring_pins_append_only() -> None:
    src = SINK_FILE.read_text().lower()
    assert "append-only" in src or "append only" in src, (
        "AuditSink module must document the append-only invariant so a "
        "future editor cannot claim the seam is loose."
    )

