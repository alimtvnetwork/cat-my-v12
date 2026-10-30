# processing-cli errors

Read the Task-tier `Error` table (migration 0029) so an AI can list
errors with stack traces step by step, without the browser. One SQL
owner: `BE/app/db/writers/error.py` — shared with the `POST /errors`
ingest route, so CLI and HTTP readouts cannot drift apart.

## Usage

    processing-cli errors list
    processing-cli errors list --limit 20 --level error --code E_BE_INTERNAL
    processing-cli errors show ABC12345
    processing-cli errors export --format json
    processing-cli errors export --format csv --level error

## Options

- `--db-root PATH` Override `APP_DB_ROOT` for this probe.
- `list --limit N` 1..200, default 50. Newest first, full stack traces.
- `list --code CODE` Exact Code match.
- `list --level LEVEL` error | warn | info.
- `list --session-id ID` Exact SessionId match.
- `list --correlation-id CID` Exact CorrelationId match.
- `show CORRELATION-ID` One error with its full stack trace.
- `export --format json|csv` Headless export. JSON mirrors the
  frontend `serializeErrorsToJson` shape (`exportedAt`, `count`,
  `errors`); CSV mirrors the frontend `CSV_COLUMNS` shape (the
  browser-only `id` column is empty server-side; `CorrelationId` is
  the server identity). CSV rides inside the envelope as
  `Results[0].csv` so the single-envelope stdout contract holds.

## Exit codes

Universal envelope, exit 0 on success. Unknown id (`E_BE_NOT_FOUND`)
and unbootstrapped DB (`E_BE_INTERNAL` with the `bin/db-bootstrap.py`
hint) are the expected failure paths.

Anchor: `02-spec/21-app/54-vision-system-and-error-management-instructions/readme.md` §10.
