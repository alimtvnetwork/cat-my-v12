"""Role-gated settings persistence (SQLite).

Persists camera/trigger/lighting config with two invariants:
  1. Reads require any authenticated session (`operator` or `admin`).
  2. Writes require the `admin` role via `require_role(token, "admin")`.

Roles live in a dedicated `user_roles` table — NEVER on a user/profile
row — per the project's separate-roles-table security rule (privilege-
escalation prevention). Role denials surface as `RoleDeniedError` with a
stable `code=E_SEC_ROLE_DENIED` and log the caller for the audit trail.
"""
from __future__ import annotations

import json
import logging
import sqlite3
import time
from app.core.db import safe_execute
from dataclasses import dataclass
from typing import Any, Literal

from app.core.security.auth_surface import (
    NotAuthenticatedError,
    RoleDeniedError,
    require_role,
    get_auth_surface,
)
from app.core.security.audit_sink import (
    AuditSink,
    CODE_ADMIN_WRITE,
    CODE_NOT_AUTHENTICATED,
    CODE_ROLE_DENIED,
    CODE_UNKNOWN_DEVICE,
)
from app.core.security.remediation import DenialRateLimiter

log = logging.getLogger("ca.settings.store")

Section = Literal["camera", "trigger", "lighting", "security", "capture", "audit"]
ALLOWED_SECTIONS: tuple[Section, ...] = (
    "camera", "trigger", "lighting", "security", "capture", "audit",
)


# Defaults for the `security` section — matches the historical hard-coded
# constants in `DenialRateLimiter` so existing behaviour is preserved when
# the section is absent.
SECURITY_DEFAULTS: dict[str, int] = {
    "denial_threshold": 5,
    "denial_window_seconds": 60,
}


class InvalidSecurityError(ValueError):
    """Security section payload violates the v2.0.3 contract (spec 69 §1).

    Raised at write time so bad values NEVER reach persistence, instead of
    surfacing late from `load_security_thresholds`.
    """

    code = "E_CFG_INVALID_SECURITY"

MIN_SECURITY_VALUE = 1

def _validate_security_payload(value: dict[str, Any]) -> None:
    """Enforce spec 69 §1: positive ints, no bools, known keys only."""
    if not isinstance(value, dict):
        raise InvalidSecurityError(f"security payload must be a dict, got {type(value).__name__}")
    for k, v in value.items():
        if k not in SECURITY_DEFAULTS:
            raise InvalidSecurityError(f"security.{k} is not a recognised key")
        if isinstance(v, bool) or not isinstance(v, int) or v < MIN_SECURITY_VALUE:
            raise InvalidSecurityError(
                f"security.{k} must be an int >= {MIN_SECURITY_VALUE}, got {v!r}"
            )


# Retention policy payload keys (spec 51 §Retention + spec 68 §68.1).
RETENTION_KEYS: tuple[str, ...] = ("enabled", "policy", "cadenceHours")
RETENTION_POLICIES: tuple[str, ...] = (
    "RetentionShort", "RetentionStandard", "RetentionLong", "RetentionForensic",
)
MIN_RETENTION_HOURS = 1
MAX_RETENTION_HOURS = 168


class InvalidRetentionError(ValueError):
    """Retention section payload violates spec 51 §Retention.

    Raised at write time so bad values never reach persistence.
    """

    code = "E_CFG_INVALID_RETENTION"


def _validate_retention_payload(value: dict[str, Any]) -> None:
    if not isinstance(value, dict):
        raise InvalidRetentionError(
            f"retention payload must be a dict, got {type(value).__name__}"
        )
    for k in value:
        if k not in RETENTION_KEYS:
            raise InvalidRetentionError(f"audit.retention.{k} is not a recognised key")
    if "enabled" in value and not isinstance(value["enabled"], bool):
        raise InvalidRetentionError("audit.retention.enabled must be bool")
    if "policy" in value and value["policy"] not in RETENTION_POLICIES:
        raise InvalidRetentionError(
            f"audit.retention.policy must be one of {RETENTION_POLICIES}, got {value['policy']!r}"
        )
    if "cadenceHours" in value:
        v = value["cadenceHours"]
        if isinstance(v, bool) or not isinstance(v, int) or v < MIN_RETENTION_HOURS or v > MAX_RETENTION_HOURS:
            raise InvalidRetentionError(
                f"audit.retention.cadenceHours must be int in [{MIN_RETENTION_HOURS}, {MAX_RETENTION_HOURS}], got {v!r}"
            )


