# 31 - Positional Adjust (modifier)

**Version:** 1.0 (draft, BLOCKED by Q11 for the exact edge model)
**Owner:** Plan 64 step 33
**Depends on:** `13-rule-kinds-catalogue.md`, `spec/23-app-db/01-root-db-schema.md` §4.3 (`posAdjustEdgeW`, `posAdjustEdgePitch`).

---

## Purpose

`PositionalAdjust` is NOT a grading rule; it is a MODIFIER that runs before other rules in the same Group and rewrites the coordinate frame so downstream ROIs land on the right feature even when the part shifted or rotated slightly. It is the single "float the ROI" primitive.

## Where it lives

- Storage: same `Rule` table, `kind = 'Group'` parent contains one `PositionalAdjust` child at `sequence = 0` plus the graded children after.
- Execution: the run pipeline detects a leading `PositionalAdjust` child in a Group and applies its transform to the remaining children's `roiX/Y/W/H/Rotation` in memory. Persisted geometry is unchanged.

## Params

| Field                | Type   | Default     | Notes                                                                                               |
| -------------------- | ------ | ----------- | --------------------------------------------------------------------------------------------------- |
| `roi*`               | geom   | required    | Search window that MUST contain the reference feature.                                              |
| `referenceShapeId`   | uuid   | required    | Shape (SVG) representing the edge / template to align on.                                           |
| `posAdjustEdgeW`     | REAL   | 3           | Edge kernel width in pixels for gradient computation.                                               |
| `posAdjustEdgePitch` | REAL   | 1           | Sample pitch along the edge in pixels; higher = faster, coarser.                                    |
| `mode`               | enum   | `Translate` | `Translate`, `TranslateRotate`, `TranslateRotateScale`.                                             |
| `maxTranslatePx`     | int    | 50          | Clamp; excess is `Error` with `code: 'AdjustOutOfRange'`.                                           |
| `maxRotateDeg`       | number | 10          | Clamp.                                                                                              |
| `maxScaleDelta`      | number | 0.1         | Clamp (1.0 +/- 0.1).                                                                                |
| `fallback`           | enum   | `Fail`      | On adjust failure: `Fail` (Group fails), `Pass-through` (siblings run without adjust), `SkipGroup`. |

Working assumption for Q11: gradient-magnitude template match constrained by `mode`. Alternative (Q11): keypoint-based (ORB/AKAZE) alignment for `TranslateRotateScale`. This spec locks the interface; the internal algorithm can swap.

## Result (recorded for audit, not user-visible verdict)

```
details: {
  applied: { dx, dy, dtheta, dscale },
  score:   0..1,
  clamped: bool,
  fallback_used: 'None'|'Pass-through'|'SkipGroup',
}
overlays: [
  { kind: 'annotation', svg: '<arrow from=old-center to=new-center/>' },
  { kind: 'roi', svg: '<polygon class="adjusted-frame"/>' }
]
```

## UI

- In the Rules editor, PositionalAdjust appears as a small blue anchor row at the top of its Group with a chain-link icon; the Group header shows "Aligned on: <shape-name>" and the applied delta in real time during Validate.
- Users add it via the Tools palette entry `Positional Adjust` while a Group is selected. Attempting to add outside a Group offers to create one automatically.

## Error paths

- No Group parent -> save-time error `code: 'PositionalAdjustNeedsGroup'`.
- Reference shape missing -> `code: 'ShapeMissing'`.
- Clamp exceeded -> honour `fallback`, always log the raw dx/dy/dtheta/dscale.

## Verification

- Fixture: image with known 15 px shift + 5 deg rotation, mode `TranslateRotate`, assert `abs(dx-15) < 1`, `abs(dtheta-5) < 0.5`.
- Playwright: add a Rectangle OCR + a Positional Adjust to a Group; shift the test image, assert OCR still passes.

## Open ambiguity

- Q11: exact algorithm and how `posAdjustEdgeW` / `posAdjustEdgePitch` map onto it.
