# SS-02: Floating process pill, draggable and stoppable

Slug: floating-pill
Parent: 66-ui-v3-missing-completion
Status: pending
Created: 2026-07-17

## Goal

Turn `RunningPill` into a Google-Meet-style floating indicator: drag anywhere, click to jump, Stop button, persists across route changes.

## Files

- `src/components/app-shell/RunningPill.tsx`
- `src/components/app-shell/RunningPillSlot.tsx`
- New store: `src/lib/running-processes-store.ts`

## Steps

1. Model: `RunningProcess = { id, kind, label, startedAt, targetRoute, onStop }`. Zustand store with `start`, `stop`, `list`. Persist position `{ x, y }` per pill in localStorage under `ca.running-pill.pos.v1`.
2. Drag: implement with pointer events (no external DND lib); clamp to viewport; keyboard alt: Shift+Arrow moves pill by 8px.
3. Click behaviour: single click routes to `targetRoute`, Stop button on hover, Esc dismisses focus.
4. Multi-process: stack vertically per Q5 default.
5. Persistence: pill state survives route transitions; verify with Playwright: start validate, navigate to home, pill still there.

## Verification

- Playwright: start a fake process (test hook), drag pill 100px, reload, position restored.
- Playwright: click pill, url matches `targetRoute`.
- Unit test store: start/stop/list.
- CI: green.
