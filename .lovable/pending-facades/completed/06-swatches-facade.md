# Swatches facade TODO

Status: fake (IndexedDB via `idb-keyval`)
Owner: Plan 79 step 31

## What the fake does

`src/lib/swatches/facade.ts` persists a small array of user-added
swatch hex codes to IndexedDB under key `ca.v4.swatches.v1`. Defaults
seed 12 tokenized colors. All reads happen through
`useSwatches()` (subscribable hook) so the UI never touches storage
directly.

## What the real SDK call must do

- Swap `idb-keyval` for the licensed SDK's `swatches.list()` /
  `swatches.upsert(hex)` / `swatches.remove(hex)` endpoints.
- Scope by workspace and user id.
- Emit `swatch.upserted` / `swatch.removed` audit events.

## Migration checklist

- [ ] Replace body of `swatchesFacade.list/add/remove/reset` with SDK calls.
- [ ] Keep the `useSwatches()` hook shape identical.
- [ ] Extend the reset flow to hit the SDK's factory-defaults endpoint.
- [ ] Remove `KEY = "ca.v4.swatches.v1"` and any localStorage / idb
      migration once the SDK is authoritative.
