# SS-09 — Flow diagram between screen archetypes

**Parent plan:** `.lovable/plans/pending/01-learn-tools-images.md` (step 9/15)  
**Status:** done — 2026-07-09  
**Version:** 0.10.0

## Root cause / workflow note

The pasted "error" is a workflow prompt, not a runtime/build failure; after SS-08 mapped the screen archetypes, the missing source-of-truth artifact was the transition graph between those archetypes.

## Read + verification signal

- Project memories: no durable project memories exist yet in the injected memory bootstrap; step 14 is still responsible for creating `mem://design/visual-language` and `mem://features/cat-my-scope`.
- Optional guidelines checked before execution: `.lovable/coding-guidelines.md`, `spec/coding-guidelines/`, and `.lovable/seo-guidelines.md` were absent, so no extra guideline files applied.
- Read source files:
  - `.lovable/plans/pending/01-learn-tools-images.md` lines 16–30 — original 15-step order; step 9 is flow reconstruction, steps 10–15 remain.
  - `.lovable/plans/subtasks/01-learn-tools-images/ss-06-components.md` lines 27–80 — component vocabulary and shell/workspace/inspector hierarchy used as flow nodes.
  - `.lovable/plans/subtasks/01-learn-tools-images/ss-07-iconography.md` lines 20–43 — ROI overlay/action vocabulary used in edit flows.
  - `.lovable/plans/subtasks/01-learn-tools-images/ss-08-screen-taxonomy.md` lines 7–82 — archetypes A–H and proposed route map used as the flow backbone.
  - `readme.md` lines 1–7, `changelog.md` lines 1–13, `release_notes.md` lines 1–12 — version/docs state before bumping from 0.9.0.
- Runtime/error signal read first: current Vite/dev-server logs show no application failure; before signal is the existing tsconfig-paths warning plus normal reload lines, not a broken runtime stack trace.
- After signal for this documentation task: this file, `.lovable/prompts/09-next-task.md`, `readme.md`, `changelog.md`, and `release_notes.md` now encode step 9 and version 0.10.0.

## Archetype keys from SS-08

- **G** — Boot / no project loaded.
- **A1** — Tool Setting workspace, category/tool browse.
- **A2** — Tool Setting workspace, configured tool form.
- **C** — ROI editor on camera canvas.
- **D** — Reference-image registration.
- **B1/B2/B3** — Judgment / output, camera, trigger / lighting settings.
- **E** — Error List / status dialog.
- **F** — Run screen / production measurement inspector.
- **H** — Printed controller labels; reference-only, excluded from UI flow.

## Primary flow 1 — project load to setup workspace

```text
G Boot / no project loaded
  → load existing program / startup checklist resolves
  → A1 Tool Setting workspace
```

Purpose: enter the active inspection program (`SUPERTHIN QFN 5X5_REV1`) and expose the inspection pipeline.  
State carried forward: active project/program, camera source, ordered tool ribbon.  
Implementation implication: `/` can show the boot/project-selection state, then navigate to `/setup` once a project is loaded.

## Primary flow 2 — add/select inspection tool

```text
A1 Tool Setting workspace
  → select tool category tile / Add Tools
  → A1 Tool catalog browse with active category
  → choose function tile
  → A2 Tool configured form
```

Purpose: choose a new inspection/detection operation or select an existing pipeline tool.  
State carried forward: selected category, selected function/tool id, position in tool ribbon.  
Implementation implication: `A1` and `A2` can be route-adjacent (`/setup` and `/setup/tool/:id`) but should feel in-place, preserving the shell and tool ribbon.

## Primary flow 3 — configure tool parameters

```text
A2 Tool configured form
  → edit numeric inputs / dropdowns / toggles
  → Test All or tool test
  → result table/status strip refreshes in the same workspace
  → OK commits, Cancel reverts
```

Purpose: tune the selected inspection tool's detection conditions and thresholds.  
State carried forward: pending form values, last test result, selected image source.  
Implementation implication: dirty state matters; `OK` and `Cancel` are not decorative buttons. Test actions update the inspector without leaving `/setup/tool/:id`.

## Primary flow 4 — ROI / region editing loop

```text
A2 Tool configured form
  → Search Region / Pattern Region / Mask Region action
  → C ROI editor on camera canvas
  → adjust dashed/solid/hatched regions and handles
  → Register / OK
  → return to A2 Tool configured form
```

