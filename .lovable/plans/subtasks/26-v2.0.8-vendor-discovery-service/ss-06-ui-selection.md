# SS-06 — UI: operator selection in Settings → Camera

Slug: ui-selection
Parent: 26-v2.0.8-vendor-discovery-service
Status: pending
Created: 2026-07-14

## Purpose

Give the operator a picker rendered from live discovery data, with inline error surfacing and a lock-during-run guardrail.

## Files

- `src/components/hmi/DeviceDiscoveryPanel.tsx` — replace any manual/hidden selection with a table:
  - Columns: Vendor, Model, Serial, Transport, Display name, Select.
  - Select button dispatches `useServerFn(selectCaptureDevice)`.
  - Loading via `useSuspenseQuery` on `getDiscoveredDevices` (Rescan button calls `queryClient.invalidateQueries`).
- `src/routes/settings.camera.tsx` — mount the panel, gate on run-active state from the zustand hardware store (disable Select while running).
- Error rendering: `E_CFG_UNKNOWN_DEVICE`, `E_SEC_ROLE_DENIED`, `E_SEC_RATE_LIMITED` map to status tokens (`--hmi-status-error`, etc.). No hardcoded hex, no gradients, no icon-swaps. State by background color per the design memory.
- Success: toast via `sonner` (`toast.success("Capture device set: <vendor> <serial>")`), inline row highlight using `--hmi-select` token.
- A11y: table with proper `<caption>`, per-row Select is a real `<button>` with `aria-label` including vendor+serial.

## Definition of done

- Axe run on `/settings/camera` (`python3 tests/e2e/axe_a11y.py --route /settings/camera`) reports 0 serious/critical violations.
- Playwright smoke navigates → picks device → sees success toast → sees `/ops` audit row (SS-08).
- No file introduces hardcoded colors (grep must be clean on the diff).
- Panel renders under `_authenticated/` layout only; unauthenticated visits redirect to `/auth`.
