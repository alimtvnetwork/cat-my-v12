# Subtask: 14-email-supabase-reporting

See plan: .ai-memory/plans/pending/54-vision-system-and-error-management-instructions.md

Status: COMPLETE — implementation on origin/main, not verified at
runtime (per program order: no builds/tests until end of tunnel).

## What was built (greenfield; email + Supabase had 0 hits before)

- `BE/bug_reports/` (new package): `config.py` (resolution: explicit >
  env > repo-secrets non-secret fields; Supabase settings file 0600 in
  app-data), `supabase_client.py` (stdlib PostgREST, AGM header scheme,
  15s timeout, URL normalization, classified errors, circuit breaker),
  `schema.sql` (bug_reports + bug_attachments), `email_sender.py`
  (delegates to the go-email-reader binary; never touches passwords),
  `reports.py` (compose from Task-DB Error row + email/Supabase
  delivery + tempdir JSONL audit), `README.md` (flow + setup + honest
  caveats).
- `BE/routes/bug_reports.py` (new, loopback-only): POST /bug-reports
  (compose + deliver via channels), GET /bug-reports/pending,
  GET/POST /bug-reports/config (sanitized; blank key keeps stored),
  POST /bug-reports/test (reachability + table verification).
- `BE/cli/processing/commands/bug_reports.py` (new):
  `processing-cli bug-reports pending/download/send`.
- Wiring: `BE/main.py` (router mount), `BE/cli/processing/main.py`
  (command registration), `BE/errors/codes.py` (E_BUG_EMAIL_FAILED,
  E_BUG_SUPABASE_FAILED).
- Frontend: `src/components/settings/BugReportingSettings.tsx` (new:
  Supabase URL/key/role/enabled + test + email readiness + send-test),
  `src/routes/settings/bug-reporting.tsx` (new route),
  `src/components/settings/SettingsSidenav.tsx` (one nav entry added).

## Deliberate limits (not silently skipped)

- HTTP route never accepts local attachment paths (path-traversal
  safety); attachment bytes travel via CLI `--attach` (email) and via
  Supabase Storage upload attempt when a bucket is configured,
  otherwise as reference rows noting bytes went via email.
- Supabase key is stored reversibly (0600), same as AGM — stated in
  the UI + README, never in git, never returned by GET /config.
- RLS permissive policies are commented out in schema.sql on purpose
  (tighten for anything real).
- `openapi.snapshot.json` not regenerated (needs a running app) —
  owed to the end-of-tunnel wave.
- Recording-mode ("RECORD BUG") button wiring to POST /bug-reports is
  NOT done here: the recorder components are outside this
  workstream's file ownership; the route + CLI are ready for that
  wiring as a follow-up.

## End-of-tunnel checks owed

- POST /bug-reports round-trip (email + Supabase), pending/download/
  send CLI runs, settings UI save/test/send-test flow, schema.sql
  applied + tables verified, snapshot regen.
