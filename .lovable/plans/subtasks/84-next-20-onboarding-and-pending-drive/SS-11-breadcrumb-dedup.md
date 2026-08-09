# SS-11 Breadcrumb dedup + AddressBar mount verification

Plan 84 Step 11. Verifies Plan 83 backlog item 6 (AddressBar mount) and the
single-mount breadcrumb invariant from `.lovable/memory/`.

## Root cause (one sentence)

No bug: `AppBreadcrumb` and `AddressBar` are each imported exactly once from
`src/components/hmi/Titlebar.tsx`, which is the sole `<header>` mounted by
`HmiShell`, so the single-mount invariant is intact.

## Evidence

- `rg -n "AppBreadcrumb|showBreadcrumb" src` shows the only render sites are
  `Titlebar.tsx:77` (`<AppBreadcrumb variant="inline" />`) and its consumer
  `HmiShell.tsx:102` (`showBreadcrumb={!hideNav}`). No route file re-mounts
  `AppBreadcrumb`.
- `rg -n "shell/AddressBar" src` shows one import: `Titlebar.tsx:12`. Rendered
  once in the breadcrumb branch (`:78`) and once in the fallback branch
  (`:87`), so exactly one `AddressBar` mounts per shell state.
- `src/components/shell/AddressBar.tsx` binds `Ctrl+L`/`Cmd+L` at the window
  level (line 38) and exposes `title="Address bar (Ctrl+L)"` (line 101).
- Legacy `src/components/app-shell/Breadcrumb.tsx` has zero importers
  (`rg "from.*app-shell/Breadcrumb['\"]" src` returns none); orphan, safe to
  leave for a later cleanup step.

## Outcome

- Plan 83 backlog item 6 (AddressBar mount + `Ctrl+L`) flips DONE.
- No source edits required.
