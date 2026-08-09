"""Supervisor boot-time checks.

Anchors: spec/21-app/20-folder-structure.md §5 (boot-time checks),
         spec/21-app/21-root-db.md §5 (single writer),
         spec/21-app/26-migrations.md §4 (runner).
"""
from __future__ import annotations

import logging
from pathlib import Path

from app.core.config.settings_store import (
    SettingsStore,
    apply_security_settings,
    load_capture_settings,
)

from app.core.audit.sink_sqlite import AuditPersistenceFacade, AuditSinkUnavailable
from app.core.io.migrate import MigrationError, migrate
from app.core.security.audit_sink import AuditSink, CODE_THRESHOLDS_LOADED
from app.core.security.remediation import TUNING_VERSION
from app.core.security.remediation import DenialRateLimiter
from app.core.security.retention import AuditLogRetention
from app.core.security.retention_scheduler import RetentionScheduler
from app.dispatcher.lifecycle import DispatcherReclaimError, reclaim_on_boot

log = logging.getLogger(__name__)

ROOT_DB_NAME = "root.db"
ROOT_MIGRATIONS_SUBDIR = "root"


class BootError(RuntimeError):
    code: str = "E_BOOT_FAILED"


class RootDbMissing(BootError):
    code = "E_ROOT_DB_MISSING"


def ensure_root_db(db_dir: Path, migrations_root: Path) -> int:
    """Ensure `<db_dir>/root.db` exists and is migrated. Returns version."""
    if db_dir.exists() is False:
        log.error("boot.rootDb.missingDir dir=%s", db_dir)
        raise RootDbMissing(f"db_dir={db_dir}")
    db_dir.mkdir(parents=True, exist_ok=True)
    db_path = db_dir / ROOT_DB_NAME
    migrations_dir = migrations_root / ROOT_MIGRATIONS_SUBDIR
    try:
        version = migrate(db_path, migrations_dir)
    except MigrationError as err:
        log.error("boot.rootDb.migrateFailed code=%s err=%s", err.code, err)
        raise
    log.info("boot.rootDb.ready path=%s version=%d", db_path, version)
    return version


def reclaim_dispatch_inflight(inflight_dir: Path, pending_dir: Path) -> int:
    """Boot-time: return every `inflight/<file>` back to `pending/` (spec 15 §57).

    MUST run before the dispatcher loop starts; otherwise crash-orphaned images
    would sit forever in `inflight/` with no owner. Idempotent.
    """
    try:
        reclaimed = reclaim_on_boot(inflight_dir, pending_dir)
    except DispatcherReclaimError as err:
        log.error("boot.dispatch.reclaimFailed err=%s", err)
        raise
    log.info("boot.dispatch.reclaimed count=%d", len(reclaimed))
    return len(reclaimed)


def verify_audit_persistence(db_path: Path) -> AuditPersistenceFacade:
    """Boot-time: schema self-test for the local audit sink (spec 72 §72.10).

    Runs `AuditPersistenceFacade.self_test()`; on failure raises
    `AuditSinkUnavailable` (code `E_AUDIT_SINK_UNAVAILABLE`) so the
    supervisor refuses to start with a broken audit path (silent widening
    is not acceptable).
    """
    facade = AuditPersistenceFacade(db_path)
    try:
        facade.self_test()
    except AuditSinkUnavailable as err:
        log.error("boot.audit.self_test_failed code=%s path=%s err=%s", err.code, db_path, err)
        raise
    log.info("boot.audit.self_test_ok path=%s", db_path)
    return facade


def start_retention_scheduler(
    sink: AuditSink,
    *,
    max_age_seconds: int | None,
    interval_seconds: float,
) -> RetentionScheduler | None:
    """Boot-time: start the audit-log retention loop.

    Returns the scheduler so the supervisor can call ``stop()`` at shutdown.
    Returns ``None`` when retention is disabled (``max_age_seconds`` falsy).
    """
    if not max_age_seconds or max_age_seconds <= 0:
        log.info("boot.retention.disabled reason=max_age_seconds<=0")
        return None
    scheduler = RetentionScheduler(
        retention=AuditLogRetention(sink=sink, max_age_seconds=max_age_seconds),
        interval_seconds=interval_seconds,
    )
    scheduler.start()
    log.info(
        "boot.retention.started max_age=%d interval=%s",
        max_age_seconds,
        interval_seconds,
    )
    return scheduler


def apply_security_settings_at_boot(
    store: SettingsStore,
    token: str | None,
    limiter: DenialRateLimiter,
) -> dict[str, int] | None:
    """Boot-time: retune the running ``DenialRateLimiter`` from ``SettingsStore``.

    Reads the admin-gated ``security`` section and calls ``limiter.reload(...)``
    so ops config takes effect without a redeploy. On any failure the limiter
    keeps its current thresholds (no silent widening) and the error is logged;
    ``None`` is returned so callers can detect the fallback.
    """
    try:
        cfg = apply_security_settings(store, token, limiter)
    except Exception as err:  # noqa: BLE001 — boot must never crash on tunables
        log.error(
            "boot.security.applyFailed err=%s keeping threshold=%d window=%ds",
            err, limiter.threshold, limiter.window_seconds,
        )
        return None
    _record_thresholds_loaded(limiter, cfg)
    log.info(
        "boot.security.applied threshold=%d window=%ds",
        cfg["denial_threshold"], cfg["denial_window_seconds"],
    )
    return cfg


def _record_thresholds_loaded(limiter: DenialRateLimiter, cfg: dict[str, int]) -> None:
    """Emit `I_SEC_BURST_THRESHOLDS_LOADED` after a successful boot retune.

    Sink errors are logged but do NOT abort boot: audit visibility on a
    tunable must never brick the supervisor. The plain `log.info` line
    stays as the primary observability signal; this row makes the tuning
    grep-able in the audit_log alongside `I_SEC_ADMIN_WRITE` rows.
    """
    detail = (
        f"threshold={cfg['denial_threshold']} "
        f"window={cfg['denial_window_seconds']}s "
        f"tuning_version={TUNING_VERSION} "
        f"source=settings_store"
    )
    try:
        limiter.sink.record(
            CODE_THRESHOLDS_LOADED, "security.settings", detail=detail
        )
    except Exception as err:  # noqa: BLE001 — audit failure must not brick boot
        log.warning("boot.security.thresholdsLoadedRecordFailed err=%s", err)


def apply_capture_settings_at_boot(
    store: SettingsStore,
    token: str | None,
) -> str | None:
    """Boot-time: resolve the ``capture.vendor`` selector for adapter wiring.

    Returns the chosen vendor string (``"pylon"`` / ``"spinnaker"`` / ``"vimba"``).
    On unknown-vendor or any read failure returns ``None`` — the supervisor
    then keeps its compile-time default rather than booting the wrong SDK.
    The error is always logged; silent widening is not acceptable.
    """
    try:
        cfg = load_capture_settings(store, token)
    except Exception as err:  # noqa: BLE001 — boot must never crash on tunables
        log.error("boot.capture.applyFailed err=%s keeping compile-time default", err)
        return None
    vendor = str(cfg.get("vendor"))
    log.info("boot.capture.applied vendor=%s", vendor)
    return vendor
