---
plan: 79
step: 33
status: completed
---

# Plan 79 Step 33 closeout: badge typography bump

## Root cause (one sentence)

SelectionOverlay position/size/rotation pill badges and BadgeNumberField
rendered at text-[12px] default weight, below the V4 legibility floor
(13px / weight 500 tabular numerics).

## Change

Six className sites in src/components/editor/canvas/SelectionOverlay.tsx
updated from text-[12px] to text-[13px] font-medium while preserving
tabular-nums, popover chrome, and ring-color borders (L148, L161, L1200,
L1245, L1290, L1319). Two unrelated list-row sites (L1829, L1922) left
alone; they belong to the rule editor rows, not overlay chrome.

## Verification

- bunx tsgo --noEmit exit 0.
- bunx vitest run: 1299 pass. 6 preexisting failures (AddressBar facade
  ratchet, project-runner FAIL semantics, sdk retry log assertions) are
  unrelated to this className-only edit.

## Unblocks

Step 35 (rotation badge chrome parity) and Step 36 (visual regression
baseline refresh) can proceed against the 13px baseline.
