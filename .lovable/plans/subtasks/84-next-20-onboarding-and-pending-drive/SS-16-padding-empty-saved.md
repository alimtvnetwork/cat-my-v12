# SS-16 Padding baseline + empty-state + saved-badge

Plan 84 Step 16. Plan 83 items 18-20. Spec: `.lovable/spec/commands/31-padding-and-readability-baseline.md`.
Status: DONE 2026-07-19.

## Root cause (one sentence)

Padding baseline (`spec/commands/31 §Text`) forbids `text-[10px]` for user content, but `src/features/rules/preview/LivePreviewBadge.tsx:92` rendered the rule-count subtitle at `text-[10px]`; SavedBadge and EmptyState already landed in Plan 81 and needed no work.

## Findings by item

- Item 18 (padding/readability baseline): one clear content violation at `LivePreviewBadge.tsx:92` ("(N rules)"). Fixed to `text-[11px]`. Remaining `text-[10px]` uses (22 files) are stylistic micro-labels (kbd chips, uppercase eyebrows, mono correlation IDs, validation chips) that fall outside the spec's "content a user must read" definition; enumerated below and deferred to a scoped refactor rather than absorbed into this step (minimum-correct-change rule).
- Item 19 (empty-state unification): already exists at `src/components/common/EmptyState.tsx:1` ("Plan 81 step 17. Unified empty-state primitive.") with typed `EmptyStateAction`. No change.
- Item 20 (saved-badge relative time): already exists at `src/components/settings/SavedBadge.tsx:3` ("Plan 81 step 4: relative-time 'saved N ago' badge") with `formatRelative` covered by `SavedBadge.test.ts`. No change.

## Change

```diff
- <span className="text-[10px] font-normal opacity-70">({result.rules.length} rules)</span>
+ <span className="text-[11px] font-normal opacity-70">({result.rules.length} rules)</span>
```

## Verification

- `rg -n "text-\[10px\]" src/features/rules/preview/`: 0 hits after fix.
- Sibling `text-[11px]` uses (`SaveCameraSetupModal.tsx:223`, `ShortcutCheatSheet.tsx:149`) confirm the token is the established compact-content size.

## Deferred (not part of this step)

22 stylistic `text-[10px]` uses across kbd chips, uppercase eyebrow labels, mono correlation IDs, and validation chips. A follow-up padding pass can revisit if the spec is tightened to cover them.

## Follow-ups

Plan 84 Step 17 (verification sweep: tsgo + vitest + Playwright visual specs).
