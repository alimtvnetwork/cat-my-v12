# Subtask: 08-verification-and-gitmap-commit

Plan: .ai-memory/plans/pending/05-pattern-search-and-ui-improvement.md
Slug: pattern-search-and-ui-improvement - Task 08
Status: READY_FOR_VERIFICATION

## 1. Objectives & Verification Blueprint

Execute the final validation suite across all modified components and libraries, verify 100% test pass rate with zero regressions, and commit cleanly via GitMap.

---

## 2. Test Execution Suite

1. **Vision Rule Analysis & Pattern Pinning**:
   - `src/lib/vision/__tests__/workpiece-rule-analyzer.test.ts`
   - `src/components/vision/workpiece/__tests__/RuleToolConfigPanel.test.tsx`
   - Verify pattern box persistence, empty pocket gating, and square ROI clamping.

2. **Luminance & Grayscale Quantization**:
   - `src/lib/vision/__tests__/luminance-quantizer.test.ts`
   - Verify ITU-R BT.601 conversion, 2-bit quantization, and dynamic contrast stretching.

3. **Menu & Window Controls**:
   - `src/components/layout/__tests__/StandardAppShell.menu.test.tsx`
   - Verify menu trigger latency, zero-transform positioning, and window control integrity.

---

## 3. GitMap Commit Discipline

- Micro-batch all changes into logical 5–8 file groups.
- Enforce hyphen-separated atomic commit messages (e.g. `spec-architecture-and-rca-for-pattern-search-and-ui-improvement`).
- Verify clean git status with no stray temporary artifacts.
