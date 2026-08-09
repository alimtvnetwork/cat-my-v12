"""POST /api/cli/doctor - HTTP surface over `BE.cli.common.doctor` probes.

Plan 90 Step 122. Spec anchors:
- ``spec/21-app/74-worker-cli.md`` §"Subcommands" (doctor is the single
  preflight surface the CLIs expose; this HTTP mirror lets the operator
  UI at `/cli/settings` run the same probes without shelling out).
- ``BE/cli/common/doctor.py`` §``run_preflight`` (canonical probe list:
  SDK, config, log root, DB tiers). This route re-runs the three
  side-effect-safe process-local probes and calls into
  ``bin/db-bootstrap.py::run_check`` for the DB tiers - identical to
  what the CLI `doctor` subcommand would report.
- ``spec/03-error-manage/`` §"honesty rule": no false-OK. Any probe that
  fails surfaces ``IsHealthy=false`` with a machine-readable ``Tier`` +
  a human ``Detail``; the envelope's top-level ``Status.IsSuccess``
  stays ``true`` (the request itself succeeded), while ``Results[0]``
  carries the per-probe verdicts and an overall ``IsHealthy`` boolean.
  Only a probe crash (unhandled exception inside a probe) is escalated
  to ``E_BE_INTERNAL`` because that indicates a coding bug, not drift.

Method: ``POST`` (not GET) because probes touch the filesystem
(log-root write test) and load the bootstrap script; treating this as
idempotent-safe would be a lie. Cost is ~milliseconds, but the verb
still reflects the truth per spec/03-error-manage.

The FE panel lives at ``src/components/cli/DoctorPanel.tsx`` and mounts
into ``/cli/settings``. Remediation copy is BE-provided per probe so a
schema drift in `Detail` shape does not silently blank the UI.
"""

from __future__ import annotations

import logging
from typing import Any, Final

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from BE.cli.common.doctor import _probe_config, _probe_log_root, _probe_sdk
from BE.envelope import CORRELATION_HEADER, ensure_correlation_id, success

logger = logging.getLogger("BE.routes.cli_doctor")

router = APIRouter(prefix="/api/cli")

# Static remediation copy keyed by ``Tier``. Kept BE-side (not FE) so the
# operator surface stays consistent across CLI stdout and web UI.
_REMEDIATION: Final[dict[str, str]] = {
    "sdk": "Reinstall the vendor SDK per docs/sdk/daheng-galaxy-sdk-manual.md, or verify BE.sdk_facade imports resolve in the current venv.",
    "config": "Run `worker-cli config show` to see the failing layer; fix the offending env var or user-layer override at /cli/settings.",
    "logroot": "Ensure the APP_LOG_ROOT directory is writable by the service account. On Windows: check ACL on the folder; on POSIX: chmod/chown.",
    "db-root": "Run `bin/db-bootstrap.py` to create or migrate the Root DB before starting workers.",
    "db-task": "Run `bin/db-bootstrap.py --tier task` to sync Task-DB migrations.",
}


def _probe_db_tiers() -> list[dict[str, Any]]:
    """Run ``bin/db-bootstrap.py::run_check`` directly (no SessionCtx needed).

    We cannot call ``BE.cli.common.doctor.run_doctor`` here because it
    requires a ``SessionCtx`` with a JSONL logger bound; the HTTP route
    is not inside a CLI session. Instead we replicate its one useful
    side effect (invoking ``run_check`` and normalising the summaries)
    without the CLI logging channel.
    """
    try:
        from BE.cli.common.doctor import _load_bootstrap_module

        bootstrap = _load_bootstrap_module()
        summaries, _healthy = bootstrap.run_check(db_root=None)
        normalised: list[dict[str, Any]] = []
        for s in summaries:
            tier = str(s.get("Tier", "db"))
            normalised.append(
                {
                    "Tier": f"db-{tier}" if not tier.startswith("db") else tier,
                    "IsHealthy": bool(s.get("IsHealthy", False)),
                    "Detail": s.get("Detail")
                    or f"Applied={s.get('AppliedVersions', [])}, Pending={s.get('PendingVersions', [])}",
                }
            )
        return normalised
    except Exception as exc:  # DB unreachable is a probe verdict, not a 500.
        return [
            {
                "Tier": "db-root",
                "IsHealthy": False,
                "Detail": f"DB bootstrap probe failed: {exc!r}",
            }
        ]


def _attach_remediation(probes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    for p in probes:
        if not p.get("IsHealthy"):
            p["Remediation"] = _REMEDIATION.get(p["Tier"], "See BE logs and spec/03-error-manage/ for triage steps.")
    return probes


@router.post("/doctor")
async def post_doctor(request: Request) -> JSONResponse:
    """Run all preflight probes and return per-check verdicts.

    Response payload shape:
        {
          "IsHealthy": bool,      # overall AND of probes
          "TotalProbes": int,
          "UnhealthyCount": int,
          "Probes": [
            {"Tier": str, "IsHealthy": bool, "Detail": str,
             "Remediation"?: str}
          ]
        }
    """
    correlation_id = ensure_correlation_id(request.headers.get(CORRELATION_HEADER))
    probes: list[dict[str, Any]] = []
    probes.append(_probe_sdk())
    probes.append(_probe_config())
    probes.append(_probe_log_root())
    probes.extend(_probe_db_tiers())
    probes = _attach_remediation(probes)
    unhealthy = [p for p in probes if not p.get("IsHealthy")]
    payload = {
        "IsHealthy": len(unhealthy) == 0,
        "TotalProbes": len(probes),
        "UnhealthyCount": len(unhealthy),
        "Probes": probes,
    }
    logger.info(
        "cli_doctor",
        extra={
            "CorrelationId": correlation_id,
            "operation": "POST /api/cli/doctor",
            "code": None,
            "subject_id": None,
            "unhealthy_count": len(unhealthy),
            "total_probes": len(probes),
        },
    )
    envelope = success(payload, requested_at=str(request.url))
    return JSONResponse(
        content=envelope.to_wire(),
        headers={CORRELATION_HEADER: correlation_id},
    )


__all__ = ["router"]
