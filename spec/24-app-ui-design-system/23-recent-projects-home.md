# 23 - Recent Projects on Home

**Version:** 1.0
**Owner:** Plan 64 step 25
**Depends on:** `10-navigation-shell.md`, `16-project-lifecycle.md`, endpoint row 19 (`listRecentProjects`).

---

## Purpose

Home (`/`) surfaces a "Recent" chip that expands into a dropdown of recently opened Projects so operators skip the full Projects list for the day-to-day workflow. This is the single fast path from cold-open to a familiar Project.

## Placement

- Location: primary Home hero row, right side, aligned with the "New Project" primary action. On viewports below 900px, the chip drops below the hero to a single-column list.
- Component name: `<RecentProjectsChip>` in `src/components/home/RecentProjectsChip.tsx`.

## Data

- Fetched via `useSuspenseQuery(recentProjectsQuery(limit: 8))` where `recentProjectsQuery` wraps `listRecentProjects` from row 19. Loader on the Home route prefetches with `ensureQueryData`.
- Backend orders by `Project.opened_at DESC` (nullable timestamp; NULLs sort last).
- `opened_at` is bumped by `openProject(project_id)` (a client-side call made when navigating into a project page). Openings are idempotent: writes are deduped to at most one per project per 30 seconds via a lightweight in-memory rate limit in the server function.

## Render contract

- Closed state: chip labelled `Recent` with a count badge (up to 9+). No dropdown popover until interaction.
- Open state (click or keyboard Enter): dropdown with up to 8 rows. Each row shows Project name, status pill, last-opened relative time ("2h ago"), a small right-side arrow to open.
- Empty state: chip is disabled with tooltip "No recent projects. Create one to get started."
- Keyboard: arrow keys move selection, Enter navigates to the Project page, Escape closes.
- The dropdown is a Radix Popover; scoped `aria-labelledby` on the chip. No layout shift on open (fixed-box, per `40-menu-anti-jitter.md`).

## Interactions

- Click a row -> navigate to `/projects/$projectId` and, on route load, fire `openProject({ project_id })` (fire-and-forget; failure is logged but does not block navigation).
- Right-click (or the row's kebab): "Pin" (moves to top of the list until unpinned), "Remove from recent" (soft: clears `opened_at`, does not delete the Project).
- Pinning is per-user, stored via server function `setProjectPin({ project_id, pinned })` (added as endpoint row 55 in a follow-up step; noted here for traceability).

## Empty and error states

- Loader error -> the chip renders a small error state ("Recent unavailable, retry") and reports the error to the app-wide error boundary via `router.invalidate` on retry click. Never silently hides the failure.
- Zero recent projects -> disabled chip per Render contract.

## Verification

- Playwright: open Home cold, assert chip is disabled with the empty tooltip. Create + open a Project. Return to Home. Assert the chip is enabled and shows the project first. Wait 45 seconds, re-open the project, assert timestamp updates (rate-limit window elapsed).
- Contract test: `openProject` invoked twice within 30 seconds writes only one `opened_at` bump.

## Open ambiguity

- None. Q19 (Back/Forward history scope) is unrelated: Recent is chronological, not navigation-history-scoped.
