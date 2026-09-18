# 39 - Back / Forward Navigation

**Version:** 1.0 (draft, BLOCKED by Q19 for the "modal stack" question)
**Owner:** Plan 64 step 41
**Depends on:** `10-navigation-shell.md`, `38-header-breadcrumb.md`.

---

## Purpose

Give the desktop shell first-class Back and Forward buttons that behave like a browser tab local to this app, not the OS Back button. The user's expectation is "return to the last screen I was looking at, including any tab / sub-panel selection".

## Component

- `<HistoryNav>` in `src/components/app-shell/HistoryNav.tsx`.
- Renders two icon buttons (`chevron-left`, `chevron-right`) with disabled states, plus a small dropdown affordance on long-press or right-click that lists up to the last 10 destinations.
- Reads history via `useRouter().history` from `@tanstack/react-router`; index and length are read through the `history.subscribe` listener registered on mount and torn down on unmount.

## Behaviour

- Click Back -> `router.history.back()`. Click Forward -> `router.history.forward()`.
- Disabled when at either end of the stack (index 0 for Back, index length-1 for Forward).
- Keyboard: `Alt+Left` and `Alt+Right` mirror the buttons. Handlers are attached in `<AppShell>` root and short-circuit when focus is inside a text input, textarea, or `contenteditable`.
- Middle-click Back -> opens the previous entry in a new window (desktop shell only); silently no-op on web builds.

## URL-only vs local UI state

- Router history captures URL changes only. Tab selections, panel dock positions, and modal state are NOT stored there by default.
- Rules for restoring local UI state on Back:
  1. Tab selections that are meaningful for sharing (e.g. `Details` vs `History` on a Project) MUST be encoded in the URL as a search param (`?tab=history`). These naturally restore.
  2. Purely presentational state (which layer is expanded in the tree, scroll position) is NOT restored on Back; it resets to the route's default.
  3. Modals are NEVER part of history. Opening a modal does not push, closing does not pop. (BLOCKED by Q19: whether large modals like the Import Preview should be first-class routes with their own URL. Working assumption: only the Rule editor itself and the Design Mode overlay get their own routes; other modals stay local.)

## Interaction with the Running Pill

- Back / Forward NEVER cancel a running op. The pill persists across navigations.
- Clicking the pill navigates to its owner route; that navigation is a normal push and Back returns to the previous page.

## Verification

- Playwright: navigate Home -> Projects -> Project detail -> Back -> assert URL is /projects and Forward is enabled. Forward -> Back rapidly and assert no double-fire.
- Playwright: encode a `?tab=history` param, navigate away, click Back, assert the tab is `history` again.
- Log assertion: `Alt+Left` triggers a single `history.back` log line; repeated presses inside an input field trigger zero log lines.

## Open ambiguity

- Q19: whether the Import Preview modal and other heavyweight overlays should be full routes (URL-restorable) or ephemeral (working assumption).
