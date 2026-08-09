# ADR AI-02, web vs desktop storage

Status: Accepted, 2026-07-16
Supersedes: implicit "SQLite only" assumption in
`spec/23-app-db/*`, `spec/05-split-db-architecture/*`, and the
"writes to SQLite / Cloud" phrasing in Plan 64 step 85.

## Context

The app has two delivery targets:

1. Lovable-hosted web preview and published site (TanStack Start on
   Cloudflare Workers, Lovable Cloud / Supabase Postgres). This is the
   surface the AI iterates on and the surface end-users reach today.
2. Signed desktop bundle (Tauri host + Python sidecar, per ADR AI-01)
   for offline / air-gapped inspection cells.

Plan 64 step 85 landed the `projects`, `rulesets`, `project_rulesets`,
`project_categories`, `camera_settings`, `runs`, `shape_assets`,
`palette_layouts` tables plus the `recent_projects` view as a Postgres
migration under `supabase/migrations/`. The desktop-side spec
(`spec/23-app-db/01-root-db-schema.md`, `spec/05-split-db-architecture/*`)
still describes SQLite with the split-DB pattern. Left unresolved this
forks the schema into two truths.

## Options considered

- **Cloud Postgres only.** Simplest, but breaks the offline / signed
  desktop delivery in ADR AI-01 and the split-DB spec.
- **Local SQLite only.** Keeps the desktop story, but leaves the web
  preview with nowhere to persist projects / rule sets / shapes, which
  is what the AI actually iterates against.
- **Hybrid, Postgres canonical + SQLite mirror.** Web is the primary
  editor and source of truth; the desktop bundle receives a
  read-mostly SQLite mirror produced by the export / import path
  (`spec/21-app/shell/15-data-migration.md`, Plan 64 steps 86-88:
  Export JSON / YAML / SQLite Zip). Chosen.

## Decision

**Hybrid. Cloud Postgres is canonical. SQLite is a project-bundle
format used by the desktop shell and the Export SQLite Zip flow.**

- All server functions in `src/lib/*.functions.ts` write to Postgres
  via `requireSupabaseAuth` (RLS as the signed-in user) or, for
  privileged maintenance, a handler-local `supabaseAdmin` import.
- The Plan 64 step 85 migration
  (`supabase/migrations/20260716140404_plan64_step85_project_ruleset_bundle.sql`)
  is the authoritative DDL. Any schema drift is a Postgres migration,
  never a SQLite-only change.
- The SQLite schema in `spec/23-app-db/*` is now labelled "bundle
  format", not "runtime DB". Column names and types must match the
  Postgres tables one-for-one so an export can round-trip.
- Desktop offline mode: the Tauri shell opens a project by importing
  its SQLite bundle into a local WAL DB; edits sync back to Postgres
  on next online run via the same server fns (contract identical, only
  the fetch base URL differs).
- Split-DB layering (`spec/05-split-db-architecture/*`) applies to the
  desktop bundle only. In Cloud Postgres, isolation is enforced by
  RLS + owner scoping, not per-file WAL handles.

## Consequences

- Plan 64 step 85 is closed against Postgres, not SQLite. The step
  wording "writes to SQLite / Cloud" is narrowed to "writes to Cloud
  Postgres via server fns; SQLite bundle is produced by steps 86-88".
- `spec/23-app-db/01-root-db-schema.md` §4 stays valid as the bundle
  DDL contract; a follow-up spec pass will mark each section
  "Postgres canonical" or "SQLite bundle" without changing shape.
- `saveRule`, `createProject`, `runProject`, `compileShape`, and the
  clone-Rule-Set fns already target Postgres. Any remaining
  synthetic-id stubs (`recent-projects-store`, `rulesets-clone`,
  `run-project`, `projects` list) flip to real inserts against the
  step-85 tables, in the order Plan 64 already schedules.
- Desktop bundling (Tauri, ADR AI-01) is unblocked because the
  Postgres schema is frozen: the SQLite emitter can be generated
  from the Postgres DDL rather than hand-authored.

## Reversal cost

Low. Server-fn contracts are storage-agnostic; swapping the backing
store means re-pointing `context.supabase` at a different driver.
Estimated 2-3 engineering weeks including bundle emitter parity tests.

## Cross-references

- ADR AI-01 (`01-adr-shell-choice.md`): desktop host choice.
- `spec/21-app/shell/15-data-migration.md`: bundle import / export.
- `spec/23-app-db/01-root-db-schema.md`: bundle-format DDL.
- `spec/05-split-db-architecture/*`: applies to bundle only.
- Plan 64 steps 85, 86-88: Cloud writes + SQLite export / import.
