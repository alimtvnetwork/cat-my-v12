# SS-05 — Navigation lock while running

Parent: 02-control-automation-redesign
Status: pending
Created: 2026-07-09

Requirement (brief §4.3): while `runState.status === 'running'`, only Stop and `/errors` are reachable. Tool ribbon, settings, and setup are disabled or hidden.

Implementation:

1. `runState` store exposes `status` and `isRunning` selector.
2. `Titlebar` reads `isRunning`; when true, greys out non-run nav items with `aria-disabled` and `pointer-events-none`.
3. `ToolRibbon` renders in read-only mode when `isRunning` (tiles show current selection, no interaction).
4. Locked routes add:

```ts
export const Route = createFileRoute("/setup/")({
  beforeLoad: () => {
    if (useRunStore.getState().isRunning) {
      throw redirect({ to: "/run" });
    }
  },
  component: SetupPage,
});
```

5. `/run` and `/errors` never redirect regardless of state.
6. `Stop` control lives in `/run` ActionBar and is always enabled while running; on stop, `status → 'idle'` and locks lift automatically.

Verification: manually flip `useRunStore.setState({ status: 'running' })` in the browser devtools and confirm redirects + disabled nav.
