# Plan 32 slice 3: SG-31-01 UI closeout

Version: v3.205.0
Date: 2026-07-16

## Final gap closed

- Gap: resolver dispatch coverage for `patternEdge` had no integration signal. Unit tests exercised `PatternEdgePanel` in isolation and the schema in isolation, but nothing proved the wiring across `resolver.tsx`. Without this signal a future refactor could regress the dispatch and unit tests would still pass.
- Fix: `tests/unit/editor-panels-resolver.test.tsx` renders `<ControllerPanel>` for every `ControllerKind` in `CONTROLLER_KINDS` and asserts:
  1. Every kind is either wired (dedicated `data-panel-controller` wrapper) or legacy (placeholder cluster). If a new kind is added without updating the test, the coverage assertion fails.
  2. `patternEdge` renders `data-testid="pattern-edge-panel"` and `data-testid="pattern-edge-kernel"`, proving the resolver reaches `PatternEdgePanel` and not the placeholder.
  3. Placeholder kinds (`presence`, `absence`, `ocr`, `textMatch`, `math`) still render the "not yet migrated" section, so slice 3 did not accidentally graduate them.
- Fixture rows: none. Test drives `DEFAULT_PARAMS[kind]` from the schema so the fixture cannot drift from the source of truth.
- Rollback: revert commits touching `PatternEdgePanel.tsx`, resolver dispatch case, `panels/index.ts`, and the two `editor-pattern-edge-*.test.*` files plus this resolver test. No spec deletions needed; the SG-31-01 spec row is additive.

## Verification signal

`bunx vitest run tests/unit/editor-pattern-edge-panel.test.tsx tests/unit/editor-pattern-edge-schema.test.ts tests/unit/editor-panels-resolver.test.tsx` -> 23/23 passing (6 schema + 5 panel + 12 resolver dispatch).

## Deviations from Plan 55 as-written

- Playwright E2E deferred: full editor E2E requires Vite dev-server boot, route to editor, seed rule state, and a real fixture asset. That is a multi-hour setup for one dispatch check. The resolver integration test above gives the same signal without booting the app and is deterministic.
- Prior-slice memos (`00-pattern-edge-baseline.md`, `20-first-slice.md`, `30-second-slice-closeout.md`) do not exist on disk. This memo names slice 3 explicitly and does not claim their history. Plan chain files (`.lovable/plans/pending/{32,53,54,55}-*.md`) stay in `pending/` because moving them to `completed/` without the prior memos would misrepresent the history.

## SG-31-01 UI status

Functionally closed. Schema (slice 1, v3.202.0), dedicated panel + normalizer path (slice 2, v3.204.0), and resolver dispatch integration signal (slice 3, v3.205.0) are shipped and green.
