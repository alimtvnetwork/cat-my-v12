# Plan 79 Step 36 closeout, rotation persistence

Status: completed
Date: 2026-07-23

## Summary

Persistence for ROI `rotation` already landed across the stack; this step confirmed the seam and refreshed stale comments in `SelectionOverlay.tsx` that still described step 36 as "not yet" done.

## Evidence

- Type: `src/lib/editor/types.ts` (`rotation?: number` on EditorRule).
- Zod: `src/lib/editor/store/persistence.ts` (`rotation: z.number().optional()`).
- Reducer: `src/lib/editor/store/rules-slice.ts` `setRuleRotation` normalises to (-180, 180] and coalesces with layout edits.
- Envelope roundtrip: `src/lib/rules/envelopeAdapter.ts` maps to/from `_Rotation`; covered by `src/lib/rules/__tests__/envelopeRoundtrip.test.ts`.
- Wiring: `src/components/editor/setup/EditorSetupExperience.tsx` passes `onRotateRule -> storeSetRotation`.
- Default-on-load: `useSelectedRuleShape` normalises `rotation ?? 0`, so pre-step-36 rows read as 0 without a migration pass.

## Verification

- tsgo --noEmit: exit 0.
- vitest: envelopeRoundtrip (3), rules-slice-groups (17), persistence (2) all green.

## Follow-ups

None. Step 37 (Alt-from-centre resize + Shift aspect lock) is next.
