# Plan 35 read-phase summary (v3.243.0)

Purpose: satisfy Plan 56 (read-phase kickoff for Plan 35). The read-phase output already lives in `00-error-contract.md`, `01-design-tokens.md`, `02-store-shape.md`, `03-current-rail.md`, and `04-slice-status.md` (all v3.208.0 - v3.209.0). This file consolidates the top gaps and names the next executable slice so Plan 56 can move to `done/`.

## Landed (per `04-slice-status.md`)

- Store: `rules-slice.ts` groups + reorder + lock/hide/merge/ungroup actions.
- UI: `LayersPanel`, `LayerRow`, `LayersToolbar`, `PropertiesPanel`, `InspectorSurface` all shipped, wired via `RightRail`.
- Tests: `rules-slice-groups.test.ts` 17/17, `LayersPanel.test.tsx` 3/3, `PropertiesPanel.test.tsx` 6/6.
- IO: `ruleset-io.ts` reads/writes `groups` with back-compat.
- Error registry: wire codes in `spec/21-app/40-error-manage.md:131-133`.

## Open gaps (blast radius ascending)

1. Spec docs: `spec/21-app/**` narrative for Layers-vs-Properties contract + drag/drop/group/merge (Plan 35 steps 24-25). Docs-only, no runtime risk. -> Plan 57 owns this.
2. Density audit: 19-screen sweep + duplicate-border fix (steps 5-6). Requires Playwright captures under `/tmp/browser/plan35/`. -> Plan 58 owns this.
3. Editor E2E: Playwright layers flow (step 21). Highest setup cost (dev-server boot, seeded state, fixtures). -> Plan 59 owns this and closes Plan 35 out (step 30 moves the plan file).

## Slice ordering for Plans 57 - 59

- Plan 57 (`57-plan35-layers-execution-slice-1.md`): spec-doc pass. No src/ churn. Est: 60m.
- Plan 58 (`58-plan35-layers-execution-slice-2.md`): density audit + duplicate-border fix. Est: 60m.
- Plan 59 (`59-plan35-layers-slice-3-and-closeout.md`): Playwright E2E + move plan 35 to `done/`. Est: 45m.

## Verification signal

- `ls .lovable/memory/v2/plan35/` shows 00, 01, 02, 03, 04, 25 memo files.
- No src/ or spec/ diff from this bump.
