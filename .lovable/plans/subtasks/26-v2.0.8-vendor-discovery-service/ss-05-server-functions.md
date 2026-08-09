# SS-05 — Server functions: getDiscoveredDevices + selectCaptureDevice

Slug: server-functions
Parent: 26-v2.0.8-vendor-discovery-service
Status: pending
Created: 2026-07-14

## Purpose

Bridge the TypeScript client to the Python discovery + admin write path through typed server functions, gated by admin auth.

## Files

- `src/lib/capture-discovery.functions.ts` (new): two server fns via `createServerFn` from `@tanstack/react-start`.
  - `getDiscoveredDevices` — `{ method: "GET" }`, no input, returns `DiscoveredDevice[]`. Calls the Python bridge that wraps `vendor_discovery.aggregate_discovery()`. Partial-discovery warnings mapped to `{ warnings: ["W_DISCOVERY_PARTIAL"] }` on the response envelope.
  - `selectCaptureDevice` — `{ method: "POST" }`, input `z.object({ vendor: z.enum(["pylon","spinnaker","vimba"]), serial: z.string().min(1) })`, calls the Python bridge that invokes `SettingsStore.write_capture_device`. Maps thrown errors to typed HTTP-safe codes (`E_CFG_UNKNOWN_DEVICE`, `E_SEC_ROLE_DENIED`, `E_SEC_NOAUTH`, `E_SEC_RATE_LIMITED`).
- Middleware: use `requireSupabaseAuth` + admin `has_role` check. Rate-limit denials must still emit the Python audit row (do NOT short-circuit on the TS side without a Python round-trip, or the audit trail is lost).
- `src/lib/capture.shared.ts`: export the `DiscoveredDevice` type + `CaptureDeviceError` union so both the panel and the ops view can import from one place.
- `src/start.ts`: verify `attachSupabaseAuth` (or the project-specific bearer middleware) is registered in `functionMiddleware`. Do NOT re-add if already present.

## Rules

- Never place these under `src/server/` (import protection blocks the whole directory).
- Do NOT import `supabaseAdmin` at module top level; if needed for the ops row query, `await import('@/integrations/supabase/client.server')` inside the handler.
- Do NOT call these fns from a public loader; they call from the Settings UI component via `useServerFn` under `_authenticated/`.

## Definition of done

- Type-check passes: no `any` on the input/output boundary.
- `useServerFn(selectCaptureDevice)` inside `src/routes/settings.camera.tsx` compiles.
- Denial-path errors surface as structured objects, not generic 500s.
- Bridge round-trip produces the Python audit row on both success and failure paths (verified in SS-08 integration test).
