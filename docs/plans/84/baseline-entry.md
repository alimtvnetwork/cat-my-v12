# Plan 84 entry baseline

Date: 2026-07-19. Version at snapshot: v3.735.0 (pinned in README). Last plan closed: Plan 83 (see `docs/plans/83/verification-2026-07-19.md` "Closure update").

## Static checks

| Check     | Command              | Result                         |
| --------- | -------------------- | ------------------------------ |
| Typecheck | `bunx tsgo --noEmit` | clean, no output               |
| Vitest    | `bunx vitest run`    | 150 files / 1053 tests passing |

## E2E (Playwright, DOM-only, serial mode)

Last recorded results from Plan 83 verification pass, still current (no e2e-relevant code changed between v3.710.0 and v3.735.0):

| Spec                                | Result |
| ----------------------------------- | ------ |
| `tests/e2e/seed_reset_flow.py`      | pass   |
| `tests/e2e/address_bar_deeplink.py` | pass   |
| `tests/e2e/error_history_hotkey.py` | pass   |
| `tests/e2e/copy_details_toast.py`   | pass   |

Constraint: the four scripts must run serially against a single Vite dev server. Parallel execution (`&`-backgrounded) starves the event loop and all four time out. Any Plan 84 runner script must not batch these.

Update at v3.737.0: `seed_reset_flow.py` re-verified 3/3 consecutive runs green (including the cold-compile first run) after replacing its fixed 2500 ms sleep with a deterministic `[seed/orchestrator] summary` console-line wait. Previously 1/2 under cold compile.

## Visual regression

Last green run: 48/48 passing at 1 percent pixel-diff tolerance, recorded in the v3.709.0 release note. Not rerun this pass (no visual-affecting code changes since v3.728.0 added the rules-mixed-status baselines). Refresh via `VISUAL_UPDATE=1 bun run visual:update` only when a UI change lands.

## Facade single-seam ratchet (spec 21 §52)

Current allowlist in `src/lib/projects/__tests__/facade-single-seam.test.ts` includes `lib/rules/audit-store.ts` and `lib/seed/telemetry-store.ts` (both per-tab ring buffers). New files under `src/lib/` that touch `window.localStorage` or `idb-keyval` directly will fail this ratchet and must go through a facade instead.

## Standing rules to carry into Plan 84

1. No retry logic under any circumstance (per `mem://preferences/no-retry.md`). Surface errors directly.
2. Root cause before fix, one sentence, then minimum correct change.
3. Bump minor version, update CHANGELOG.md, RELEASE_NOTES.md, and re-pin in README.md at the end of every task.
4. E2E specs run serially only.

## Open backlog into Plan 84

None tracked as of v3.735.0. Plan 84 scope is defined by the next user instruction.
