"""Plan 90 Step 38 - tier-scoped seed hook extension points.

Anchors:
- ``spec/21-app/26-migrations.md`` §"Seed vs migration" (migrations are
  forward-only, additive, idempotent DDL; environment-specific rows are
  layered ON TOP via seed hooks that never mutate applied migrations).
- ``spec/06-seedable-config-architecture/**`` (layered composition:
  defaults -> repo -> user -> env -> flags; seeding follows the same
  "safe to re-run" contract).
- ``.lovable/memory/26-split-db-cli-cheatsheet.md`` §9 (per-tier
  isolation; seed hooks are tier-scoped and MUST NOT reach across tiers).
- ``spec/05-split-db-architecture/**`` (Root/Task/Rules are separate
  SQLite files; the seed hook signature accepts an already-open
  guarded connection so the caller controls which tier is touched).

Contract:
    * Each ``seed_<tier>(conn)`` accepts a ``sqlite3.Connection`` that
      is already positioned on the correct tier's DB. The hook MUST NOT
      open new connections and MUST NOT ATTACH sibling tiers.
    * Hooks are IDEMPOTENT: calling twice against the same DB is a
      no-op on the second call. Enforced by ``INSERT OR IGNORE`` /
      pre-check semantics whenever real rows are added later.
    * Hooks MUST NOT touch ``SchemaVersion`` (that row is owned by the
      migration files; mutating it breaks version tracking).
    * Hooks MUST NOT run inside their own ``BEGIN``/``COMMIT``; the
      caller (``bin/db-bootstrap.py``, Step 39) is responsible for
      transaction scope so a failing seed rolls back cleanly.
    * As of Step 38 all three hooks are intentional NO-OPs. Later
      plan-90 steps (and follow-on plans) add tier-specific rows here
      without needing to touch the bootstrap wiring.

Failure contract:
    * If a hook ever raises, it MUST raise ``AppError`` with a code
      registered in ``BE/errors/codes.py`` (``E_CLI_PREFLIGHT_FAILED``
      for structural violations, tier-specific codes for data issues).
      Never let a raw ``sqlite3.Error`` escape - Step 39 relies on the
      AppError envelope for bootstrap error surfacing.
"""

from __future__ import annotations

import sqlite3

__all__ = ["seed_root", "seed_task", "seed_rules"]


def _assert_conn(conn: object, tier: str) -> None:
    """Guardrail: refuse anything that is not a sqlite3.Connection.

    Prevents accidental misuse where a caller passes a path or a cursor
    (both have ``.execute`` but neither honours the guarded-connection
    invariants from ``BE/db/connections.py``).
    """
    if not isinstance(conn, sqlite3.Connection):
        raise TypeError(
            f"seed_{tier}() requires a sqlite3.Connection positioned on the "
            f"{tier!r} tier; got {type(conn).__name__}"
        )


def seed_root(conn: sqlite3.Connection) -> None:
    """Seed the Root-tier DB. No-op stub; safe to call repeatedly.

    Root DB owns ``CliInvocation``, ``Device``, ``CaptureSession``
    (spec 76 §"Database ownership"). Future rows added here MUST use
    ``INSERT OR IGNORE`` keyed on a natural unique index
    (e.g. ``Device.Serial``) to preserve idempotence.
    """
    _assert_conn(conn, "root")
    # Intentional no-op. See module docstring §Contract.
    return


def seed_task(conn: sqlite3.Connection) -> None:
    """Seed the Task-tier DB. No-op stub; safe to call repeatedly.

    Task DB owns ``Capture``, ``Frame``, ``Result``, ``ResultDetail``,
    ``IpcMessage``. Task-tier rows are per-run and generally should NOT
    be seeded at bootstrap time; this hook exists for QA fixtures only.
    """
    _assert_conn(conn, "task")
    return


def seed_rules(conn: sqlite3.Connection) -> None:
    """Seed the Rules-tier DB. No-op stub; safe to call repeatedly.

    Rules DB owns rule bundles (schema lands in Steps 51+). Real seed
    rows will be added there in lock-step with the rule-bundle loader.
    """
    _assert_conn(conn, "rules")
    return
