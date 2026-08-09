# 25 — UI Overview

**Status:** Locked (Plan 04 Step 25). Top-level map of every screen the operator sees. Individual screens are specified in files 31, 37, 38, 39.

Anchors: 05-image-index (which reference images belong to which screen), Core project memory (dense HMI, hairline borders, no shadows, fixed heights).

## 1. Screen Inventory

| #   | Route                      | Screen              | Owner file            | Primary user     |
| --- | -------------------------- | ------------------- | --------------------- | ---------------- |
| 1   | `/`                        | Home / Jobs & Tasks | 25 (this file)        | Operator         |
| 2   | `/setup/:taskId`           | Rule Setup          | 31-rule-setup-screen  | Rule Author      |
| 3   | `/run/:taskId`             | Run Monitor         | 37-run-monitor-screen | Operator         |
| 4   | `/results/:runSessionId`   | Results             | 38-results-screen     | QA / Operator    |
| 5   | `/settings`                | Settings            | 39-settings-screen    | Operator / Admin |
| 6   | `/ai-review/:runSessionId` | AI Review (stub)    | 43-ai-validation-stub | QA (v2)          |
| 7   | `/errors`                  | System Errors       | 40-error-manage       | Operator         |

Only screens 1–5 and 7 are in v1 scope. Screen 6 is a route stub returning "Not available in this build".

## 2. Global Chrome (present on every screen)

- **Titlebar (32 px, fixed):** app name, active Job/Task label, connection status pill, clock (24 h, UTC + local).
- **Global Nav (40 px, fixed):** Home · Setup · Run · Results · Settings · Errors. Locked (disabled with tooltip) while any RunSession for the current Task is `RUNNING`, except Run/Errors which remain active.
- **Bottom Status Bar (44 px, fixed):** rolling counters when a RunSession is active (`Captured / Processed / OK / NG / Failed / fps`), else empty.
- Viewport = window height − 32 − 40 − 44. Screens never scroll the outer shell; internal panels scroll instead.

## 3. Route Behavior

- Deep links resolve; missing `taskId` / `runSessionId` → 404 route ("Not found" + "Back to Home").
- **Nav lock while running:** clicking Setup or Settings for a Task with a `RUNNING` RunSession shows a confirm dialog: "Stop the running Task to edit rules/settings." No silent navigation.
- **Auth:** none in v1 (single-operator install, 44).

## 4. State Model

- Router state (route + params) is the URL — never duplicated in Redux/Zustand.
- Domain state comes from server via SWR-style read (Dispatcher / Supervisor RPC). No optimistic writes for run-sensitive data.
- Ephemeral UI state (open panels, zoom, filter chips) lives in memory; persisted to `localStorage` only for `ui.*` keys registered in 27-config-surface.
- Toasts: max 3 concurrent; auto-dismiss 5 s for INFO, sticky for ERROR (dismiss required).

## 5. Density & Visual Rules (inherited from Core memory)

- Base grid 4 px. Hairline borders 1 px `--hmi-border`. No shadows. No gradients.
- Typography: system-ui / "Segoe UI" / Inter; body 12–14 px; counters 20 px with `font-variant-numeric: tabular-nums`.
- Color = state. Never swap icons to indicate state; swap background/border color.
- Tokens only. Zero hardcoded hex in components.

## 6. Home Screen (`/`) — inlined here

Home is thin enough not to warrant its own file.

Layout: two-pane, no header body.

- **Left pane (280 px):** Job list. Each row = Job name + Task count. Selection filters the right pane. New/Edit/Archive actions in a header strip.
- **Right pane (fills):** Task table. Columns: Name · Last Run · Last Verdict pill (OK/NG/ERROR) · Rules count · Actions (Setup, Run, Results). Sort by Last Run desc default.
- **Empty state:** "No Jobs yet." + "Create Job" primary button.

Actions:

- `New Job` → inline dialog (name only).
- `New Task` (per Job) → inline dialog (name + image format from `capture.imageFormat` default).
- `Run` → navigate `/run/:taskId`, then Dispatcher starts a new `RunSession`.
- `Setup` → navigate `/setup/:taskId`. Disabled if that Task has a `RUNNING` RunSession.

Failure surfaces: any RPC error → toast + red pill in the row's Actions cell; retry available.

## 7. Cross-Screen Contracts

- **Ids in URL are ULIDs (25 §2).** UI validates format before RPC.
- **Counts on the status bar are read from the RunSession row (21 §3.3), not aggregated client-side.** Refresh cadence 500 ms while running, else on demand.
- **Screen transitions during a RunSession never call any Task/Rule mutation RPC.** Guarded at the RPC-client layer, not just the UI.

## 8. Non-Goals (v1)

- No multi-window / detached panels.
- No dashboard aggregating multiple Tasks.
- No i18n (English only). Copy is centralized in `app/ui/strings.ts` for later extraction.
- No theming beyond `ui.theme = dark | light`.

## Acceptance Checklist

- [ ] Route map matches `src/routes/` tree; drift = `E_UI_ROUTE_DRIFT`.
- [ ] Every screen has a section in specs 31/37/38/39.
- [ ] Nav lock during Run mode restated and tied to `RunSession.state=Running`.
