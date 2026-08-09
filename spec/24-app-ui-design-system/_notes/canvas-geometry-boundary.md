# Deep Dive: Canvas Geometry Boundary (Plan 30 Step 26)

**Version:** 1.0  
**Updated:** 2026-07-14  
**Depends on:** `03-canvas.md`, `08-testing.md`.  
**Status:** Closed.

---

## Boundary owner

Geometry lives behind two pure modules:

| Module                       | Owns                                                        |
| ---------------------------- | ----------------------------------------------------------- |
| `src/lib/editor/coords.ts`   | image-space to canvas-space conversion, zoom, pan, fit math |
| `src/lib/editor/hit-test.ts` | bbox, nearest vertex, body hit-test, shape validation       |

React components, Zustand actions, Playwright hooks, and future WASM code must call this boundary instead of duplicating geometry math.

## Stable API

```ts
type GeometryPoint = { x: number; y: number };
type GeometryBBox = { x: number; y: number; width: number; height: number };
type HitTarget = { shapeId: string; part: "Body" | "Vertex" | "Handle" | "Rotate" };
type GeometryIssue = { shapeId: string; code: "Degenerate" | "OutOfBounds" | "InvalidNumber" };

imageToCanvas(point: GeometryPoint, view: CanvasView): GeometryPoint;
canvasToImage(point: GeometryPoint, view: CanvasView): GeometryPoint;
bbox(shape: RuleShape): GeometryBBox;
nearestVertex(point: GeometryPoint, shape: RuleShape, toleranceCanvasPx: number): HitTarget | null;
hitTest(point: GeometryPoint, shapes: RuleShape[], view: CanvasView): HitTarget | null;
validateShape(shape: RuleShape): GeometryIssue[];
```

## Runtime rules

1. The boundary is deterministic and side-effect free.
2. No DOM reads, React imports, store imports, Date/random, or logging inside geometry helpers.
3. `validateShape` is the only geometry validation surface.
4. Callers log validation issues as `W_UI_RULE_INVALID` with `shapeId`, issue `code`, and `correlation_id`.
5. Canvas load or render failures still surface as `E_UI_CANVAS_LOAD` per `07-errors-logging.md`.

## WASM seam

A future WASM kernel may replace internal implementations only if it preserves the API above. The TypeScript wrapper remains the public import surface, so tests and store actions do not change.

## Verification targets

- `hit-test.test.ts` covers bbox, body hit-test, vertex tolerance, invalid shapes, and stack ordering.
- `interaction.spec.ts` covers Alt-click cycling and ESC revert through the same boundary.
- `perf.spec.ts` seeds 200 shapes and measures the `hitTest` path under the 16 ms p95 budget.
