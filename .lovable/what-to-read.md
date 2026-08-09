# What To Read (AI Onboarding Map)

Read this file first when starting any task in this repo. It maps every folder and file the AI must consult before creating code, adding tests, adding features, or writing spec.

## Changelog

- 2026-08-10T04:01:00Z, Session V4: Write strictly-avoid.md, commit TS Enum refactors, prepare Query Wrapper spec, resolve `beFetch` dual-package hazard.
- 2026-08-09T19:38:00Z, Session V3: Fix UI overlap glitch, cleanup pycache from git, enforce enum/boolean rules.
- 2026-07-21T00:00:00Z, Plan 90 Steps 145-146 recorded (compare-sessions view, dev-frames toggle); memory index refreshed.

## 1. Read First (always, in order)

1. `readme.md` (root) - project status, ship state, audit banner, plan pointers.
2. `.lovable/what-to-read.md` (this file) - onboarding map.
3. `.lovable/memory/index.md` - master memory index; every memory file is listed here.
4. `.lovable/prompt.md` -> `.lovable/prompts/index.md` - prompt registry, latest `next-task` prompt.
5. `.lovable/coding-guidelines/coding-guidelines.md` - hard coding rules.
6. `agents.md` - agent operating rules for this repo.

## 2. Folder Structure

```
.
├── readme.md                     Root status + entry pointer
├── agents.md                     Agent operating contract
├── .lovable/                     AI control tree (memory, plans, prompts, spec commands)
│   ├── what-to-read.md           THIS FILE
│   ├── prompt.md                 -> prompts/index.md
│   ├── prompts/                  Numbered reusable prompts (write-memory, next-task, ...)
│   ├── memory/                   Persistent AI memory
│   │   ├── index.md              Master index (read first)
│   │   ├── 01-code-red.md        Hard prohibitions, size caps
│   │   ├── 02-naming.md          Naming rules
│   │   ├── 03-error-manage.md    Error architecture
│   │   ├── 04-design-system.md   Tokens, Tailwind v4
│   │   ├── 05a..05d              Pipeline, linters, scripts
│   │   ├── 06-spec-map.md        spec/ folder map
│   │   ├── 07-lovable-folder-guide.md
│   │   ├── 08-vision-inspection-app.md
│   │   ├── 09-enums-and-results-shape.md
│   │   └── v2/                   v2 backlog + scoring
│   ├── plans/                    Roadmap
│   │   ├── pending/              Active/queued plans
│   │   ├── done/                 Completed and archived plans
│   │   └── subtasks/
│   ├── issues/                   Open AI-tracked issues
│   ├── coding-guidelines/        Language + repo coding rules
│   ├── spec/commands/            Reusable spec/audit command prompts
│   └── ambiguity-questions/      Open questions blocking plan steps (answer before running blocked steps)
├── spec/                         Product + engineering spec (source of truth)
│   ├── 00-overview.md
│   ├── 01-spec-authoring-guide/
│   ├── 02-coding-guidelines/     Per-language guidelines
│   ├── 03-error-manage/          Error management contract
│   ├── 04-database-conventions/
│   ├── 05..17                    Architecture, design system, CI/CD, CLI, release
│   ├── 21-app/                   Vision Inspection app spec
│   ├── 22-app-issues/
│   ├── 23-app-db/                App DB schema
│   ├── 24-app-ui-design-system/
│   └── 25-app-audit/             Blind-AI audit artifacts + signoff
├── src/                          Frontend (TanStack Start, React 19, Tailwind v4)
│   ├── routes/                   File-based routes (see src/routes/readme.md)
│   ├── components/               UI components (hmi/, home/, ops/)
│   ├── hooks/                    React hooks
│   ├── integrations/supabase/    Supabase clients (client, client.server, auth)
│   ├── lib/                      Client-safe utils + *.functions.ts server fns
│   ├── router.tsx | start.ts | server.ts
│   └── styles.css                Tailwind v4 tokens
├── app/                          Python backend (capture, dispatcher, worker, core)
│   ├── ai/                       Gate + transport
│   ├── capture/                  Vendor SDK bridges (pylon, spinnaker, vimba)
│   ├── core/                     audit, config, errors, ids, io/migrations, security, telemetry
│   ├── dispatcher/               Loop, pool, snapshot, results
│   ├── rules/                    Rules engine + overrides
│   ├── supervisor/boot.py
│   └── worker/runner.py
├── tests/                        pytest + vitest
│   ├── unit/                     Unit tests (mirror app/ layout)
│   ├── integration/              Integration tests
│   ├── contract/                 Contract tests
│   ├── e2e/                      Playwright + axe a11y
│   └── reports/                  Test/audit reports
├── linters/                      Language rulesets (phpcs, sonarqube, stylecop, golangci)
├── linter-scripts/               CI/doc linter runners + tests
├── scripts/                      Repo maintenance (fix-repo, visibility-change, rescore)
├── supabase/                     Supabase config
└── assets/                       Static assets (numeric-prefixed)
```

