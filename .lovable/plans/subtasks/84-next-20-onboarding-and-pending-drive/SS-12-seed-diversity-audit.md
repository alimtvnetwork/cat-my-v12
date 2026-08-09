# SS-12 Seed diversity audit

Plan 84 Step 12. Snapshot of what the seed layer ships today.

## Files read

- `src/lib/editor/sample-library.ts` (lines 13-77): declares `SampleCategory = "pcb" | "circuit" | "carrier-tape"` and 5 entries in `SAMPLE_LIBRARY`.
- `src/lib/seed/gap-check.ts` (lines 55-64, 158-177): sample id closure check.
- `src/lib/seed/types.ts` (line 13): `CatSeedRuleKind = "C" | "R" | "K" | "S" | "E"`.
- `src/lib/seed/data/bundle.json`: 5 categories, 64 named rules across 5 rule kinds.

## Rule-kind coverage (bundle.json)

| Kind | Meaning       | Count |
| ---- | ------------- | ----- |
| R    | Rect          | 12    |
| K    | OCR/ROI-K     | 10    |
| E    | Expression    | 6     |
| S    | Anchor/static | 6     |
| C    | Circle        | 5     |

All 5 declared rule kinds have ≥5 seeded instances. Kind coverage is sufficient for Plan 83 acceptance.

## Sample-library coverage (SAMPLE_LIBRARY)

| Category     | Count |
| ------------ | ----- |
| pcb          | 1     |
| carrier-tape | 4     |
| circuit      | 0     |

## Gap found

`SampleCategory` declares `"circuit"` but no `SAMPLE_LIBRARY` entry uses it. A route or picker filtering by category `"circuit"` would render an empty list. Two acceptable fixes for Step 13:

1. Add ≥1 sample under category `"circuit"` (preferred - matches spec intent).
2. Drop `"circuit"` from the `SampleCategory` union if the category is dead.

No source change in this step (audit only). Step 13 will implement the chosen fix.

## Non-gaps

- Every `SAMPLE_LIBRARY.id` is unique (`carrier-tape-1..4`, `pcb-default`); `SAMPLE_POV_MAP` covers all 5.
- Every bundle `sampleImages` entry (none currently) would be checked by `runSeedGapCheck` against `sampleLibraryIds`.
- Bundle rule kinds are a subset of `CatSeedRuleKind`; no orphan kinds.
