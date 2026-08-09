# SS-02 — Security Stack Re-Audit (v1.15)

Slug: security
Parent: 11-spec-vs-code-reaudit-v1.15
Status: pending
Created: 2026-07-12

## Scope

Audit `spec/21-app/27-security.md` (or equivalent) against post-v1 modules:

- `app/core/security/auth_surface.py`
- `app/core/security/audit_sink.py`
- `app/core/security/audit_cli.py`
- `app/core/security/remediation.py`
- `app/core/config/settings_store.py` (role gate + rate-limit wiring)
- `app/core/security/{consent,consent_sqlite,tokens}.py`

## Checks

1. `AuthSurface` / `require_role` contract documented in spec.
2. `user_roles` table matches `<user-roles>` memory rule (separate table, security-definer function, RLS enabled).
3. `audit_log` append-only contract + event codes (`E_SEC_ROLE_DENIED`, `E_SEC_NOAUTH`, `I_SEC_ADMIN_WRITE`, `W_SEC_DENIAL_BURST`, `E_SEC_RATE_LIMITED`) all specified.
4. `DenialRateLimiter` sliding-window semantics documented (threshold, window, idempotency).
5. `audit_cli` read-only enforcement (`?mode=ro`) noted.
6. Timing-safe token comparison still cited in spec.

## Output

Findings → `.lovable/memory/audit/v1.15.0/27-security.md` with Severity/Impact/Proposed-correction.