# Vendor selector for `capture` section. Anchored by
# spec/21-app/63-v2-vendor-pylon.md, 11-vendor-spinnaker.md, 12-vendor-vimba.md.
SUPPORTED_VENDORS: tuple[str, ...] = ("pylon", "spinnaker", "vimba")
CAPTURE_DEFAULTS: dict[str, Any] = {"vendor": "pylon"}



# Stable code for callers refused because they are actively bursting denials.
CODE_RATE_LIMITED = "E_SEC_RATE_LIMITED"


class UnknownSectionError(ValueError):
    code = "E_CFG_UNKNOWN_SECTION"


class RateLimitedError(PermissionError):
    """Raised when a caller is temporarily blocked by the denial burst detector."""

    code = CODE_RATE_LIMITED


@dataclass
class SettingsStore:
    conn: sqlite3.Connection
    audit: AuditSink | None = None
    rate_limiter: DenialRateLimiter | None = None

    def __post_init__(self) -> None:
        safe_execute(self.conn, 
            """
            CREATE TABLE IF NOT EXISTS settings (
                section TEXT PRIMARY KEY,
                value_json TEXT NOT NULL,
                updated_at INTEGER NOT NULL,
                updated_by TEXT NOT NULL
            )
            """
        )
        # Roles in their OWN table — never on a user/profile row.
        safe_execute(self.conn, 
            """
            CREATE TABLE IF NOT EXISTS user_roles (
                user_id TEXT NOT NULL,
                role TEXT NOT NULL,
                PRIMARY KEY (user_id, role)
            )
            """
        )
        self.conn.commit()

    def _audit(self, code: str, subject: str, *, user_id: str | None, detail: str = "") -> None:
        if self.audit is None:
            return
        try:
            self.audit.record(code, subject, user_id=user_id, detail=detail)
        except Exception as exc:
            log.exception("settings_store.audit_failed", extra={"err": str(exc)})
            # Sink already logs+re-raises internally; catching here would hide
            # the failure. Re-raise so operators see the audit outage.
            raise

    # ---- reads: any authenticated session ----
    def read(self, token: str | None, section: Section) -> dict[str, Any] | None:
        if section not in ALLOWED_SECTIONS:
            raise UnknownSectionError(section)
        try:
            session = get_auth_surface().current(token)
        except NotAuthenticatedError:
            self._audit(CODE_NOT_AUTHENTICATED, f"settings:{section}",
                        user_id=None, detail="read")
            raise
        row = safe_execute(self.conn, 
            "SELECT value_json FROM settings WHERE section=?", (section,)
        ).fetchone()
        log.info("settings.read user=%s section=%s hit=%s",
                 session.user_id, section, bool(row))
        return json.loads(row[0]) if row else None

    # ---- writes: admin only ----
    def write(self, token: str | None, section: Section, value: dict[str, Any]) -> None:
        if section not in ALLOWED_SECTIONS:
            raise UnknownSectionError(section)
        # Gate 1: resolve caller identity so the rate-limiter has a user_id
        # to key on BEFORE we run the admin-role check. Unauthenticated
        # callers still fall through to require_role() below so the audit
        # code stays consistent.
        pre_uid: str | None = None
        try:
            pre_uid = get_auth_surface().current(token).user_id
        except NotAuthenticatedError:
            pre_uid = None
        # Gate 2: refuse bursting users up-front — closed-loop remediation.
        if pre_uid and self.rate_limiter is not None and self.rate_limiter.is_rate_limited(pre_uid):
            self._audit(CODE_RATE_LIMITED, f"settings:{section}",
                        user_id=pre_uid, detail="denial burst threshold exceeded")
            log.warning("settings.write_rate_limited user=%s section=%s", pre_uid, section)
            raise RateLimitedError(f"user {pre_uid} rate-limited")
        try:
            session = require_role(token, "admin")
        except NotAuthenticatedError:
            self._audit(CODE_NOT_AUTHENTICATED, f"settings:{section}",
                        user_id=None, detail="write")
            raise
        except RoleDeniedError:
            self._audit(CODE_ROLE_DENIED, f"settings:{section}",
                        user_id=pre_uid, detail="write requires admin")
            raise
        # Spec 69 §1: validate `security` payload BEFORE we touch the row so
        # bad values never reach persistence. Non-security sections keep
        # their historical write-through behaviour.
        if section == "security":
            _validate_security_payload(value)
        # Spec 69 §2: read prior under the same connection so the audit
        # detail carries the true prior/next diff. `sqlite3` in the default
        # isolation level opens an implicit transaction on the next write,
        # so this SELECT sees a stable snapshot.
        prior_row = safe_execute(self.conn, 
            "SELECT value_json FROM settings WHERE section=?", (section,)
        ).fetchone()
        prior_value: dict[str, Any] | None = (
            json.loads(prior_row[0]) if prior_row else None
        )
        payload = json.dumps(value, sort_keys=True)
        safe_execute(self.conn, 
            """
            INSERT INTO settings(section, value_json, updated_at, updated_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(section) DO UPDATE SET
              value_json=excluded.value_json,
              updated_at=excluded.updated_at,
              updated_by=excluded.updated_by
            """,
            (section, payload, int(time.time()), session.user_id),
        )
        self.conn.commit()
        log.info("settings.write user=%s section=%s bytes=%d",
                 session.user_id, section, len(payload))
        if section == "security":
            # Spec 69 §2: dedicated subject + prior/next JSON detail so the
            # audit trail shows exactly what changed, not just the byte count.
            self._audit(
                CODE_ADMIN_WRITE,
                "settings.security.denial",
                user_id=session.user_id,
                detail=json.dumps(
                    {"prior": prior_value, "next": value}, sort_keys=True
                ),
            )
            # Spec 69 §2: hot-reload the in-process limiter so the very next
            # request sees the new thresholds. No process restart permitted.
            if self.rate_limiter is not None:
                try:
                    apply_security_settings(self, token, self.rate_limiter)
                except Exception as exc:
                    log.exception("settings.security.hot_reload_failed", extra={"err": str(exc)})
                    raise
        else:
            self._audit(CODE_ADMIN_WRITE, f"settings:{section}",
                        user_id=session.user_id, detail=f"bytes={len(payload)}")

    # ---- device selection: admin only, dotted subject ----
    def write_capture_device(
        self, token: str | None, vendor: str, serial: str
    ) -> dict[str, Any]:
        """Persist operator device selection into `capture` section.

        Emits `I_SEC_ADMIN_WRITE` with subject `settings.capture.device` and
        prior/next JSON so the audit row shows exactly which (vendor, serial)
        binding changed. Anchored by spec/21-app/67-v2-discovery-contract.md
        §Select and Plan 25 SS-08.
        """
        if not isinstance(vendor, str) or vendor not in SUPPORTED_VENDORS:
            raise UnsupportedVendorError(
                f"capture.vendor must be one of {SUPPORTED_VENDORS}, got {vendor!r}"
            )
        if not isinstance(serial, str) or not serial.strip():
            raise InvalidSecurityError("capture.device.serial must be a non-empty string")
        # Gate identity + rate-limit first (mirrors write()).
        pre_uid: str | None = None
        try:
            pre_uid = get_auth_surface().current(token).user_id
        except NotAuthenticatedError:
            pre_uid = None
        if pre_uid and self.rate_limiter is not None and self.rate_limiter.is_rate_limited(pre_uid):
            self._audit(CODE_RATE_LIMITED, "settings.capture.device",
                        user_id=pre_uid, detail="denial burst threshold exceeded")
            raise RateLimitedError(f"user {pre_uid} rate-limited")
        try:
            session = require_role(token, "admin")
        except NotAuthenticatedError:
            self._audit(CODE_NOT_AUTHENTICATED, "settings.capture.device",
                        user_id=None, detail="device_write")
            raise
        except RoleDeniedError:
            self._audit(CODE_ROLE_DENIED, "settings.capture.device",
                        user_id=pre_uid, detail="device_write requires admin")
            raise
        # Spec 66 §Operator selection contract: reject unknown (vendor, serial)
        # BEFORE persistence so a typo cannot silently boot a phantom device.
        # Imported lazily so tests can monkeypatch this module-level symbol.
        from app.capture.vendor_discovery import resolve_selection
        from app.capture.vendor_device_io import (
            CaptureAdapterError,
            E_CFG_UNKNOWN_DEVICE,
        )
        try:
            resolve_selection(vendor, serial)
        except CaptureAdapterError as exc:
            if getattr(exc, "code", None) == E_CFG_UNKNOWN_DEVICE:
                self._audit(
                    CODE_UNKNOWN_DEVICE,
                    "settings.capture.device",
                    user_id=session.user_id,
                    detail=json.dumps(
                        {"vendor": vendor, "serial": serial}, sort_keys=True
                    ),
                )
            raise
        prior_row = safe_execute(self.conn, 
            "SELECT value_json FROM settings WHERE section=?", ("capture",)
        ).fetchone()
        prior_value: dict[str, Any] = json.loads(prior_row[0]) if prior_row else {}
        next_value = dict(prior_value)
        next_value["vendor"] = vendor
        next_value["serial"] = serial
        payload = json.dumps(next_value, sort_keys=True)
        safe_execute(self.conn, 
            """
            INSERT INTO settings(section, value_json, updated_at, updated_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(section) DO UPDATE SET
              value_json=excluded.value_json,
              updated_at=excluded.updated_at,
              updated_by=excluded.updated_by
            """,
            ("capture", payload, int(time.time()), session.user_id),
        )
        self.conn.commit()
        log.info("settings.capture.device user=%s vendor=%s serial=%s",
                 session.user_id, vendor, serial)
        self._audit(
            CODE_ADMIN_WRITE,
            "settings.capture.device",
            user_id=session.user_id,
            detail=json.dumps(
                {
                    "prior": {
                        "vendor": prior_value.get("vendor"),
                        "serial": prior_value.get("serial"),
                    },
                    "next": {"vendor": vendor, "serial": serial},
                },
                sort_keys=True,
            ),
        )
        return next_value

    # ---- retention policy: admin only, dotted subject ----
    def write_retention_policy(
        self, token: str | None, policy: dict[str, Any]
    ) -> dict[str, Any]:
        """Persist audit retention policy into `audit` section.

        Anchor: spec/21-app/51-security-and-config-modules.md §Retention +
        spec/21-app/68-v2-audit-retention.md §68.3. Admin-gated;
        emits `I_SEC_ADMIN_WRITE` with subject `settings.audit.retention`
        and prior/next JSON on success. `E_SEC_NOAUTH` / `E_SEC_ROLE_DENIED`
        are audited and the write NEVER lands on denial.
        """
        _validate_retention_payload(policy)
        pre_uid: str | None = None
        try:
            pre_uid = get_auth_surface().current(token).user_id
        except NotAuthenticatedError:
            pre_uid = None
        if pre_uid and self.rate_limiter is not None and self.rate_limiter.is_rate_limited(pre_uid):
            self._audit(CODE_RATE_LIMITED, "settings.audit.retention",
                        user_id=pre_uid, detail="denial burst threshold exceeded")
            raise RateLimitedError(f"user {pre_uid} rate-limited")
        try:
            session = require_role(token, "admin")
        except NotAuthenticatedError:
            self._audit(CODE_NOT_AUTHENTICATED, "settings.audit.retention",
                        user_id=None, detail="retention_write")
            raise
        except RoleDeniedError:
            self._audit(CODE_ROLE_DENIED, "settings.audit.retention",
                        user_id=pre_uid, detail="retention_write requires admin")
            raise
        prior_row = safe_execute(self.conn, 
            "SELECT value_json FROM settings WHERE section=?", ("audit",)
        ).fetchone()
        prior_value: dict[str, Any] = json.loads(prior_row[0]) if prior_row else {}
        next_value = dict(prior_value)
        next_value.update(policy)
        payload = json.dumps(next_value, sort_keys=True)
        safe_execute(self.conn, 
            """
            INSERT INTO settings(section, value_json, updated_at, updated_by)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(section) DO UPDATE SET
              value_json=excluded.value_json,
              updated_at=excluded.updated_at,
              updated_by=excluded.updated_by
            """,
            ("audit", payload, int(time.time()), session.user_id),
        )
        self.conn.commit()
        log.info("settings.audit.retention user=%s policy=%s",
                 session.user_id, next_value)
        self._audit(
            CODE_ADMIN_WRITE,
            "settings.audit.retention",
            user_id=session.user_id,
            detail=json.dumps(
                {"prior": prior_value, "next": next_value}, sort_keys=True
            ),
        )
        return next_value

    def read_retention_policy(self, token: str | None) -> dict[str, Any]:
        """Read audit retention policy; empty dict when absent."""
        return self.read(token, "audit") or {}




