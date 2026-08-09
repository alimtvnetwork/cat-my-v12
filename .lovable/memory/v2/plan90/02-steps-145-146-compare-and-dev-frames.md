# Plan 90 Steps 145-146 (session note, 2026-07-21)

## Step 145 - Compare-sessions split view

- Route: `src/routes/cli.sessions.compare.tsx` at `/cli/sessions/compare?a=<id>&b=<id>`.
- `validateSearch` gates ids to positive-integer strings (mirrors drill-down).
- Per side: `useServerFn(getObservabilitySessions)` list-and-find + `useServerFn(getObservabilitySessionLogs)` `tail=2000`.
- `summarizeLogs` buckets per level (error/warn/info/debug/other), captures `IsTruncated`, exposes first error line.
- `DiffRow` marks divergence via `data-diff="1"` + amber ring (color-independent a11y).
- `IdPickerBar` swap button rewrites `?a`/`?b` with `replace: true`.
- Empty/loading/not-found reuse `EmptyState` (testids `cli-compare-empty`, `cli-compare-not-found`).
- `logKey()` returns fresh random key for pending sides (never falsely equate loading pane to loaded).

## Step 146 - Operator toggle "Show developer stack frames"

- Hook: `src/hooks/use-show-dev-frames.ts` (`useShowDevFrames`, key `cli.showDevFrames`, default `true`).
- SSR-safe: `useState` seeds `DEFAULT_SHOW`, reconcile via `useEffect` gated on `useHydrated()` from `@tanstack/react-router`.
- Same-tab sync via `cli:showDevFrames` CustomEvent; cross-tab via native `storage` event.
- Wired into `src/components/errors/EnvelopeErrorPanel.tsx` L57-64. Gating precedence: `forceShowFrames` > operator toggle > `shouldShowFrames(err)`.
- Hint copy branches when toggle is the reason (points at `/cli/settings`).
- UI: `src/components/cli/DeveloperPreferences.tsx` mounted in `src/routes/cli.settings.tsx` L204.
- Switch stays `disabled` until `hydrated` to prevent clobbering stored value.
- Tests: `src/components/errors/__tests__/EnvelopeErrorPanel.showDevFrames.test.tsx` (3 cases).

## Verification

- `bunx vitest run` -> 3 passed.
- `bunx tsgo --noEmit` clean.

## Version

- No bump. Still v4.98.0 (RULE 1: no mid-plan releases).

## Next

- Step 147: "Auto-open failed session drill-down" toggle in Developer Preferences section.
