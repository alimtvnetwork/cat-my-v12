# Security model

Status: Draft (Plan 28)

## Renderer hardening

- Load UI only via custom `app://` scheme; never `file://` or `http://` from disk.
- Content Security Policy (served with every response):
  `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:*; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'`.
- `contextIsolation: true`, Node integration disabled, remote module disabled.
- Preload script exposes ONLY `{port, token, version}` and a typed `invoke(method, params)` bridge; no filesystem, no `require`.
- Origin lock: shell IPC thread rejects any request whose `Origin` header is not `app://local` or absent (renderer sets it via preload fetch wrapper).

## Worker hardening

- Bind loopback only (`127.0.0.1`); worker refuses to start if a non-loopback interface is requested.
- Bearer token required on every request (see `04-ipc-contract.md`); constant-time compare.
- All params validated against JSON Schema before dispatch; unknown fields rejected (no `additionalProperties`).
- SQLite opened with `PRAGMA foreign_keys=ON` and `journal_mode=WAL`; audit sink append-only per `app/core/audit/sink_sqlite.py`.

## Secret storage

- Per-launch bearer: shell memory only; never written to disk or logs.
- Supabase publishable key: shipped in the bundle, treated as public per `spec/17-consolidated-guidelines/`.
- Updater public key: pinned in shell binary at build time.
- User credentials / OAuth tokens: OS keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service). Fallback: encrypted SQLite table keyed by OS user; never plaintext on disk.

## Threat model (short)

| Threat                              | Mitigation                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| Local malware reads renderer memory | OS process isolation; secrets scoped to shell process, not renderer              |
| Renderer XSS                        | Strict CSP, no inline script, all UI compiled from trusted source                |
| IPC replay                          | `cid` idempotency + 60 s LRU; bearer rotates per launch                          |
| Update MITM                         | Signature verification (Ed25519) against pinned key; HTTPS enforced              |
| Worker crash exposes state          | Supervisor respawn; renderer shows degraded banner; audit sink flushed pre-crash |

## Non-goals

- Defense against a root/administrator-privileged attacker on the same machine. Local users with admin rights can read all secrets; document this in the installer.
