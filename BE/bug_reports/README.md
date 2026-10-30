# Bug Reports — Email + Supabase Delivery (spec 54)

Greenfield package: before this work, email and Supabase had zero hits
in `src/`/`BE/`. This package adds them following AGM's pattern
(spec 54 §11), adapted to this stack (browser `--app` SPA + Python
backend on :8787, no Tauri bus).

## Flow (recording → email + Supabase → developer download)

```
Task-DB Error row (migration 0029, POST /errors ingest)
  → POST /bug-reports { correlation_id, channels: ["email", "supabase"] }
      → email: go-email-reader send (credentials owned by go-email-reader)
      → supabase: insert bug_reports row (+ bug_attachments rows)
  → developer: processing-cli bug-reports pending
  → developer: processing-cli bug-reports download <id> [--out file]
      (marks the row `downloaded`)
  → settings UI: /settings/bug-reporting (URL + key + test + send test)
```

Every delivery is appended to a JSONL audit trail outside the repo
tree (`<tmpdir>/cat-my-bug-reports-audit.jsonl`); audit failure never
masks a delivery result. Nothing is ever faked: a missing binary, an
unconfigured Supabase, or a failed upload returns a real error with a
non-zero exit / failure envelope.

## Email (go-email-reader pattern)

- Sending is delegated to the `go-email-reader` binary
  (`send --from --to --subject --body [--attach ...]`). Passwords live
  in go-email-reader's own SQLite store, RSA-OAEP-SHA256 encrypted.
  This package NEVER reads, holds, or forwards a password.
- Sender default: explicit `--from` > `CATMY_BUGREPORT_SENDER` >
  repo-secrets `11-go-email-reader/01-email-setup.json`
  `accounts[0].email` (non-secret field only).
- Recipient default: explicit `--to` > `CATMY_BUGREPORT_NOTIFIER` >
  repo-secrets `11-go-email-reader/02-default-notifier.json`
  `notifier_email`.
- Binary resolution: `PATH` > `GO_EMAIL_READER_BIN` >
  `~/workspace/go-email-reader/go-email-reader`. Missing binary =
  a setup error naming the install path, never a silent skip.
- Setup (user's machine): install go-email-reader, `go-email-reader
  add` an account, `go-email-reader notifier set --email <address>`.

## Supabase (plain PostgREST, no SDK — AGM pattern)

- Client: `BE/bug_reports/supabase_client.py` (stdlib `urllib` only).
  Headers `apikey` + `Authorization: Bearer`, 15s timeout, URL
  normalization (redundant `/rest/v1`, trailing slashes stripped).
- Error classification: timeout/connect → "project may be paused
  (free-tier)" hint, never blamed on the key; 401/403 → key/role
  hint; 404 → "run schema.sql" hint. Circuit breaker: 3 consecutive
  failures → 60s open.
- Settings file: `~/.config/cat-my-v12/supabase_config.json`
  (override `CATMY_SUPABASE_CONFIG`), written 0600. HONEST CAVEAT
  (same as AGM): the key is stored reversibly, not encrypted — the
  settings UI says so, and `GET /bug-reports/config` never returns it.
- Tables: `BE/bug_reports/schema.sql` — `bug_reports` (id,
  node/machine id, title, stack trace, status, created_at, ...) +
  `bug_attachments` (report FK, file name, storage path, note).
  Apply it in the Supabase dashboard SQL editor, then verify with
  `POST /bug-reports/test`. RLS permissive policies are commented
  out on purpose — tighten them for anything real.
- Attachments: the HTTP route carries attachment metadata as
  references only (it never accepts local file paths). The CLI
  `--attach` path sends bytes via email and, when a Storage bucket is
  configured, attempts a Storage upload; otherwise the Supabase row
  records a reference noting bytes traveled via email.

## Routes (all loopback-only, like /shutdown)

- `POST /bug-reports` — compose (from `correlation_id` or freeform)
  + deliver via `channels`.
- `GET /bug-reports/pending?limit=` — Supabase pending queue.
- `GET /bug-reports/config` — sanitized settings (no key).
- `POST /bug-reports/config` — save settings (blank key keeps stored).
- `POST /bug-reports/test` — reachability + table verification.

## CLI

- `processing-cli bug-reports pending [--limit N]`
- `processing-cli bug-reports download <id> [--out FILE]`
- `processing-cli bug-reports send --correlation-id CID [--to EMAIL]
  [--from EMAIL] [--attach FILE ...]`

## Codes (BE/errors/codes.py — the only place E_* literals live)

- `E_BUG_EMAIL_FAILED`, `E_BUG_SUPABASE_FAILED` (new).
- Validation → `E_BE_BAD_REQUEST`; unconfigured downstream →
  `E_BE_UNAVAILABLE`; unknown error/report → `E_BE_NOT_FOUND`.

## NOT verified at runtime (per program order)

No builds/tests until the end-of-tunnel wave. Python files were
syntax-checked only (`ast.parse`). End-of-tunnel must exercise:
`bin/db-bootstrap.py` (0029 present), `POST /bug-reports` round-trip
(email + Supabase), `processing-cli bug-reports pending/download/
send`, the settings UI save/test/send-test flow, and the
`openapi.snapshot.json` regeneration (new routes are not in the
snapshot yet — snapshot regen needs a running app).
