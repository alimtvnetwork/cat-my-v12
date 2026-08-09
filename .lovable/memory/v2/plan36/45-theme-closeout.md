# Plan 62 (theme tokens migration) close-out (v3.485.0)

## What landed

No token additions to `src/styles.css`. The full HMI token surface was
already present under `@theme inline` (see `40-token-map.md`), so this
slice only:

1. Documented every already-landed token in `40-token-map.md` with its
   utility class and semantic role.
2. Replaced hardcoded color utilities in the three highest-traffic
   offenders identified by `rg -c 'text-\[#|bg-\[#|text-white|bg-black' src/`:
   - `src/components/editor/canvas/SnapDebugHud.tsx` (19 hits, all
     `text-white/NN` on the snap debug HUD).
   - `src/routes/observability.sessions.$cliInvocationId.ipc.tsx` (8
     hits: `text-white/NN`, `bg-black/30`, `border-white/10`).
   - `src/routes/observability.sessions.$cliInvocationId.logs.tsx` (6
     hits: `text-white/NN`, `bg-black/30`, `border-white/10`).
     Mapping used the table in `40-token-map.md`.

## Offender count

- Before: 43 (`rg -n 'text-\[#|bg-\[#|text-white|bg-black' src/ | wc -l`).
- After: 10. Strict decrease: -33.
- Remaining 10 are one-per-file long-tail sites; carry to Plan 63 or a
  later hardening pass.

## Verification

- `bunx tsgo --noEmit`, exit 0.
- `bunx vitest run src/components/editor/canvas src/routes`, 18/18
  green (home-smoke + editor canvas suites).
- Playwright: `/tmp/browser/plan62/shot.py` on `/` at 1280x900,
  screenshot `home_after.png` shows Home hero, tiles, and
  getting-started list rendering with correct HMI ink and surface
  colors, no regressions.

## Scope

Files touched: 3 (`SnapDebugHud.tsx`, ipc route, logs route). No
shadcn variant edits. No `@theme` reordering; `@import` block untouched
at top of `src/styles.css`. No spec-row change this turn (design-tokens
row already lists the ca-\* surface as of v3.212.0).

## Next slice pointer

`.lovable/plans/pending/63-plan36-nav-sidebar-port.md`. Plan 36 stays
pending.
