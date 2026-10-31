# Spec 81 — Pattern Search and UI Improvement

Implementation ticket for the confirmed pattern-search failure. Spec 55
remains the analysis slot. This module records the cause, the fix, and
the improvement catalogs. The catalogs are not a second implementation
queue.

## Files

| Path | Role |
| --- | --- |
| `src/lib/vision/pinned-pattern-geometry.ts` | Square the ROI, rebase it when an authored frame exists, and write the Atmel 24-box set |
| `src/lib/vision/workpiece-rule-analyzer.ts` | Pin the rule and run BT.601 before `parseBoxesFromParams` |
| `src/lib/vision/luminance-quantizer.ts` | Existing `applyLuminanceFilter` (BT.601). Called, not rewritten |
| `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx` | Persist the pin, unlock the ROI, paint the 24 boxes, show the in-ROI toolbar, show the filtered image |
| `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx` | Save the pin on Test This Rule. Show `version.json` on the status line |
| `src/components/vision/workpiece/RuleRightToolbarPanel.tsx` | Square shape keeps width equal to height |
| `src/components/vision/workpiece/AnalyzeImageToolbar.tsx` | One portaled source menu |
| `src/components/vision/standard/tools/pattern-matching/usePatternMatchingRule.ts` | Region changes write `referenceBoxes` |
| `src/components/layout/WindowControlButtons.tsx` | Minimize leaves fullscreen without the browser-mode toast |
| `run.ps1` | Skip a second Chromium window when the app URL is already open |
| `run.sh` | Same skip on the shell launcher |
| `version.json` | Version source. Read through `src/lib/version-info.ts`. No bump in this task |

## Confirmed cause

The canvas painted Atmel boxes and never wrote them into `rule.params`.
`parseBoxesFromParams` then returned length 0 and Test This Rule failed
with `Pattern inspection is not configured: missing saved pattern boxes`.
Grayscale never ran because `applyLuminanceFilter` is only reached after
boxes exist. Detail is in `01-root-cause.md`. The confirmed catalog row
is layering row 41.

## Decisions kept

- This pattern ROI defaults to a square and stays movable.
- Rebase only when `authoredFrameWidth` and `authoredFrameHeight` are
  already stored and differ from the current image. The first pin records
  the current image size, so a natural-pixel ROI is not scaled by
  image/960.
- Open questions in `.ai-memory/ambiguity-questions/03-v2-enhancement-open-decisions.md`
  and `04-plan77-dispatch.md` stay open.
- No version bump.

## Catalog

`02-catalog.md` holds 100 improvement rows and 200 layering rows, grouped
by cause. Only row L041 is confirmed. The rest are a catalog.
