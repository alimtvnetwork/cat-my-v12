---
title: Route error boundary tier (plan 30 step 56)
slug: route-error-boundary
plan: 30
step: 56
status: locked
---

# Route error boundary tier

## Purpose

Land the outermost error boundary tier from the boundaries gate
(`_notes/boundaries-budget-gate.md`, 4 tiers max depth 3). Route tier
catches anything that escapes the shell tier (step 57) and prevents
blank-page failures from any store invariant throw or render crash in
`src/routes/setup*.tsx`, `results.tsx`, `run.tsx`, `ops.tsx`.

## Target files (new + edits)

```
src/components/editor/boundaries/
  RouteErrorFallback.tsx   # full-page fallback card
  route-boundary.ts        # onError helper: log + serialize
  index.ts                 # barrel

src/routes/setup.tsx       # +errorComponent, +notFoundComponent
src/routes/setup.roi.tsx   # +errorComponent, +notFoundComponent
src/routes/setup.reference.tsx
src/routes/results.tsx
src/routes/run.tsx
src/routes/ops.tsx
src/routes/__root.tsx      # verify notFoundComponent, defaultErrorComponent
```

## Fallback contract

- `role="alert"`, full route body area (grid takes over on error).
- Content: title `--text-hmi-title` "Editor error", body
  `--text-hmi-body` with the `correlation_id` in monospace, plus two
  buttons: primary "Reload editor" (calls `router.invalidate()` +
  `reset()`), secondary "Return home" (`<Link to="/">`).
- Background `--ca-bg`, card `--elevation-2`, ink `--ca-ink`, error
  chip `--ca-ng` left of the title.
- No stack trace displayed to the user; full stack goes to
  `logger.error` with fields `{ code, correlationId, routePath,
message, digest }`.
- Zero motion on entry (respects `--motion-instant` fallback).

## Error contract

- Every route with a loader MUST declare both `errorComponent` and
  `notFoundComponent` (TanStack rule; enforced by guard).
- `errorComponent` is `RouteErrorFallback`; `notFoundComponent` is
  the existing `src/routes/errors.tsx` NotFound view.
- `route-boundary.ts` exposes `logRouteError({ error, routePath })`
  which mints a `correlation_id`, calls `logger.error` with code
  `E_UI_ROUTE_CRASH`, and returns the id for the fallback to display.
- Router config in `src/router.tsx` sets `defaultErrorComponent` so
  routes without their own component still land on the tier.

## Reset semantics

- Retry button in fallback calls BOTH `router.invalidate()` AND
  `reset()`; `reset()` alone clears the boundary but does not re-run
  the loader.
- After retry, the tier emits `I_UI_ROUTE_RETRY` with the same
  `correlation_id` for correlation between crash and recovery.

## Nesting invariant

Route tier sits alone at the top; shell tier (step 57) is its only
child boundary. Depth from route to any leaf is <= 3 (route -> shell ->
canvas OR controller). Guard G-BOUND-05 verifies no fifth tier is
introduced in editor scope.

## Acceptance for step 56

- Every route file listed above declares `errorComponent:
RouteErrorFallback` and `notFoundComponent`.
- Throwing inside a route component renders `RouteErrorFallback` with
  a visible `correlation_id` and emits exactly one `E_UI_ROUTE_CRASH`
  log line; clicking Reload emits one `I_UI_ROUTE_RETRY`.
- `src/router.tsx` sets `defaultErrorComponent`.
- No `console.*` in route boundary files (uses `logger.error` only).
- Guards G-BOUND-01..05 pass on the new files.

## Regression guards (delta)

```bash
# G-BOUND-05: no fifth error boundary tier in editor scope
rg -nE "ErrorBoundary" src/components/editor src/routes/setup*.tsx | wc -l

# G-ROUTE-01: every route with a loader has errorComponent + notFoundComponent
rg -nE "createFileRoute\(" src/routes | grep -v routeTree

# G-ROUTE-02: RouteErrorFallback never renders a raw stack
rg -nE "error\.stack|\.stack\b" src/components/editor/boundaries
```

Expected: G-BOUND-05 counts <= 4 tier component names (Route / Shell /
Canvas / Controller); G-ROUTE-01 pairs with matching error/notFound
declarations; G-ROUTE-02 empty.

## Decision

Route error boundary tier is locked at one `RouteErrorFallback`
component per editor route, one `E_UI_ROUTE_CRASH` log with
`correlation_id`, one `I_UI_ROUTE_RETRY` on reload, `defaultErrorComponent`
in the router config, and no visible stack traces. Step 57 (shell +
canvas + controller tiers) may nest under this tier.
