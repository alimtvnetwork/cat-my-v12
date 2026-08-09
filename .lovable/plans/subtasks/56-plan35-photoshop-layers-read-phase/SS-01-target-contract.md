# SS-01 Target Photoshop-style contract

Slug: target-contract
Parent: 56-plan35-photoshop-layers-read-phase
Status: pending
Created: 2026-07-16

## Scope

Enumerate the Photoshop-style layer-panel behaviors the overhaul must land. For each capability, capture:

- Name (e.g. "opacity slider", "blend mode dropdown", "group/nest", "lock", "drag-reorder", "visibility toggle", "keyboard shortcuts")
- Current state in this codebase (present / partial / absent), citing `10-ui-inventory.md` and `15-state-inventory.md` line references
- Target contract (input, output, side effects, keyboard shortcut if any)
- Blast radius (single component / cross-component / state-model change)

## Output

`.lovable/memory/v2/plan35/20-target-contract.md` with a landed-vs-target matrix table + per-capability contract snippets.

## Non-goals

No implementation. No spec rewrites. No new dependencies proposed.