## 3. Before You Do X, Read Y

| Task                                | Must-read (in this order)                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Any code change                     | `.lovable/memory/01-code-red.md`, `.lovable/coding-guidelines/coding-guidelines.md`, `spec/02-coding-guidelines/` (language-specific) |
| Add a feature                       | `.lovable/memory/index.md`, latest `.lovable/plans/pending/*.md`, relevant `spec/21-app/*.md`, `spec/22-app-issues/`                  |
| Add a unit test                     | `pytest.ini`, mirror layout under `tests/unit/`, follow `spec/04-database-conventions/04-testing-strategy.md` when DB-touching        |
| Add an integration/e2e test         | `tests/integration/` or `tests/e2e/` conventions; `tests/e2e/playwright_smoke.py` reference                                           |
| Write/edit a spec                   | `spec/01-spec-authoring-guide/`, `spec/_template.md`, `.lovable/memory/06-spec-map.md`                                                |
| DB schema / migration               | `spec/04-database-conventions/`, `spec/23-app-db/`, `app/core/io/migrations/`, GRANT + RLS rules in agent directives                  |
| UI change                           | `.lovable/memory/04-design-system.md`, `src/styles.css`, `spec/24-app-ui-design-system/`, `spec/07-design-system/`                    |
| Routing / server fn                 | `src/router.tsx`, `src/routes/readme.md`, TanStack Start rules in agent directives                                                    |
| Error handling                      | `.lovable/memory/03-error-manage.md`, `spec/03-error-manage/`, `app/core/errors/`                                                     |
| Naming (files, booleans, enums, DB) | `.lovable/memory/02-naming.md`, `.lovable/memory/09-enums-and-results-shape.md`                                                       |
| Vendor capture SDK work             | `.lovable/memory/08-vision-inspection-app.md`, `app/capture/vendor_*.py`, `spec/21-app/52-sdk-facade-pattern.md`                      |
| CI / linter change                  | `.lovable/memory/05b-linters.md`, `.lovable/memory/05c-linter-scripts.md`, `linter-scripts/`                                          |
| Write/end memory                    | `.lovable/prompts/` (write-memory prompt); write to files under `.lovable/`, never `mem://`                                           |

## 4. Hard Rules (excerpt, see memory 01-code-red)

- Functions <= 8 lines. Files <= 80-100 lines. No nested ifs.
- No `any` / `unknown` / open interfaces. Enums + constants in dedicated files.
- Never swallow errors. Follow `spec/03-error-manage/`.
- Never write memory to `mem://`. All persistent AI state lives under `.lovable/`.
- Never delete history: mark done, move to `## Completed` or `plans/done/`.
- Lowercase, hyphen-separated, numeric-prefixed filenames (`01-name.md`).
- Every new file under `.lovable/memory/` MUST be added to `.lovable/memory/index.md` in the same operation.

## 5. Where to Write New Artifacts

| Artifact         | Path                                                      |
| ---------------- | --------------------------------------------------------- |
| New memory topic | `.lovable/memory/XX-topic.md` + index entry               |
| New plan         | `.lovable/plans/pending/XX-name.md`                       |
| Completed plan   | move to `.lovable/plans/done/`                            |
| Reusable prompt  | `.lovable/prompts/XX-name.md` + `prompts/index.md`        |
| Spec             | `spec/<area>/XX-name.md` following `_template.md`         |
| Frontend code    | `src/` (routes, components, hooks, lib)                   |
| Backend code     | `app/` (module mirrors domain)                            |
| Tests            | `tests/{unit,integration,contract,e2e}/` mirroring source |
| Assets           | `assets/XX-folder/XX-file.<ext>`                          |

## 6. See Also

- `.lovable/memory/07-lovable-folder-guide.md` - structural guide to `.lovable/`
- `.lovable/memory/06-spec-map.md` - spec folder map
- `src/routes/readme.md` - route conventions
- `agents.md` - agent operating rules

## 7. Task Playbooks (step-by-step)

Every playbook starts with section 1 (Read First) and section 3 (Before You Do X). These add the concrete order of operations.

### 7.1 Create code (any change)

