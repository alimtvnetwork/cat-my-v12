"""Plan 90 Step 41 - shared DB-tier doctor probe.

Anchors:
- ``spec/21-app/74-worker-cli.md`` §"Subcommands" (`doctor` is the single
  preflight surface both CLIs expose; installers + CI ``verify-install``
  invoke it before any capture / processing subcommand runs).
- ``spec/21-app/75-processing-cli.md`` (same ``doctor`` contract for the
  processing side, wired at Step 51 when its ``main.py`` lands).
- ``bin/db-bootstrap.py`` §``run_check`` (read-only per-tier probe; this
  module is the in-process caller so worker/processing don't shell out).
- ``.lovable/memory/26-split-db-cli-cheatsheet.md`` §3 (CLIs MUST fail
  with a preflight error if bootstrap has not been run; never auto-create).

Contract:
    ``run_doctor(ctx, db_root=None) -> list[dict]``

    Returns per-tier summaries suitable for placing into ``Results`` of a
    Universal Envelope. Never raises for drift: an unhealthy tier is
    signalled by ``IsHealthy=False`` on its summary, and the caller
    (worker / processing ``doctor`` handler) is responsible for turning
    that into an ``AppError`` so the dispatcher returns
    ``ExitCode.DomainError``. Only raises when the DB root itself is
    unreachable (surfaces as ``E_CLI_PREFLIGHT_FAILED``).

Import shape: we intentionally import ``bin/db-bootstrap.py`` by file
path rather than duplicating the probe logic; the bin script is the
canonical implementation, and duplicating it here would drift.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from typing import Any

from BE.cli.common.session import SessionCtx
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_REPO_ROOT = Path(__file__).resolve().parents[3]
_BOOTSTRAP_PATH = _REPO_ROOT / "bin" / "db-bootstrap.py"


def _load_bootstrap_module():
    """Load ``bin/db-bootstrap.py`` as ``_db_bootstrap`` (hyphen -> underscore).

    ``bin/`` is not a Python package and the filename has a hyphen, so a
    plain ``import`` will not work. ``importlib.util.spec_from_file_location``
    is the stdlib-blessed way to load a runnable script as a module.
    """
    if not _BOOTSTRAP_PATH.exists():
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            f"db-bootstrap script missing at {_BOOTSTRAP_PATH}",
            details={"Path": str(_BOOTSTRAP_PATH)},
        )
    spec = importlib.util.spec_from_file_location("_db_bootstrap", _BOOTSTRAP_PATH)
    if spec is None or spec.loader is None:
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            f"Could not build import spec for {_BOOTSTRAP_PATH}",
            details={"Path": str(_BOOTSTRAP_PATH)},
        )
    mod = importlib.util.module_from_spec(spec)
    sys.modules.setdefault("_db_bootstrap", mod)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


def run_doctor(ctx: SessionCtx, db_root: Path | None = None) -> list[dict[str, Any]]:
    """Run the read-only per-tier probe and return summaries.

    Logs a single INFO line summarising overall health so operators can
    grep ``doctor.checked`` in the JSONL log even if stdout is captured.
    """
    bootstrap = _load_bootstrap_module()
    summaries, healthy = bootstrap.run_check(db_root=db_root)
    ctx.logger.log(
        "INFO",
        "doctor.checked",
        f"DB doctor checked {len(summaries)} tier(s); healthy={healthy}",
        ctx={
            "IsHealthy": healthy,
            "TierCount": len(summaries),
            "DbRoot": str(db_root) if db_root is not None else None,
        },
    )
    return summaries


def assert_healthy(summaries: list[dict[str, Any]]) -> None:
    """Raise ``E_CLI_PREFLIGHT_FAILED`` if any tier reports drift.

    Handlers call this AFTER ``run_doctor`` so the dispatcher receives an
    ``AppError`` (mapped to ``ExitCode.DomainError=3`` by ``run_session``)
    while the per-tier summaries still ride the envelope's ``Results``.
    """
    drifted = [s for s in summaries if not s.get("IsHealthy")]
    if not drifted:
        return
    raise AppError(
        ErrorCode.E_CLI_PREFLIGHT_FAILED,
        f"Schema drift on {len(drifted)} tier(s); run db-bootstrap to apply pending migrations.",
        details={
            "Drift": [
                {
                    "Tier": s["Tier"],
                    "Pending": s.get("PendingVersions", []),
                    "Missing": s.get("MissingVersions", []),
                }
                for s in drifted
            ],
        },
    )


# ---------------------------------------------------------------------------
# Plan 90 Step 51 - extended preflight probes (spec/21-app/74 §Acceptance #5)
#
# `run_doctor` above verifies DB tier drift only. Spec 74 requires the CLI
# `doctor` subcommand to ALSO verify:
#   * SDK reachable            - CameraFacade Protocol resolvable at runtime
#                                and the in-memory provider still satisfies it.
#   * Config schema valid      - `CliConfig` layered load must not raise.
#   * Log root writable        - `<APP_LOG_ROOT>` resolvable + write-touch.
#
# All probes are side-effect-safe (config load is pure; SDK check does not
# open cameras; log-root write goes to a tmp file that is immediately
# unlinked). Failures never raise here; they surface as `IsHealthy=False`
# entries so the caller can still emit per-probe detail on the envelope
# before `assert_healthy` converts to `E_CLI_PREFLIGHT_FAILED`.
# ---------------------------------------------------------------------------


def _probe_sdk() -> dict[str, Any]:
    try:
        from BE.config import get_settings
        from BE.sdk_facade import get_camera_facade

        provider = get_settings().camera.provider.value
        facade = get_camera_facade(provider)
        
        if provider == "daheng":
            try:
                facade.list_devices()
            except Exception as e:
                return {"Tier": "sdk", "IsHealthy": False, "Detail": f"Daheng enumeration failed: {e!r}"}
                
        return {
            "Tier": "sdk",
            "IsHealthy": True,
            "Detail": f"CameraFacade Protocol satisfied by {provider} provider",
        }
    except Exception as exc:  # pragma: no cover - import failure is itself the signal
        return {"Tier": "sdk", "IsHealthy": False, "Detail": f"SDK import failed: {exc!r}"}


def _probe_config() -> dict[str, Any]:
    try:
        from BE.cli.common.config_loader import load_config

        cfg = load_config(cli_name="worker")
        return {
            "Tier": "config",
            "IsHealthy": True,
            "Detail": f"CliConfig loaded (verbose={cfg.verbose}, quiet={cfg.quiet})",
        }
    except AppError as exc:
        return {"Tier": "config", "IsHealthy": False, "Detail": f"{exc.code.name}: {exc.message}"}
    except Exception as exc:
        return {"Tier": "config", "IsHealthy": False, "Detail": f"Config load failed: {exc!r}"}


def _probe_log_root() -> dict[str, Any]:
    try:
        from BE.cli.common.paths import resolve_root

        root = resolve_root("log", ensure=True)
        probe = root / ".doctor.write-probe"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink(missing_ok=True)
        return {"Tier": "logroot", "IsHealthy": True, "Detail": str(root)}
    except Exception as exc:
        return {"Tier": "logroot", "IsHealthy": False, "Detail": f"Log root unwritable: {exc!r}"}


def run_preflight(
    ctx: SessionCtx,
    db_root: Path | None = None,
) -> list[dict[str, Any]]:
    """Full spec-74 §5 preflight: SDK + config + log root + DB tiers.

    Order matters: cheap in-process probes first so a broken import surfaces
    before we touch the filesystem-heavy DB tier check.
    """
    results: list[dict[str, Any]] = []
    results.append(_probe_sdk())
    results.append(_probe_config())
    results.append(_probe_log_root())
    results.extend(run_doctor(ctx, db_root=db_root))
    unhealthy = [r for r in results if not r.get("IsHealthy")]
    ctx.logger.log(
        "INFO",
        "doctor.preflight.checked",
        f"Preflight checked {len(results)} probe(s); unhealthy={len(unhealthy)}",
        ctx={"TotalProbes": len(results), "UnhealthyCount": len(unhealthy)},
    )
    return results