Purpose: bind a tool parameter to editable image geometry.  
State carried forward: source tool id, region type, ROI coordinates, selected handle/anchor, zoom/pan state.  
Implementation implication: `/setup/tool/:id/region` should know the originating tool and region type. Returning must restore the same tool configuration panel rather than dumping the user back to tool browse.

## Primary flow 5 — reference-image registration loop

```text
A2 Tool configured form or C ROI editor
  → Register Image
  → D Reference-image registration
  → choose/reference current image, inspect yellow origin/crosshair
  → Register confirms or Cancel exits
  → return to A2/C originating context
```

Purpose: capture the image baseline used by later matching/measurement operations.  
State carried forward: current camera frame/reference image, origin point, selected registration slot.  
Implementation implication: `D` is simpler than `C`, but it still needs caller context so Cancel/Register returns to the right editor or tool page.

## Primary flow 6 — system/settings configuration

```text
A1/A2/F shell action header
  → settings/nav action
  → B1 Judgment / Output settings
  → B2 Camera settings
  → B3 Trigger / Lighting settings
  → Run or Cancel
```

Purpose: adjust global inspection, camera, trigger, and lighting parameters.  
State carried forward: active project/program and hardware channel.  
Implementation implication: settings should be URL-addressable (`/settings/judgment`, `/settings/camera`, `/settings/trigger`) but visually preserve the HMI shell. `Run` can jump directly to production mode; `Cancel` should return to the caller or setup workspace.

## Primary flow 7 — run / production inspection

```text
A1/A2/B settings
  → Run blue primary action / Go to Run Mode
  → F Run screen / measurement inspector
  → live image + measurement table updates
  → select failing row / inspect ROI overlay
  → Edit/Setup returns to A2 for the selected tool
```

Purpose: production monitoring of pass/fail measurement values.  
State carried forward: active project, live camera feed, latest judgment results, selected measured item/tool.  
Implementation implication: `/run` is not a landing page; it is the operational default once setup is complete. Rows in the measurement inspector should map back to tool configuration sources.

## Interrupt flow — error list and source recovery

```text
A1/A2/B/C/D/F
  → error launcher / warning status
  → E Error List
  → select error row
  → Jump to Source
  → source screen (often A2/B/C) with affected item selected
  → Close returns to prior screen
```

Purpose: expose system/tool faults without destroying the operator's current workspace.  
State carried forward: previous route, selected error, source pointer.  
Implementation implication: `/errors` can be route-addressable, but the UX should behave like an interrupt overlay/dialog. `Jump to Source` requires errors to include a source route/tool/setting pointer.

## Consolidated route/state graph

```text
/
└─ load project → /setup

/setup
├─ Add/select tool → /setup/tool/:id
├─ settings action → /settings/judgment | /settings/camera | /settings/trigger
├─ Run → /run
└─ warning → /errors

/setup/tool/:id
├─ edit/test in place
├─ edit region → /setup/tool/:id/region
├─ register reference → /settings/reference
├─ Run → /run
└─ warning → /errors

/setup/tool/:id/region
├─ OK/Register → /setup/tool/:id
├─ Cancel → /setup/tool/:id
└─ warning → /errors

/settings/*
├─ sibling tabs/settings nav → /settings/*
├─ Run → /run
├─ Cancel → caller or /setup
└─ warning → /errors

/run
├─ Edit selected tool/source → /setup/tool/:id
├─ settings → /settings/*
└─ warning → /errors

/errors
├─ Close → previous route
└─ Jump to Source → source route from selected error
```

## Navigation rules for the rebuild

1. Preserve the dense shell across setup, settings, and run; navigation changes workspace content, not the whole application identity.
2. `Run` is the strongest global action and should remain blue wherever it appears.
3. Region/reference editors are temporary editing loops with explicit return paths to the originating tool.
4. Error handling is an interrupt flow; it must support both close/back and jump-to-source.
5. Route URLs should exist for the major workspace states, but many transitions should animate/feel in-place because the reference HMI behaves like a workstation shell.

## Remaining ambiguities for step 11

- Whether settings `Cancel` returns to the exact caller or always returns to `/setup`.
- Whether reference-image registration belongs under `/settings/reference` or under `/setup/tool/:id/reference`; current evidence supports a shared registration workspace with caller context.
- Whether run mode can modify values inline or only links back to setup; screenshots show inspection/results clearly but not enough evidence for inline production edits.

## Next step

Step 10 should extract the domain glossary and feature scope from the labels already encountered in these flows: project/program, tool, category, inspection, detection, judgment, output, camera, trigger, lighting, reference image, search region, pattern region, mask region, measured/lower/upper, OK/NG, run mode, and error source.
