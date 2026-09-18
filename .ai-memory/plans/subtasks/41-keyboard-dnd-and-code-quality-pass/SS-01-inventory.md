---
Slug: inventory
Status: pending
Created: 2026-07-16
Parent: 41-keyboard-dnd-and-code-quality-pass
---

# SS-01, magic-string / magic-number inventory

Produce a checklist of every offender under src/\*\* so the enum/constant
refactor lands in one pass without missing sites.

## Method

1. `rg -n "\"(idle|running|paused|stopped|C|R|K|S|E)\"" src` — capture
   status + rule-kind string comparisons.
2. `rg -n "=== '(fine|coarse|dragging|grabbed)'" src` — DnD modes.
3. `rg -n "0\\.02|0\\.05" src` — blob tolerance literals outside the
   schema module.
4. `rg -n "\\? .* : .*\\? " src` — nested ternaries (candidates for
   extraction).
5. Write findings to this file as a table: file, line, symbol, target
   enum / constant, target module.

## Deliverable

| File                                                | Symbol / Pattern          | Target Enum / Constant   | Target Module                   |
| --------------------------------------------------- | ------------------------- | ------------------------ | ------------------------------- |
| `src/components/cli/GlobalCliStatusWidget.tsx`      | `"idle"`, `"running"`     | `RunStatus`              | `src/types/run/RunStatus.ts`    |
| `src/components/cli/status-pill.tsx`                | `"idle"`, `"running"`     | `RunStatus`              | `src/types/run/RunStatus.ts`    |
| `src/components/app-shell/RunningPill.tsx`          | `"idle"`, `"running"`     | `RunStatus`              | `src/types/run/RunStatus.ts`    |
| `src/components/editor/canvas/SelectionOverlay.tsx` | `"grabbed"`, `"dragging"` | `DndMode`                | `src/types/rules/DndMode.ts`    |
| `src/components/editor/layers/LayersPanel.tsx`      | `"C"`, `"R"`, `"K"`...    | `RuleKind`               | `src/types/rules/RuleKind.ts`   |
| `src/components/rules/RuleKindBadge.tsx`            | `"C"`, `"R"`, `"K"`...    | `RuleKind`               | `src/types/rules/RuleKind.ts`   |
| `src/lib/editor/schema.ts`                          | `"C"`, `"R"`, `"K"`...    | `RuleKind`               | `src/types/rules/RuleKind.ts`   |
| `src/components/editor/panels/BlobPanel.tsx`        | `0.02`, `0.05`            | `BLOB_GROWTH_TOLERANCES` | `src/lib/editor/schema.ts`      |
| `src/components/editor/layers/LayerRow.tsx`         | nested ternaries          | Extract helper           | `src/components/editor/layers/` |
| `src/components/editor/canvas/CanvasViewport.tsx`   | nested ternaries          | Extract helper           | `src/components/editor/canvas/` |
| `src/components/editor/PropertiesPanel.tsx`         | nested ternaries          | Extract helper           | `src/components/editor/`        |
