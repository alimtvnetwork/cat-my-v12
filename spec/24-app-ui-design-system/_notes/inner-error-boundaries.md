---
title: Shell + canvas + controller error boundary tiers (plan 30 step 57)
slug: inner-error-boundaries
plan: 30
step: 57
status: locked
---

# Shell + canvas + controller error boundary tiers

## Purpose

Land the three inner tiers under the route tier from step 56, matching
the boundaries gate (4 tiers, max depth 3). Each tier scopes its
fallback to the smallest useful surface and preserves surrounding state
so users don't lose their program on a leaf crash.

## Target files (new)

```
src/components/editor/boundaries/
  EditorErrorBoundary.tsx      # shell tier, wraps shell body
  CanvasErrorBoundary.tsx      # canvas tier, wraps canvas layer
  ControllerErrorBoundary.tsx  # controller tier, wraps rule controller
  ShellErrorFallback.tsx       # shell fallback card
  CanvasErrorFallback.tsx      # canvas-off card
  ControllerErrorFallback.tsx  # inline "controller failed" card
  boundary-base.tsx            # shared class component + logger wiring
  index.ts                     # barrel (adds 3 tiers to route tier)
```

All three tiers extend a single `boundary-base.tsx` class component so
the `componentDidCatch` -> `logger.error` -> fallback contract stays
identical across tiers.

## Tier matrix (matches boundaries gate)

| Tier       | Log code                  | Fallback area                       | Preserved state                                | Reset action                       |
| ---------- | ------------------------- | ----------------------------------- | ---------------------------------------------- | ---------------------------------- |
| shell      | `E_UI_EDITOR_SHELL_CRASH` | shell body (rail + canvas + status) | program, selection reset to `[]`               | reload shell subtree via key bump  |
| canvas     | `E_UI_CANVAS_CRASH`       | canvas region only                  | program, selection, history                    | reload canvas subtree via key bump |
| controller | `E_UI_CONTROLLER_CRASH`   | controller card only                | everything except controller-local input state | reload controller via key bump     |

Rail, ribbon, top bar, and status strip stay live during canvas and
controller crashes. Ribbon stays live during a shell crash so the user
can still switch kinds after selection reset.

## Fallback contract

- Shell: `--elevation-2` card centered in shell body area, title
  `"Editor shell crashed"`, `correlation_id` in monospace, primary
  "Reset editor shell" button, secondary "Return home".
- Canvas: covers the canvas region only, `--elevation-1` card, title
  `"Canvas offline"`, primary "Reload canvas", `--ca-ng` chip.
- Controller: inline card in the rail's controller mount region,
  `--elevation-0` (inline with rail), title `"Controller failed"`,
  primary "Reload controller".
- All three include `correlation_id` in monospace and NEVER render the
  raw stack (`G-ROUTE-02` applies here too).

## Log payload

Every `componentDidCatch` posts through `logger.error` with:

```ts
{
  code: 'E_UI_EDITOR_SHELL_CRASH' | 'E_UI_CANVAS_CRASH' | 'E_UI_CONTROLLER_CRASH',
  correlationId: string,
  tier: 'shell' | 'canvas' | 'controller',
  routePath: string,
  selection: RuleId[],          // last known
  ruleCount: number,
  message: string,
  digest?: string,
}
```

Successful reset emits `I_UI_BOUNDARY_RESET` with the same
`correlation_id` so the log stream shows both events.

## Nesting

Render order under a route:

```
RouteErrorFallback (step 56)
  └─ EditorErrorBoundary
      └─ EditorShell
          ├─ topBar
          ├─ ribbon
          ├─ rail
          │   └─ ControllerErrorBoundary (mounts only when selection.length === 1)
          │       └─ RuleController
          ├─ children (canvas slot)
          │   └─ CanvasErrorBoundary
          │       └─ CanvasWorkspace
          └─ status
```

Max depth from route to leaf = 3 (route -> shell -> canvas OR
controller). Adding a fifth tier requires a spec bump.

## Reset via key bump

Each tier holds an internal `resetKey` (integer). The retry button
bumps the key, which unmounts and remounts the subtree, clearing the
error state without touching the store. No `try/catch` in child
render paths as a workaround for boundary reset.

## Acceptance for step 57

- Throwing in canvas produces a canvas-only fallback; rail, ribbon,
  top bar, status strip stay interactive.
- Throwing in controller produces a controller-only fallback; canvas
  still renders and selection is preserved.
- Throwing in shell produces a shell fallback with selection reset to
  `[]` but program preserved.
- Log stream shows the `E_UI_*_CRASH` line, and clicking reset shows a
  matching `I_UI_BOUNDARY_RESET` with the same `correlation_id`.
- Nesting depth from route to any leaf is exactly 3 in the DOM.
- Guards G-BOUND-01..05 and G-ROUTE-02 pass on the new files.

## Regression guards (delta)

```bash
# G-BOUND-06: exactly 4 boundary component classes in editor scope
rg -l "class .* extends (React\.)?Component" src/components/editor/boundaries

# G-BOUND-07: fallbacks never touch the store directly
rg -nE "useEditorStore\b" src/components/editor/boundaries/*Fallback.tsx

# G-BOUND-08: every tier logs its reserved E_UI_* code exactly once per class
rg -n "E_UI_EDITOR_SHELL_CRASH|E_UI_CANVAS_CRASH|E_UI_CONTROLLER_CRASH" \
  src/components/editor/boundaries
```

Expected: G-BOUND-06 lists exactly 4 files (`boundary-base` +
`EditorErrorBoundary` + `CanvasErrorBoundary` + `ControllerErrorBoundary`,
with route tier being function-only); G-BOUND-07 empty; G-BOUND-08
shows one match per tier component.

## Decision

Three inner boundary tiers are locked with one shared class base, per
tier log codes and fallback shapes, key-bump reset without store
mutation, ribbon/topbar/status always-live during inner crashes, and a
strict max render-path depth of 3. Step 58 (save state right slot +
persistence adapter stub) may proceed.
