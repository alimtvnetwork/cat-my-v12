# Plan 75 - Issue map (Step 2)

Date: 2026-07-18
Version: v3.511.0
Scope: six deferred issues from Plan 73 closeout.

## 09 - Setup UI not modern

- Symptom: `/setup`, `/setup/roi`, `/setup/reference` render a stacked, low-density layout that does not communicate the image-with-overlays rule editor mental model; no direct ROI draw-on-image, no Photoshop-style layer semantics, camera controls compete with workspace.
- Suspect files: `src/routes/setup.tsx`, `src/routes/setup.index.tsx`, `src/routes/setup.roi.tsx`, `src/routes/setup.reference.tsx`, `src/components/hmi/**`.
- Severity: high (blocks operator workflow).
- Acceptance: full-bleed canvas, token-driven surfaces (`--ca-*`), Ubuntu headings + Poppins body, collapsible camera drawer, no hardcoded colors, tsgo + vitest + axe green.

## 11 - Rule editor: layers list mixed with detector controls

- Symptom: `RightRail.tsx` renders `RuleList` + selected-rule detector panel stacked; selecting a circle rule injects `CircleRuleEditor` fields directly into the "layers" area, breaking the Photoshop mental model.
- Suspect files: `src/components/editor/rail/RightRail.tsx`, `src/components/editor/rail/RuleList.tsx`, `src/components/editor/rail/CircleRuleEditor.tsx`, `src/components/editor/panels/LayersPanel.tsx`, `src/lib/editor/panel-registry.ts`.
- Severity: high (usability regression).
- Acceptance: dedicated `InspectorPanel` component holds detector controls; `LayersPanel` shows only reorderable rule rows with visibility/lock; dock registry lists both with `defaultFloatSize` and right-side default; vitest covers the split.

## 12 - UI overlaps and excessive line density

- Symptom: Titlebar + TopMenuBar + SectionTopBar stack visible borders; RightRail overflows on narrow viewport; adjacent 1px borders read as "too many lines".
- Suspect files: `src/components/hmi/HmiShell.tsx`, `src/components/hmi/Titlebar.tsx`, `src/components/nav/TopMenuBar.tsx`, `src/components/hmi/SectionTopBar.tsx`.
- Severity: medium (visual polish + narrow-viewport correctness).
- Acceptance: exactly one primary nav layer + one section context bar per route; no overlap at 1280x800 or 1920x1080; density verified in both `comfortable` and `compact` header modes; borders collapsed using `--spacing-hmi-*` tokens.

## 13 - Home screen regression

- Symptom: `/` no longer surfaces the four-entry launcher (Projects, Setup, Trial run, AI testing); Plan 36 direction replaced it with a Jobs + Tasks surface.
- Suspect files: `src/routes/index.tsx`, `.lovable/spec/commands/09-home-hub-top-nav.md`.
- Severity: high (loss of primary navigation).
- Acceptance: `/` renders the four-entry launcher per spec 09; frontend-only; Playwright confirms all four entries visible and clickable.

## 14 - src_v3 rollback regression

- Symptom: `src_v3/` still lingers as a stale design source; risk of regressive imports.
- Suspect files: `src_v3/**` (directory to remove).
- Severity: medium (hygiene, misleading source of truth).
- Acceptance: `src_v3/` removed; `rg "src_v3"` outside `.lovable/plans/completed/` and archived memory returns zero matches in `src/`.

## 15 - Global home navigation missing

- Symptom: no always-visible Home affordance in app chrome; user cannot reliably return to `/` from deep routes.
- Suspect files: `src/components/hmi/Titlebar.tsx`, `src/components/nav/AppBreadcrumb.tsx`.
- Severity: high (navigation dead-end risk).
- Acceptance: Home affordance visible on every route (icon + label, tooltip, keyboard accessible); Playwright confirms across `/`, `/setup`, `/projects`, `/setup/rules`.

## Cross-issue notes

- Issues 13, 14, 15 are quick, low-risk fixes and land first (steps 4-7) to unblock verification of chrome changes.
- Issue 11 blocks issue 09 visual layout because the right rail split changes what fits in the setup workspace.
- Issue 12 is the last chrome pass because it depends on the final Titlebar/section-bar shape after 13 + 15.
