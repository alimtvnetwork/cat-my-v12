# Clicking Edit on a rule does not open the ROI editor

Status: closed
Closed: 2026-07-19 (v3.775.0, Plan 84 Step 8)
Closed-by: Plan 83 backlog items 1 + 2 (route stub + bus subscriber)

## Symptom (historic)

Clicking a rule row (or its Edit affordance) does nothing. Expected: navigate
to the ROI/rule creation-and-edit page (the canvas editor) for that rule.

## Root cause

No route file existed at `/projects/$projectId/rulesets/$rulesetId/rules/$ruleId`,
so `LayerRow`'s pencil / Enter emit onto `openRuleBus` had no consumer able to
drive the router anywhere.

## Fix (already shipped by prior turns; Step 8 verified only)

- `src/routes/projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx:11-24`:
  route stub `beforeLoad` redirects to the parent ruleset with
  `search: { rule: params.ruleId }`, logging via `console.info`.
- `src/routes/projects.$projectId.rulesets.$rulesetId.tsx:29-33,43,64-84,89-104`:
  `validateSearch` for `rule`, `useSearch()` read, preselect effect, and
  `openRuleBus.subscribe(...)` → `navigate({ to: "/projects/$projectId/rulesets/$rulesetId/rules/$ruleId", ... })`.
- `src/components/editor/layers/LayerRow.tsx:95-100,230-243`: Enter key and
  Pencil button both emit `openRuleBus.emit(rule.id)`.
- `src/lib/editor/selection/open-bus.ts`: module-scoped emitter with warning
  logs on empty ids and error logs on listener throws.

## Verification (Playwright, 2026-07-19)

Screenshots: `/tmp/browser/step8/{ruleset_edit,after_pencil}.png`.

Console evidence at pencil click:

- `[open-rule-bus] emit {ruleId: seed-6eaclqx0, listeners: 1}`
- `[rules/$ruleId] redirect to ruleset with preselect {...ruleId: seed-6eaclqx0}`

URL after click: `.../rulesets/<rsid>?rule=seed-6eaclqx0`. Selected rule
reflected in editor via preselect effect.

Reference: `spec/21-app/53-ui-improvements-v4-assets/plan82/upload-76.png`.
