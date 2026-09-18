# SS-01 Rail state shape

Slug: rail-state-shape
Parent: 88-right-rail-collapsible-and-home-scroll
Status: pending
Created: 2026-07-20

## Shape

```ts
type SectionId =
  | "preview"
  | "layers"
  | "properties"
  | "props.transform"
  | "props.appearance"
  | "props.condition"
  | "props.validation"
  | "props.advanced";

interface RailSectionState {
  collapsed: boolean; // body hidden, header visible
  hidden: boolean; // body + content hidden, header dimmed
  closed: boolean; // fully removed from rail; restore via Window menu
  order: number; // 0-based within rail
}

type RailState = Record<SectionId, RailSectionState>;
```

Storage key: `hmi.rail.v1`. Migrate absent keys to defaults `{ collapsed:false, hidden:false, closed:false, order:index }`.

## API

- `useRailPanelState(id): [state, actions]`
- actions: `toggleCollapsed`, `toggleHidden`, `close`, `open`, `resetAll`.
- Subscribable across tabs via `storage` event.
