# 08 — Design Intent History (the "why")

**Purpose:** a blind AI that only copies values will produce a lookalike. A blind AI that understands *why* the values are what they are will produce the *right* design. This file summarizes the user instructions that shaped the system. Sources: `02-spec/24-app-ui-design-system/`, `.ai-memory/plans/done/`, `01-prompts/10-ui-and-design/`, `conversation/01-plan-64/`.

---

## 8.1 V1 redesign (2026-07-09) — `.ai-memory/plans/done/02-control-automation-redesign.md`

50-step plan. Took a legacy inspection HMI to "modern, clean, industrial-control":

- oklch `--hmi-*` tokens; semantic accents frozen (blue = primary, green = OK, red = NG, amber = warn, yellow = select).
- 8px spacing; fixed chrome heights.
- **"No gradients, no glass; 2px primary focus ring."** (The gradients documented in `04` are later, restrained additions — chrome sheen, grid paper, vignettes. The rule stands: gradients are decoration, never structure.)
- Layout primitives: Titlebar, ModeHeader, ToolRibbon, Viewport, ConfigPanel, ActionBar, StatusLog, Counter, RoiOverlay.
- WCAG AA; responsive at 1280×800 and 1920×1080.

## 8.2 V2 user dictation (2026-07-17) — `24-app-ui-design-system/09-UI-improvements-v2.md`

Verbatim user drivers (reconciled tracker: `99d-ui-improvements-v2-enhancement.md` — 60 done, 9 pending, 2 deferred, 9 open decisions):

- **Header bloat:** *"reduce the space… the control automation section on the top, that should be the place where when we go to a page, that should be changed, and afterwards it should show the breadcrumb. And every page… there should be a back button… like a browser."* → the 24px pill breadcrumb + browser Back/Forward in `07`.
- **Running-process UX:** draggable floating RunningPill — *"Just like Google Meet… goes away to drag and drop anywhere."* → draggable pill with persisted position.
- **Hover jitter:** *"when we hover over, it just goes a bit back and forth… menu items, try to make this bigger… the padding needs to be appropriate so that it does not change"* → **the stationary-hover rule**: hover must NEVER change layout/padding/size. This is the single most important interaction rule in the system.
- **Rule layers:** *"It should be like the full thing. The arrow should be in the right-hand side… Too many lines actually makes… a '90s application."* → full-width layer rows, right-side chevron, minimal dividers.
- **Panels:** *"minimized and also can be broken down to a separate control… like a Photoshop control, layer control"* → the docking model in `07` §7.2.
- **Verdict:** *"Currently, your UI looks really very backdated… make it more fluid, more flexible."* → the fluid `clamp()` type scale and 120–200ms decelerating motion in `02`/`05`.
- **Naming:** PascalCase user-friendly labels; no lowercase/underscores visible in UI; "Rules" replaces "Recipe".
- **Project section:** *"looks broken… make it professional."* → the SetupTiles card pattern in `03` §3.2.

## 8.3 V3 → Plans 66/67 ("fluid + modern")

`10-UI-improvements-v3.md` status matrix (DONE/PARTIAL/MISSING/DEFERRED per ID) + Plan 67 closeout. `.ai-memory/plans/done/67-ui-fluid-modern-v2-v3-completion.md` ("fluid + modern" polish stream; Plan 24 token sweep — no new visual concepts):

- Unified 3-column Titlebar; `AppBreadcrumb` multi-segment; browser Back/Forward; draggable RunningPill with persisted position; Cmd/Ctrl+Shift+P command palette; Window menu; `DockableFrame` (grip drag, 5-region drop, framer-motion snap spring, reduced-motion guard); Preview min/max; Design Mode SVG compile/export/import; full rule-primitive editors; Run picker overlay; ESLint palette guard (semantic tokens only); error-registry toasts; visual-regression snapshots; axe 0 serious/critical.
- Plan 24 swept all hardcoded colors to tokens — **this is why the "Total Ban on Invented Values" rule exists** (see below).

## 8.4 Fix-rule constraints (`01-prompts/10-ui-and-design/`, `conversation/01-plan-64/`)

- **"Zero Structural Changes… focus strictly on fixing the requested UI issue."**
- **"Never Disable CI/CD… fix the underlying code so the CI/CD pipeline passes legitimately."**
- **Blind-AI spec rule — "Total Ban on Invented Values":** *"If the source is silent, explicitly state: `Not specified in source. Do not invent.`"* This folder follows that rule. So should you.
- Driver rules: no em dashes in UI copy; root-cause-first debugging; never ask for plan approval.

## 8.5 Yeasin's industrial pass (2026-10-08 → 2026-10-10)

**Name alias:** the user calls him "Yasin"; the git author is **YeasinKabirJoy** <yeasinjoy16@gmail.com>. Same person.

Branch `fix/4-oct-26-joy-optimization-and-project` (verified in git history by the spec author — HEAD `96ecea35`, dates 2026-10-08 → 2026-10-10):

- `feat: Implement industrial dashboard for StandardHomeView`
- `feat: Implement industrial dashboard UI for Camera Binding and Trial Run`
- `ui: fix types in ai-testing and industrialize runs.tsx`
- `fix: Restore ProjectOverview functionality while maintaining industrial UI`
- `UI fixed v1` (HEAD, 2026-10-10)

Note: the commit-message phrases ("UI fixed v1", "industrialize runs.tsx") appear in git history but have zero hits in the working tree — they describe the work, they are not code identifiers. Do not cite them as code references.
