# Permissions and consent

Status: Draft (Plan 28)
Related: `tests/contract/test_consent.py`, `app/core/security/`

## Permission classes

| Class                               | OS surface                                              | Prompt                           | Persisted             |
| ----------------------------------- | ------------------------------------------------------- | -------------------------------- | --------------------- |
| Camera / capture device             | Windows MediaCapture, macOS AVCaptureDevice, Linux V4L2 | On first `capture.vendor.select` | Yes, per-device       |
| Filesystem (import/export)          | OS file dialog                                          | Per-action, native dialog        | No (per-action grant) |
| Network egress (updater, telemetry) | Firewall prompt on Windows                              | Installer time                   | Yes                   |
| Notifications                       | OS notification center                                  | On first `ops.notify.enable`     | Yes                   |
| Autostart                           | OS login-items registry                                 | Settings toggle                  | Yes                   |

## Consent lifecycle

1. UI calls `permissions.request` with class.
2. Shell shows OS-native prompt.
3. Result stored via `app/core/security/*` and mirrored to audit sink with
   `I_SEC_PERMISSION_GRANTED` / `I_SEC_PERMISSION_DENIED` codes.
4. Renderer subscribes to `permissions.stream` for live revocation.

## Revocation

- User can revoke any grant from `settings.security` (route to be added).
- Revocation writes `I_SEC_PERMISSION_REVOKED` and forces re-prompt on next use.
- OS-level revocation (e.g. macOS TCC reset) is detected on next capture and
  surfaces `E_SEC_PERMISSION_MISSING`.

## Contract tests

- Reuse `tests/contract/test_consent.py` — extend cases with the four
  permission classes above; each must round-trip through the audit sink.
- Add `E_SEC_PERMISSION_MISSING` to `spec/21-app/40-error-manage.md`.

## Non-goals

- No enterprise policy override in v1 (MDM / Group Policy). Tracked in
  `24-open-questions.md`.
