---
title: Boundaries budget gate (plan 30 step 47)
slug: boundaries-budget-gate
plan: 30
step: 47
status: locked
---

# Boundaries budget gate

## Purpose

Freeze the module and error boundaries that separate pure geometry, store
actions, route error boundaries, and persistence writes. Selectors (step 45) and undo (step 46) are locked, so this gate stops implementation
steps 61-90 from duplicating geometry math, swallowing store failures, or
letting errors leak past the editor route.

## Module boundary layers

| Layer                               | Path                                                        | May import                           | Must NOT import                       |
| ----------------------------------- | ----------------------------------------------------------- | ------------------------------------ | ------------------------------------- |
| geometry (pure)                     | `src/lib/editor/geometry/**`                                | none in editor scope                 | store, react, dom, canvas element     |
| store (state + actions)             | `src/lib/editor/store/**`                                   | geometry, types                      | react components, dom, canvas element |
| hit-test / selectors                | `src/lib/editor/hit-test.ts`, `src/lib/editor/selectors/**` | geometry, store types                | react components, dom                 |
| canvas layer                        | `src/components/editor/canvas/**`                           | geometry, store, hit-test, selectors | route files, persistence writes       |
| rail / ribbon / status / controller | `src/components/editor/{rail,ribbon,status,controller}/**`  | store, selectors, types              | geometry internals, canvas element    |
| persistence                         | `src/lib/editor/persistence/**`                             | store types                          | react components, dom, canvas element |
| route shell                         | `src/routes/setup*.tsx`                                     | components, persistence entry        | geometry, hit-test, store internals   |

Geometry is imported only through its barrel; store internals are
imported only through action creators and selectors. No component reads
raw store fields.

## Store action boundary

Every store mutation goes through a named action creator in
`src/lib/editor/store/actions/**`. Components never call `set(...)`
directly. Action creators MUST:

1. Validate inputs against the closed rule-kind matrix.
2. Return a discriminated `Result<T, EditorError>` on failure paths that
   can be recovered (kind switch clearing shape, params out of range).
3. Throw `EditorInvariantError` only on invariants a caller could never
   trigger with valid UI state; the route error boundary catches it.

Silent catches, `Promise` swallowing, and boolean-return "ok/nok" action
signatures are banned.

## Error boundary tiers

| Tier         | Owner                                              | Fallback                        | Recovery                                                     |
| ------------ | -------------------------------------------------- | ------------------------------- | ------------------------------------------------------------ |
| route        | `src/routes/setup*.tsx` `errorComponent`           | full-page error card            | reload route + `router.invalidate()` + `reset()`             |
| editor shell | `<EditorErrorBoundary>` at shell root              | shell shell with rail collapsed | reset selection, keep program, log `E_UI_EDITOR_SHELL_CRASH` |
| canvas       | `<CanvasErrorBoundary>` around canvas layer        | canvas-off card with reload     | preserves selection + history                                |
| controller   | `<ControllerErrorBoundary>` around rule controller | inline "controller failed" card | clears controller only; canvas keeps rendering               |

Boundary tiers do not nest more than 3 deep on any render path. Each
boundary logs one `E_UI_*` code with `correlation_id` and the last
selection state; no boundary silently returns `null`. Route boundary
folds spec step 48 (error boundaries) unless a downstream step raises a
route-specific concern.

## Persistence write boundary

Persistence adapters (`src/lib/editor/persistence/**`) MUST:

- Accept only `Program` values returned by `serializeProgram()`.
- Emit exactly one `I_UI_PERSIST_WRITE` log per commit with `bytes`,
  `duration_ms`, `correlation_id`.
- Surface failures as `E_UI_PERSIST_WRITE` and let the shell boundary
  render the "Saving..." to "Dirty" transition; never retry silently.
- Never read from the store directly; the caller passes the serialized
  program in.

## Budget

- Module boundary layers: 7 (geometry, store, hit-test/selectors, canvas,
  rail-group, persistence, route shell).
- Error boundary tiers: 4 (route, shell, canvas, controller).
- Max boundary nesting depth on any render path: 3.
- Persistence log lines per commit: exactly 1 info + at most 1 error.
- Silent catches in editor scope: 0.

## Regression guards

```bash
# G-BOUND-01: components never import geometry internals directly
rg -nE "from ['\"]@/lib/editor/geometry/(?!index)" src/components/editor src/routes/setup*.tsx

# G-BOUND-02: no direct set(...) or store internals from components
rg -nE "useEditorStore\.setState\(|store\.set\(" src/components/editor src/routes/setup*.tsx

# G-BOUND-03: no empty catch blocks in editor scope
rg -nE "catch\s*\([^)]*\)\s*\{\s*\}" src/components/editor src/lib/editor src/routes/setup*.tsx

# G-BOUND-04: every boundary logs an E_UI_* code (no silent null return)
rg -nE "ErrorBoundary" src/components/editor src/routes/setup*.tsx
```

Expected: G-BOUND-01..03 empty at step 51+; G-BOUND-04 has at least one
match per tier when boundaries land at step 90.

## Decision

Boundaries are frozen around 7 module layers, 4 error-boundary tiers with
max depth 3, action-creator-only store mutations, and a single
serialized-input persistence adapter. Step 48 (error boundaries) folds
into this gate; step 49 (perf) may proceed.
