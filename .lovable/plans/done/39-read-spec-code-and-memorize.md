# Read spec (coding-guidelines, error-manage, folder 21) + walk source, build memory

Slug: read-spec-code-and-memorize
Steps: 30
Status: pending
Created: 2026-07-16

## Context

Full onboarding sweep of the product spec and source so the agent has a
durable mental model. Reads `spec/02-coding-guidelines/`,
`spec/03-error-manage/`, and `spec/21-app/` in full, then walks `src/` and
related code, and lands the findings in `.lovable/memory/` files.

Captured inputs:

- Command: `.lovable/spec/commands/14-plan-30-read-spec-code-memory.md`
- Prior pending plans still open: 29, 32, 33, 35, 36, 37, 38 (listed in
  appended section below; not merged into the 30 steps).

## Steps

1. Read `spec/00-overview.md` and `spec/spec-index.md` for map of the tree.
2. Read every `.md` file in `spec/02-coding-guidelines/` root (overview, acceptance, consistency, condensed review guide).
3. Read every file in `spec/02-coding-guidelines/01-cross-language/`.
4. Read every file in `spec/02-coding-guidelines/02-typescript/` (primary stack).
5. Read every file in `spec/02-coding-guidelines/06-ai-optimization/` and `06-cicd-integration/`.
6. Read every file in `spec/02-coding-guidelines/08-file-folder-naming/` and `11-security/`.
7. Skim remaining language folders (03-golang, 04-php, 05-rust, 07-csharp, 09-powershell, 10-research) for cross-cutting rules only.
8. Read every file in `spec/03-error-manage/` root plus `01-error-resolution/`.
9. Read every file in `spec/03-error-manage/02-error-architecture/` and `03-error-code-registry/`.
10. Read `spec/17-consolidated-guidelines/00-strictly-avoid-quickref.md` and index to reconcile with 02+03.
11. Read `spec/21-app/01-initial-instructions.md` through `09-folder-layout-check.md`.
12. Read `spec/21-app/10-app-overview.md` through `17-parallelism-guarantees.md` (system + runtime).
13. Read `spec/21-app/20-folder-structure.md` through `27-config-surface.md` (data + config).
14. Read `spec/21-app/30-ui-overview.md` through `39-settings-screen.md` (UI screens).
15. Read `spec/21-app/40-error-manage.md` through `46-open-questions.md` (ops).
16. Read `spec/21-app/50-capture-modules.md` through `52-sdk-facade-pattern.md` (modules).
17. Read `spec/21-app/60-licensing.md` through `72-audit-persistence.md` (v2 + vendor + audit).
18. Read `spec/22-app-issues/`, `spec/23-app-db/`, `spec/24-app-ui-design-system/`, `spec/25-app-audit/` (leaf specs referenced by 21).
19. List `src/` top-level and inventory route/component/lib folders.
20. Read `src/routes/__root.tsx`, `src/router.tsx`, `src/routes/index.tsx` and every top-level route file.
21. Read `src/routes/api/**` (server routes / webhooks) if present.
22. Read every file in `src/components/` grouped by feature; note shadcn primitives vs app components.
23. Read every file in `src/lib/` and `src/hooks/` including `*.functions.ts` server functions.
24. Read `src/integrations/supabase/**` (client, admin, auth middleware, types).
25. Read `src/styles.css`, design tokens, and any theme/config under `src/` for the design system.
26. Diff spec §21 UI screens (31-39) against actual route files; list gaps in a subtask. See `./subtasks/39-read-spec-code-and-memorize/01-ui-gap-matrix.md`.
27. Diff spec §21 data/config (20-27) against `src/integrations/` + migrations; list gaps. See `./subtasks/39-read-spec-code-and-memorize/02-data-gap-matrix.md`.
28. Write `.lovable/memory/20-product-model.md` summarizing product, pipelines, DB split, worker pattern in <=200 lines.
29. Write `.lovable/memory/21-code-map.md` mapping each spec §21 screen/module to its source files, with unresolved gaps flagged.
30. Update `.lovable/memory/index.md` to link 20 + 21 + subtasks, then bump README/package/CHANGELOG minor version per lifecycle rule and stop.

## Verification

- Every file listed in steps 2-18 opened at least once (grep chat_search after run).
- `.lovable/memory/20-product-model.md` and `21-code-map.md` exist and are linked from `index.md`.
- Subtask files under `.lovable/plans/subtasks/39-read-spec-code-and-memorize/` exist for steps 26 and 27.
- Version bumped in README, package.json, CHANGELOG.
- Plan file moved from `pending/` to `done/` with `Status: completed` when finished.

## Appended from prior pending tasks

Still open in `.lovable/plans/pending/` (not merged; tracked separately):

- 29-denial-burst-threshold-tuning
- 32-sg-31-01-pattern-edge
- 33-plan-29-denial-burst-tuning-read-phase
- 35-ui-ux-photoshop-layers-overhaul
- 36-ui-app-shell-and-src-v3-port
- 37-home-dexter-ui-repair
- 38-read-memory-onboarding-and-audit
