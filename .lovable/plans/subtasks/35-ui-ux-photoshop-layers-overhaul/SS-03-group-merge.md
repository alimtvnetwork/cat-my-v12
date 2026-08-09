# SS-03 - Group / merge / join primitives

Slug: group-merge
Parent: 35-ui-ux-photoshop-layers-overhaul
Status: pending
Created: 2026-07-15

## Scope

Adds group semantics to the rules-slice:

- `RuleGroup { id, name, childIds: string[], collapsed: boolean }`
- `groupSelected()`, `ungroup(groupId)`, `mergeSelected()` (creates
  compound rule with AND join by default).

## Interactions

- Layers panel toolbar: [+] group, [-] ungroup, [merge] compound.
- Drag rule A onto rule B with Cmd/Ctrl = create new group containing
  both.
- Drag into an existing group = append as child.
- Ungroup preserves child order at the group's index.

## Persistence

Ruleset JSON (`spec/21-app/*` rule schema) gains an optional `groups`
array. Migration is additive: absent = no groups.

## Error rules

- `mergeSelected()` requires >=2 selected of compatible kinds; on
  violation logs `layers.merge_incompatible kinds=<...>` and surfaces
  a toast; no partial writes.
