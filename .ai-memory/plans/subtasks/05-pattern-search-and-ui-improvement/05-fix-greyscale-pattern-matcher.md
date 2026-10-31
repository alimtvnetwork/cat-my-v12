# Subtask: 05-fix-greyscale-pattern-matcher

Plan: .ai-memory/plans/pending/05-pattern-search-and-ui-improvement.md
Slug: pattern-search-and-ui-improvement - Task 05
Status: READY_FOR_IMPLEMENTATION

## 1. Objectives & Implementation Blueprint

Stabilize the luminance extraction, grayscale transformation, and pattern search rotation algorithms to prevent visual distortion and spurious rotational hopping.

---

## 2. Implementation Action Items

1. **Linear ITU-R BT.601 Grayscale Mode**:
   - File: `src/lib/vision/luminance-quantizer.ts`
   - Actions:
     * Introduce clean 8-bit linear grayscale transformation without mandatory contrast stretching.
     * Enforce canonical ITU-R BT.601 luminance coefficients: `Y = round(0.299 * R + 0.587 * G + 0.114 * B)`.
     * Isolate dynamic contrast stretching (`computeLuminancePercentiles`) to explicit `filterType === "contrast"` or operator toggle.
     * Calibrate 2-bit quantization thresholds into four uniform bands: `[0, 85, 170, 255]`.

2. **Rotation Search Regularization**:
   - File: `src/lib/vision/pattern-matcher.ts`
   - Actions:
     * In candidate rotation evaluation (lines 258–290), apply a penalty function favoring $\theta = 0^\circ$:
       `score = matchedCount * 1000 - totalDistance - Math.abs(angleDeg) * 2;`
     * Require a competing rotated candidate to match strictly more boxes before overturning $\theta = 0^\circ$.

---

## 3. Verification Criteria

- [ ] Linear grayscale preview renders smooth 256-level tones without blown-out contrast or clipped highlights.
- [ ] Pattern matching on symmetrical IC packages remains rock-solid at $\theta = 0^\circ$ under normal alignment.
- [ ] Automated unit test `luminance-quantizer.test.ts` passes 100%.
