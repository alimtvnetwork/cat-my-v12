# Command 37 - JSON seedable config facade UI

Scope: every UI surface that needs demo or test data, especially UI Improvements V4 surfaces from Plans 79, 80, 82, 83, and the new Plan 86.

## Command

Use JSON seedable config for all UI seed values, routed through facade APIs, so every UI can be tested now and later swapped to real API endpoints without rewriting components.

## When it applies

- Any new or changed UI that renders projects, rules, rule sets, categories, cameras, mic settings, swatches, samples, settings, properties panes, command entries, error states, empty states, badges, rows, cards, modals, drawers, palettes, or editor overlays.
- Any seed, fixture, story, route preview, Playwright setup, or unit test that needs domain data.

## Rules

1. Components, routes, hooks, and tests must consume domain data through facades, not ad-hoc literals, direct IndexedDB, direct local storage, or one-off in-component arrays.
2. Seed values live in JSON config bundles with stable ids and explicit relationships.
3. A seed orchestrator fans JSON slices into each facade idempotently.
4. Every screen must have a named seeded profile that makes it testable on a fresh install.
5. Facade APIs must remain compatible with future real endpoints.
6. Failures in seeding or facade writes must route through the existing error funnel with actionable context.

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