1. Read `.lovable/memory/01-code-red.md` and `.lovable/coding-guidelines/coding-guidelines.md`.
2. Read the language-specific rules in `spec/02-coding-guidelines/` (TS, Python, SQL, etc.).
3. Read `spec/03-error-manage/` and `.lovable/memory/03-error-manage.md` before touching any error path.
4. Check `.lovable/plans/pending/` for an active plan on the area you are editing; if one exists, follow its slice.
5. Locate the file. Frontend lives in `src/`, backend in `app/`. Keep functions <= 8 lines, files <= 80-100 lines, no nested ifs, no `any`, enums and constants in dedicated files.
6. Run `bunx tsgo --noEmit` (frontend) or `pytest -q` (backend) locally after the edit.

### 7.2 Add a unit test

1. Read `pytest.ini` (backend) or `vitest.config.ts` (frontend).
2. Read `spec/04-database-conventions/04-testing-strategy.md` if the code touches the DB.
3. Mirror the source layout:
   - Backend: `tests/unit/<module>/test_<file>.py` mirrors `app/<module>/<file>.py`.
   - Frontend: colocated `*.test.ts(x)` next to source, or `src/**/__tests__/*.test.tsx`.
4. One behavior per test, no shared mutable fixtures, no magic strings (import the enum or constant).
5. Run `bunx vitest run <path>` or `pytest tests/unit/<path>` to confirm.

### 7.3 Add an integration or e2e test

1. Read `tests/integration/README*` or `tests/e2e/README*` if present, and the reference `tests/e2e/playwright_smoke.py`.
2. Contract tests go under `tests/contract/`.
3. Playwright specs use stable `data-testid`, `get_by_role`, `aria-label`; never CSS-position selectors.
4. Reports land in `tests/reports/`.

### 7.4 Add a new feature

1. Read `.lovable/memory/index.md` and any plan under `.lovable/plans/pending/` that already covers the feature. If none exists, create `.lovable/plans/pending/XX-<name>.md`.
2. Cross-reference `spec/21-app/` (product spec) and `spec/22-app-issues/` (open gaps) for the feature area.
3. If the feature has UI, read `.lovable/memory/04-design-system.md`, `src/styles.css`, and `spec/24-app-ui-design-system/`.
4. If the feature has DB impact, read `spec/23-app-db/` and `spec/04-database-conventions/`, and add a migration under `app/core/io/migrations/`. Every new public table needs GRANT + RLS in the same migration.
5. Implement in small slices. Add unit tests in the same batch (see 7.2). Update the plan status.
6. When shipped, move the plan file from `.lovable/plans/pending/` to `.lovable/plans/done/`.

### 7.5 Write or edit a spec

1. Read `spec/01-spec-authoring-guide/` and `spec/_template.md`.
2. New spec files: `spec/<area>/XX-<slug>.md` with numeric prefix.
3. Register the file in `.lovable/memory/06-spec-map.md` in the same commit.
4. If the spec changes the roadmap, add or update a plan under `.lovable/plans/pending/`.

### 7.6 Persist memory (write-memory / end-memory)

1. Read `.lovable/prompts/` for the write-memory prompt.
2. All persistent AI state goes under `.lovable/`. Never write to `mem://`.
3. New memory files: `.lovable/memory/XX-<topic>.md`; add the entry to `.lovable/memory/index.md` in the same operation.
4. Never delete history: mark done, move to `## Completed`, or move plans/issues to `done/` / `solved-issues/`.

### 7.7 Reusable prompt

1. New prompt: `.lovable/prompts/XX-<name>.md`.
2. Register it in `.lovable/prompts/index.md` with id, trigger phrases, and purpose.
3. `.lovable/prompt.md` stays a top-level pointer to `prompts/index.md`.

### 7.8 Fix a bug / track an issue

1. Open issues live under `.lovable/issues/XX-<slug>.md`; solved ones move to `.lovable/solved-issues/` with `## Solution`, `## Iteration Count`, `## Learning`, `## What NOT to Repeat`.
2. Recurring forbidden patterns go into `.lovable/strictly-avoid.md` pointing at the solved issue.
3. CI/CD issues: `.lovable/cicd-issues/XX-<slug>.md` with a one-line summary in `.lovable/cicd-index.md`.

## Runtime data-source toggle

- Store: `src/lib/data-source/store.ts` (Seed vs Backend + persisted base URL).
- HTTP client: `src/lib/http/client.ts` (`apiFetch` = `fetch(resolveBackendUrl(path))`).
- UI: `src/components/data-source/DataSourceToggle.tsx`; Settings card in `src/routes/settings.index.tsx` (Data source group).
- Seed integration: `src/lib/seed/index.ts` reads `resolveBackendUrl("/api/seed")` when the seed provider is switched to `remote`.
- Write gate: `src/lib/data-source/gate.ts` (`runBackendWrite`) is the single seam every mutating call must pass through.
