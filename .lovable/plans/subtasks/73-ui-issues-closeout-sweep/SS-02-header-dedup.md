# SS-02 header dedup

Slug: header-dedup
Parent: 73-ui-issues-closeout-sweep
Status: pending
Created: 2026-07-18

## Scope

Issues 18 + 22: two headers rendering simultaneously on setup/editor routes. Root cause hypothesis: `Titlebar` mounted at both `__root.tsx` and a nested layout.

## Steps

1. `rg "<Titlebar" src/routes src/components` and list every mount site.
2. Confirm the canonical mount is `src/routes/__root.tsx` around `<Outlet />`.
3. Delete duplicate mounts; per-route sub-headers use `<ModeHeader />`, not `<Titlebar />`.
4. Extend `tests/e2e/playwright_single_header.py` to sweep `/`, `/projects`, `/setup`, `/setup/rules`, `/setup/lighting`, `/setup/functions`, `/setup/chain-events` and assert exactly one `[data-testid="app-titlebar"]` per page.

## Verification

- Grep shows exactly one `<Titlebar` render site.
- Playwright single-header sweep is green.
