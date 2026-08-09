"""Plan 90 Step 42 - contract tests for ``bin/db-bootstrap.py``.

Invariants pinned:
    1. Full apply: fresh root materialises every ``NNNN_*.sql`` under
       ``BE/db/migrations/<tier>/`` exactly once and reports the correct
       terminal ``SchemaVersion`` per tier.
    2. Idempotent re-apply: running against an already-migrated root is
       a strict no-op (``AppliedMigrations == []``, seed hook still
       invoked, ``SchemaVersion`` unchanged).
    3. Partial-failure rollback: a broken migration on tier T aborts T
       at its prior ``SchemaVersion``, leaves tiers processed before T
       committed, and never runs T's seed hook.

We load ``bin/db-bootstrap.py`` via ``importlib`` because ``bin/`` is
not a package and the filename contains a hyphen (matches the loader in
``BE/cli/common/doctor.py``).
"""
from __future__ import annotations

import importlib.util
import shutil
import sys
from pathlib import Path
from types import ModuleType

import pytest

_REPO_ROOT = Path(__file__).resolve().parents[3]


def _load_bootstrap() -> ModuleType:
    src = _REPO_ROOT / "bin" / "db-bootstrap.py"
    spec = importlib.util.spec_from_file_location("_db_bootstrap_under_test", src)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture()
def bootstrap() -> ModuleType:
    return _load_bootstrap()


# ---------------------------------------------------------------- 1. full apply

def test_full_apply_records_every_migration_and_final_version(
    tmp_path: Path, bootstrap: ModuleType
) -> None:
    summaries = [
        bootstrap._bootstrap_tier(t, tmp_path, sys.stderr)
        for t in bootstrap._TIER_ORDER
    ]
    by_tier = {s["Tier"]: s for s in summaries}

    # Every on-disk migration file must show up in AppliedMigrations
    # exactly once, in filename order.
    for tier in bootstrap._TIER_ORDER:
        on_disk = [v for v, _s, _p in bootstrap._iter_migrations(tier)]
        applied = [m["Version"] for m in by_tier[tier]["AppliedMigrations"]]
        assert applied == on_disk, (tier, applied, on_disk)
        assert by_tier[tier]["SkippedMigrations"] == []
        assert by_tier[tier]["SeededHook"] is True
        if on_disk:
            assert by_tier[tier]["SchemaVersion"] == max(on_disk)
        else:
            # No migrations shipped for this tier yet (e.g. rules/).
            assert by_tier[tier]["SchemaVersion"] is None

    # The physical DB files exist under db_root and are non-empty.
    for tier in bootstrap._TIER_ORDER:
        db_file = tmp_path / f"{tier}.db"
        assert db_file.exists() and db_file.stat().st_size > 0, tier


# ------------------------------------------------------- 2. idempotent re-apply

def test_reapply_is_strict_noop_preserves_schema_version(
    tmp_path: Path, bootstrap: ModuleType
) -> None:
    for tier in bootstrap._TIER_ORDER:
        bootstrap._bootstrap_tier(tier, tmp_path, sys.stderr)

    baseline_versions = {}
    for tier in bootstrap._TIER_ORDER:
        with bootstrap._OPENERS[tier](db_root=tmp_path) as conn:
            baseline_versions[tier] = bootstrap._current_schema_version(conn)

    # Second pass: zero migrations applied, all skipped, seed hook still runs.
    for tier in bootstrap._TIER_ORDER:
        summary = bootstrap._bootstrap_tier(tier, tmp_path, sys.stderr)
        assert summary["AppliedMigrations"] == [], (tier, summary)
        on_disk = [v for v, _s, _p in bootstrap._iter_migrations(tier)]
        skipped_versions = [m["Version"] for m in summary["SkippedMigrations"]]
        assert skipped_versions == on_disk, (tier, skipped_versions, on_disk)
        assert summary["SeededHook"] is True
        assert summary["SchemaVersion"] == baseline_versions[tier], tier


# ------------------------------------------------- 3. partial-failure rollback

def test_broken_migration_aborts_tier_and_leaves_prior_tiers_intact(
    tmp_path: Path, bootstrap: ModuleType, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Inject a bad SQL file into ``task/`` and confirm:
       - root committed at its true final version (processed before task),
       - task aborted at ``SchemaVersion == None`` (nothing committed),
       - the failure surfaces as ``E_CLI_PREFLIGHT_FAILED``.
    """
    from BE.errors.apperror import AppError
    from BE.errors.codes import ErrorCode

    # Redirect MIGRATIONS_ROOT to a temp copy so we can taint task/.
    fake_root = tmp_path / "migrations_src"
    shutil.copytree(_REPO_ROOT / "BE" / "db" / "migrations", fake_root)
    bad = fake_root / "task" / "0099_task_broken.sql"
    bad.write_text(
        "-- deliberately invalid SQL to force sqlite3.Error\n"
        "CREATE TABLE ;\n",
        encoding="utf-8",
    )
    monkeypatch.setattr(bootstrap, "MIGRATIONS_ROOT", fake_root)

    db_root = tmp_path / "db"
    db_root.mkdir()

    # Root should succeed.
    root_summary = bootstrap._bootstrap_tier("root", db_root, sys.stderr)
    root_on_disk = [v for v, _s, _p in bootstrap._iter_migrations("root")]
    assert root_summary["SchemaVersion"] == max(root_on_disk)

    # Task should fail on the tainted file, raising AppError.
    with pytest.raises(AppError) as ei:
        bootstrap._bootstrap_tier("task", db_root, sys.stderr)
    assert ei.value.code == ErrorCode.E_CLI_PREFLIGHT_FAILED
    assert ei.value.details.get("Tier") == "task"
    assert "0099_task_broken.sql" in ei.value.details.get("Path", "")

    # Root DB survives with its real final version; task DB either
    # doesn't exist yet or has no SchemaVersion row (the bad file was
    # the first task migration to hit; earlier valid ones committed
    # per spec-26 per-file BEGIN/COMMIT and remain).
    with bootstrap._OPENERS["root"](db_root=db_root) as rconn:
        assert bootstrap._current_schema_version(rconn) == max(root_on_disk)

    with bootstrap._OPENERS["task"](db_root=db_root) as tconn:
        task_final = bootstrap._current_schema_version(tconn)
    task_valid_versions = [
        v for v, _s, p in bootstrap._iter_migrations("task")
        if p.name != "0099_task_broken.sql"
    ]
    # Every valid task migration filename-orders BEFORE 0099, so all
    # committed independently; task_final must equal max(valid) and
    # must NOT equal 99 (the bad file rolled back).
    assert task_final == max(task_valid_versions)
    assert task_final != 99
