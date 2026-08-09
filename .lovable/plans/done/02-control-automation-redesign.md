# Control Automation — HMI Redesign (v1)

Slug: control-automation-redesign
Steps: 50
Status: completed
Created: 2026-07-09

## Context

Redesign the legacy inspection HMI into a modern, clean, industrial-control UI named **Control Automation**, preserving 100% of the functional logic (screens, controls, state vocabulary, flow). All prior learnings live in `.lovable/plans/done/01-learn-tools-images.md` and `mem://design/hmi-brief`, `mem://design/hmi-tokens`, `mem://constraint/build-gates`.

Captured this turn:

- Commands: `.lovable/spec/commands/01-plan-50-workflow.md`, `.lovable/spec/commands/02-ip-guardrail.md`, `.lovable/spec/commands/03-domain-vocabulary.md`.
- Issues: none reported this turn.

Deep steps have subtasks under `.lovable/plans/subtasks/02-control-automation-redesign/`.

## Steps

1. Re-read `mem://design/hmi-brief`, `mem://design/hmi-tokens`, `mem://constraint/build-gates`, and `.lovable/plans/done/01-learn-tools-images.md` to reconfirm scope before touching code.
2. Confirm IP guardrail from `.lovable/spec/commands/02-ip-guardrail.md`: strip any legacy vendor references from README, CHANGELOG, and route metadata; app title becomes "Control Automation".
3. Draft 2–3 modernized neutral palette options (cool-neutral, warm-neutral, high-contrast neutral) in oklch, each preserving semantic accent roles (blue=primary, green=OK, red=NG, amber=warn, yellow=select). See ./subtasks/02-control-automation-redesign/ss-01-palette-options.md.
4. Present palette options to the user via `questions--ask_questions` (visual_choice) and lock one before writing tokens (build-phase gate).
5. Lock the type stack: `system-ui, "Segoe UI", Inter, Arial, sans-serif`; confirm with user or default per brief.
6. Convert the locked palette from hex → `oklch()` and stage `--hmi-*` tokens for `src/styles.css` `@theme inline` block. See ./subtasks/02-control-automation-redesign/ss-02-tokens-oklch.md.
7. Wire `--hmi-*` tokens into `src/styles.css` under `@theme inline`, leaving shadcn defaults intact.
8. Add typography tokens (`--hmi-fs-*`, `--hmi-fw-*`) and a `.hmi-tabular` utility using `@utility` for `tabular-nums`.
9. Add spacing tokens on an 8px base (`--hmi-space-1..8`) and fixed chrome heights (`--hmi-h-titlebar`, `--hmi-h-header`, `--hmi-h-ribbon`, `--hmi-h-actionbar`) with ±8px flex.
10. Add elevation tokens: no gradients, no glass; soft shadow tokens reserved for modals/floating panels only; 2px primary focus ring.
11. Verify tokens compile: preview loads clean, no Tailwind v4 unknown-utility errors.
12. Scaffold shared layout primitives folder `src/components/hmi/` (Titlebar, ModeHeader, ToolRibbon, Viewport, ConfigPanel, ActionBar, StatusLog, Counter, RoiOverlay). See ./subtasks/02-control-automation-redesign/ss-03-component-inventory.md.
13. Build `Titlebar` primitive (32±8px, app name "Control Automation", muted subtitle for Program name placeholder).
14. Build `ModeHeader` primitive (40±8px, section title + contextual actions slot).
15. Build `ToolRibbon` primitive (72±8px, horizontal scroll, 48–64px tool tiles, selected-state background using `--hmi-accent-select`).
16. Build `Viewport` primitive (dark `--hmi-viewport-bg`, subtle grid, overlay layer for ROI/anchor render, aspect-preserving container).
17. Build `ConfigPanel` primitive (right rail, section headers, form rows, panel border tokens).
18. Build `ActionBar` primitive (44±8px bottom bar, Run as blue primary always right-aligned, Cancel/secondary left).
19. Build `StatusLog` primitive (fixed-height list, tabular timestamps, severity dot using status tokens).
20. Build `Counter` primitive (Total/OK/NG variants, tabular-nums, right-aligned, large weight-700 numerals).
21. Build `RoiOverlay` primitive supporting Search (dashed yellow), Model (solid green), Mask (hatched red), Anchor (yellow crosshair); accepts rect + circle shapes.
22. Wire TanStack routes for `/`, `/setup`, `/setup/roi`, `/setup/reference`, `/settings/camera`, `/settings/trigger`, `/settings/lighting`, `/run`, `/errors`. See ./subtasks/02-control-automation-redesign/ss-04-routes.md.
23. Add head() metadata per route with distinct title/description/og; app-wide title "Control Automation — Inspection HMI".
24. Replace placeholder `src/routes/index.tsx` with a Boot screen (splash + progress indicator) that auto-redirects to `/setup` after mock load.
25. Build `/setup` (Screen A) composing Titlebar + ModeHeader + ToolRibbon + Viewport + ConfigPanel + ActionBar with mock tool list.
26. Implement tool-selection state in a Zustand (or React context) store: `selectedToolId`, `tools[]`, `program`, mocked in `src/lib/hmi-mock.ts`.
27. Build the ConfigPanel form for a selected tool: threshold slider (0–100), units toggle (px/mm), enable/disable, name field — all driven by store.
28. Build `/setup/roi` (Screen C) as an overlay modal over `/setup` viewport, with rect/circle tool switch, region-type picker (Search/Model/Mask/Anchor), draw + resize + delete.
29. Persist ROI edits back to the selected tool in the store on modal confirm; discard on cancel; return focus to ConfigPanel.
30. Build `/setup/reference` (Screen D) as overlay: Capture button (mock), thumbnail strip, Register/Teach/Test actions using domain verbs.
31. Build `/settings/camera` (Screen B) as a dialog route: exposure, gain, resolution, format fields with mock values.
32. Build `/settings/trigger` (Screen B) as dialog route: mode (internal/external), interval, debounce fields.
33. Build `/settings/lighting` (Screen B) as dialog route: channel toggles, intensity sliders, strobe.
34. Ensure all three Settings dialogs share a common `SettingsDialog` shell primitive to avoid one-off variants.
35. Build `/run` (Screen F): live Viewport (mock frame stream via `requestAnimationFrame` + canvas placeholder), Total/OK/NG counters, Start/Stop control, StatusLog.
36. Add a `runState` store: `status: idle|running`, `counters`, `errors[]`, `startRun()`, `stopRun()`, `pushResult()`.
37. Implement mock frame generator that increments counters and occasionally emits NG results into `errors[]`.
38. Build `/errors` (Screen E): virtualized table of NG events with timestamp, tool, score, thumbnail placeholder, Resolve action.
39. Implement navigation lock while `status === 'running'`: Titlebar nav items, ToolRibbon, and `/setup`/`/settings/*` links disabled or hidden; only Stop + `/errors` remain reachable. See ./subtasks/02-control-automation-redesign/ss-05-nav-lock.md.
40. Enforce lock at the router level via `beforeLoad` on locked routes: redirect to `/run` when running.
41. Wire NG→Errors flow: clicking a StatusLog NG row navigates to `/errors` with the row focused; Resolve returns to `/run`.
42. Draw modern tool-tile pictograms (SVG components) for the mock tool set (Pattern, Edge, Blob, Measure, Presence, OCR) — flat/subtly-shaded, distinguishable at 48px, no isometric skeuomorphism.
43. Draw 16px chrome glyphs (lucide-react is fine) for menu/toolbar actions; ensure monochrome, single stroke weight.
44. Add focus-visible styles project-wide using `--hmi-focus-ring` token; verify with keyboard nav across Ribbon → Config → ActionBar.
45. Accessibility pass: color contrast (WCAG AA) on chrome+panel+viewport text, ARIA labels on Ribbon tools, live-region announcement for NG events on `/run`.
46. Responsive/viewport pass at 1280×800 (control-room baseline) and 1920×1080; ensure ribbon horizontal scroll and Viewport aspect hold.
47. Add a lightweight session save/load in `src/lib/session.ts` reading/writing JSON to `localStorage` under an abstract `session` key; expose Save/Load buttons in ActionBar of `/setup`.
48. Update `readme.md`, `changelog.md`, and `release_notes.md`: bump version, describe redesign scope, keep IP guardrail language.
49. Verify build clean (`bun run build:dev` via harness), no runtime errors in preview across all routes; capture screenshots of each screen for the evidence trail.
50. Move this plan file to `.lovable/plans/done/02-control-automation-redesign.md` and flip `Status:` to `completed`; update `mem://index.md` with a pointer to the completed plan and any new memory entries (e.g., `mem://design/hmi-tokens-oklch`).

## Verification

- Build clean each phase (harness auto-typechecks).
- Preview navigation across every route in Section 4.2 succeeds.
- Navigation lock verified by toggling `runState.status` in the store and confirming disabled/hidden state.
- Every component from §5.7 imported from `src/components/hmi/` (no one-off variants — grep for hardcoded hex in `src/**` returns zero matches).
- No occurrence of the legacy vendor's name or trademarked program styling anywhere in `src/`, `readme.md`, `changelog.md`.
- Screenshots per screen archived under `/mnt/documents/control-automation-redesign/`.

## Appended from prior pending tasks

None. `.lovable/plans/pending/` was empty; only prior plan `01-learn-tools-images` is already in `.lovable/plans/done/`.
