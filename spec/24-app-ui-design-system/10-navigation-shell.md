# 10 - Navigation Shell (Header, Breadcrumb, Back/Forward, Running Pill)

**Version:** 1.0 (draft)
**Owner:** Plan 64 (UI v2)
**Depends on:** `01-foundations.md`, `02-layout.md`
**Related issues:** `.lovable/issues/18-header-duplicated-control-automation.md`

---

## Purpose

Replace the current tall, duplicated-title header with a single-row compact shell that behaves like a native desktop app: a page-context breadcrumb, browser-style Back/Forward buttons, a global command entry, and a slot for the dockable running-process pill.

## Anatomy (left to right)

```
[ ◀  ▶ ] [ Breadcrumb: Setup / Rules / Rule Set 01 / Rectangle OCR ]   [ ⌘K ]   [ Running Pill slot ]   [ Setup ▾ ] [ Profile ]
```

| Slot          | Component                 | Notes                                                                                                                                                                                               |
| ------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| History nav   | `<HistoryNav>`            | Two icon buttons. Bound to `useRouter().history.back()/.forward()`. Disabled when history has no entry in that direction.                                                                           |
| Breadcrumb    | `<PageBreadcrumb>`        | Reads the active route match chain. Segment tokens come from each route's `staticData.breadcrumb` string. Last segment is not a link.                                                               |
| Command entry | `<CommandPaletteButton>`  | Opens the Ctrl+K / ⌘K palette. Also focusable via `/`.                                                                                                                                              |
| Running slot  | `<RunningPillPortalRoot>` | Empty when no long-running op is active. Portals `<RunningPill>` here when at least one op is registered. Users can drag the pill out of this slot and dock back. See `11-running-process-pill.md`. |
| Setup menu    | `<SetupMenu>`             | Dropdown to the three Setup tiles: Camera Setup, Rules Setup, Lighting Setup. Direct link when a mouse hovers, arrow when using keyboard.                                                           |
| Profile       | `<ProfileMenu>`           | Existing user menu (unchanged in this pass).                                                                                                                                                        |

## Height + spacing tokens

- Header height: `--app-header-h: 44px`. Single row, never wraps.
- Vertical padding on interactive items inside the header: `--menu-item-py: 8px`.
- Horizontal padding: `--menu-item-px: 12px`.
- The header sits on `--surface-1`, borders on `--border-subtle`, elevated by `--shadow-100` (existing tokens).

## Breadcrumb tokens per route

Each route file declares its breadcrumb segment via TanStack Router `staticData`:

```ts
export const Route = createFileRoute('/setup/rules/$ruleSetId')({
  staticData: { breadcrumb: (params, loaderData) => loaderData.ruleSet.name },
  ...
})
```

The `<PageBreadcrumb>` component walks `useMatches()` in order and renders any match whose `staticData.breadcrumb` resolves to a truthy string. Segments render as `<Link>` except the last, which is plain text. No route may declare a breadcrumb longer than 30 characters; overflow ellipsises with a tooltip carrying the full string.

## Back / Forward semantics

- Bound to the router history stack scoped to the current tab. Q19 in ambiguity is open on whether we shadow this with a project-defined stack; until answered, use `router.history.back()` / `.forward()` directly.
- On a fresh deep-link with no history behind, Back is disabled (not hidden). Forward mirrors this.
- Keyboard: `Alt+ArrowLeft` / `Alt+ArrowRight` trigger the same actions when focus is inside the app shell, matching desktop-app expectations.

## What is removed

- The duplicated "Control Automation" title area in the current header. Its space is reclaimed by the breadcrumb. See `.lovable/issues/18-header-duplicated-control-automation.md`.
- The current stacked two-row header. New shell is exactly one row.

## Setup dropdown vs Setup route

Q3 in ambiguity is open on whether Setup is a top-level route or a header dropdown. The spec assumes both: the header shows a `Setup ▾` dropdown for quick jumps, and `/setup` also renders the same three tiles for landing users. Both paths lead to the same three sub-routes (`/setup/camera`, `/setup/rules`, `/setup/lighting`).

## Anti-jitter hover contract

Every interactive item in the header (history buttons, breadcrumb segments, Setup dropdown, Profile) obeys the rule in `40-menu-anti-jitter.md`:

- Outer box dimensions are identical at rest, hover, focus, active.
- Hover animates only background color, border color, or an inner icon transform. Never `margin`, `padding`, `translate`, `scale` on the outer box.
- Enforced by the Playwright anti-jitter test (Plan 64 step 58).

## Verification

- Playwright: navigating between three pages fills the breadcrumb correctly and Back returns to the previous URL.
- Playwright: hover on every header item causes CLS ≤ 0.001 on the outer bounding box.
- Manual: on a fresh deep link, Back is visibly disabled; after one client-side navigation, Back is enabled.
- Manual: registering a long-running op via `useRunning()` renders the pill inside the header slot; dragging it out portals it to the floating layer without unmounting.

## Open ambiguities referenced here

- Q3 (Setup route vs dropdown - resolved by shipping both).
- Q19 (Back/Forward semantics - default to router history until answered).
