# Command 26: Seed UI data through a facade

Scope: every UI screen that needs demo/preview data.
Rule: seed values must load through a swappable facade (JSON file or repository facade per spec 21 file 52), never hard-coded inline in components. Concrete backing (bundled JSON now, remote API later) must be replaceable without touching UI code.
When it applies: any new "seeding for UI" work, project/category/rule sample data, and refactors of existing hard-coded demo data.

## v2 Addendum (Plan 86 Step 45, 2026-07-19)

This command is realized by the v2 seed contract described in
`spec/21-app/53-ui-seed-facade.md` Section 0. Concretely:
`src/lib/seed/data/bundle.v2.json` (validated by
`src/lib/seed/schemas-v2.ts`), applied via
`src/lib/seed/orchestrator-v2.ts` and the frozen
`cmd:apply-seed-profile` command, with reads through
`src/lib/facades/slice-facades.ts` + `useFacadeOrStore`. Profiles
are frozen at 6. See `SS-08-frozen-id-conventions.md`,
`SS-09-facade-contract-additions.md`, and
`SS-10-frozen-seed-surface-matrix.md` under
`.lovable/plans/subtasks/86-ui-v4-json-seed-facade-completion/`.
Pre-v2 references in this file (bundle.json, per-slice bootstrap,
on-boot fan-out, "seed if empty") are RETIRED.