def load_security_thresholds(store: "SettingsStore", token: str | None) -> dict[str, int]:
    """Resolve the tunable denial-burst thresholds.

    Missing rows or missing keys fall back to `SECURITY_DEFAULTS` — never
    None — so callers always get a usable pair of ints. Invalid types
    surface as `ValueError` (silent-failure is not acceptable per the
    remediation contract).
    """
    raw = store.read(token, "security") or {}
    out = dict(SECURITY_DEFAULTS)
    for k in SECURITY_DEFAULTS:
        if k in raw:
            v = raw[k]
            if not isinstance(v, int) or isinstance(v, bool) or v <= 0:
                raise ValueError(f"security.{k} must be a positive int, got {v!r}")
            out[k] = v
    log.info("settings.security_thresholds threshold=%d window=%ds",
             out["denial_threshold"], out["denial_window_seconds"])
    return out


def apply_security_settings(
    store: "SettingsStore", token: str | None, limiter: DenialRateLimiter
) -> dict[str, int]:
    """Read the `security` section and retune `limiter` in place."""
    cfg = load_security_thresholds(store, token)
    limiter.reload(
        threshold=cfg["denial_threshold"],
        window_seconds=cfg["denial_window_seconds"],
    )
    return cfg


class UnsupportedVendorError(ValueError):
    """Vendor selector is not in `SUPPORTED_VENDORS`. NEVER fall back silently."""

    code = "E_CFG_UNSUPPORTED_VENDOR"


def load_capture_settings(store: "SettingsStore", token: str | None) -> dict[str, Any]:
    """Resolve the `capture` section (vendor selector today; more later).

    Missing section or missing keys fall back to `CAPTURE_DEFAULTS`. An
    unknown vendor is a HARD error (`UnsupportedVendorError`) so a typo in
    the settings row cannot silently boot the wrong adapter — the operator
    sees `E_CFG_UNSUPPORTED_VENDOR` in the audit trail instead of a
    surprise vendor at grab time.
    """
    raw = store.read(token, "capture") or {}
    out = dict(CAPTURE_DEFAULTS)
    if "vendor" in raw:
        v = raw["vendor"]
        if not isinstance(v, str) or v not in SUPPORTED_VENDORS:
            raise UnsupportedVendorError(
                f"capture.vendor must be one of {SUPPORTED_VENDORS}, got {v!r}"
            )
        out["vendor"] = v
    log.info("settings.capture vendor=%s", out["vendor"])
    return out



