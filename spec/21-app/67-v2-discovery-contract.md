# 14 - v2.0.1 Discovery Contract

Locks the exact request/response shape, validation rules, and failure modes for the two v2.0.1 server functions exposed to the Settings UI. Companion to `spec/21-app/66-v2-vendor-discovery.md` (module contract) and `spec/21-app/62-v2-execution-order.md` (exit criteria E1..E6).

## Server-fn surface

Both live in `src/lib/capture.functions.ts`. Both use `requireSupabaseAuth` plus an admin role check (`has_role(auth.uid(), 'admin')`); non-admin callers get `E_SEC_DENIED` before any capture code runs.

### 1. `getDiscoveredDevices` (GET)

Enumerates connected cameras across all built vendor adapters. Read-only, no side effects, no audit emit.

**Request (Zod):**

```ts
z.object({
  vendors: z
    .array(z.enum(["pylon", "spinnaker", "vimba"]))
    .min(1)
    .max(3)
    .optional(),
}).strict();
```

- `vendors` omitted = enumerate all three.
- Unknown keys rejected by `.strict()`.

**Response (success, HTTP 200):**

```ts
{
  devices: Array<{
    vendor: 'pylon' | 'spinnaker' | 'vimba',
    serial: string,        // non-empty, max 128
    model: string,         // non-empty, max 128
    transport: string,     // e.g. 'GigE', 'USB3', max 64
    display_name?: string, // max 128
  }>,
  vendor_status: Record<'pylon' | 'spinnaker' | 'vimba', {
    available: boolean,    // false = SDK absent or import failed
    count: number,         // 0 when unavailable
    error_code?: 'E_CAP_SDK_ABSENT' | 'E_CAP_ENUM_FAILED',
  }>,
  ts: string,              // ISO-8601 UTC, server clock
}
```

Empty `devices` with all vendors `available:false` is a valid success (CI default). Per E1 the adapter logs a structured warning and returns `[]`, never raises.

### 2. `selectCaptureDevice` (POST)

Persists the operator's device pick to `settings.capture.device` and emits `I_SEC_ADMIN_WRITE`.

**Request (Zod):**

```ts
z.object({
  vendor: z.enum(["pylon", "spinnaker", "vimba"]),
  serial: z
    .string()
    .trim()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9._:-]+$/),
}).strict();
```

**Response (success, HTTP 200):**

```ts
{
  ok: true,
  subject: 'settings.capture.device',
  prior: { vendor, serial } | null,
  next:  { vendor, serial },
  audit_id: string,       // ULID of the I_SEC_ADMIN_WRITE row
  ts: string,
}
```

**Side effects (in order, atomic per Plan 08 dispatcher rules):**

1. Validate `{vendor, serial}` against the last `getDiscoveredDevices` result set, or a fresh enumerate if none cached within 5 s.
2. `SettingsStore.set('settings.capture.device', {vendor, serial}, actor)`.
3. Mirror `capture.vendor := vendor` in runtime config.
4. Emit `I_SEC_ADMIN_WRITE {actor, subject, prior, next, ts}` visible on `/ops` within one refresh interval (E5).

## Validation rules

| Field                   | Rule                                           | Failure code           |
| ----------------------- | ---------------------------------------------- | ---------------------- |
| `vendor`                | must be in enum                                | `E_CFG_BAD_INPUT`      |
| `serial`                | 1..128 chars, `[A-Za-z0-9._:-]+`               | `E_CFG_BAD_INPUT`      |
| `{vendor, serial}` pair | must match a descriptor from current discovery | `E_CFG_UNKNOWN_DEVICE` |
| unknown request keys    | rejected                                       | `E_CFG_BAD_INPUT`      |
| caller                  | must be authenticated admin                    | `E_SEC_DENIED`         |

Server-side validation is authoritative. Client-side Zod mirrors the same schema for UX only.

## Failure modes (response envelope)

All errors return HTTP 4xx or 5xx with:

```ts
{ ok: false, error_code: string, message: string, hint?: string }
```

| Condition                                | HTTP | `error_code`                                 | Notes                                                               |
| ---------------------------------------- | ---- | -------------------------------------------- | ------------------------------------------------------------------- |
| Unauthenticated                          | 401  | `E_SEC_UNAUTH`                               | `requireSupabaseAuth` middleware.                                   |
| Authenticated non-admin                  | 403  | `E_SEC_DENIED`                               | Audit-logged as denied attempt.                                     |
| Zod validation fails                     | 400  | `E_CFG_BAD_INPUT`                            | `message` names the failing field only, never echoes value.         |
| `{vendor, serial}` not in discovery      | 409  | `E_CFG_UNKNOWN_DEVICE`                       | Client should re-run discovery.                                     |
| Vendor SDK import fails during enumerate | 200  | (per-vendor `error_code: E_CAP_SDK_ABSENT`)  | Not a request failure; surfaced in `vendor_status`.                 |
| Vendor enumerate raises                  | 200  | (per-vendor `error_code: E_CAP_ENUM_FAILED`) | Logged with vendor + exception class; other vendors still returned. |
| SettingsStore write fails                | 500  | `E_CFG_PERSIST_FAILED`                       | No audit row emitted; caller must retry.                            |
| Audit emit fails after persist           | 500  | `E_SEC_AUDIT_FAILED`                         | Persist is rolled back per Plan 08 dispatcher atomicity.            |
| Unexpected server exception              | 500  | `E_INTERNAL`                                 | Stack logged server-side; `message` is generic.                     |

## Observability

- Every `getDiscoveredDevices` call logs `vendor_io.list_devices vendor=<v> count=<n>` (already implemented at `app/capture/vendor_device_io.py:73,76`).
- Every `selectCaptureDevice` call logs `capture.select vendor=<v> serial=<s> actor=<uid> result=<ok|error_code>` at INFO on success, WARN on `E_SEC_DENIED` / `E_CFG_UNKNOWN_DEVICE`, ERROR on 5xx.
- Silent failure is banned: absent SDK path MUST emit the WARN log line, not swallow.

## Traceability

| Exit criterion (E)                           | Contract clause                                         |
| -------------------------------------------- | ------------------------------------------------------- |
| E1 SDK-absent returns `[]` + warn            | `vendor_status.available:false` + WARN log              |
| E2 `settings.capture.device` persist         | `selectCaptureDevice` side effect 2                     |
| E3 `I_SEC_ADMIN_WRITE` emit                  | side effect 4 + `audit_id` in response                  |
| E4 non-admin denied / unknown device errored | `E_SEC_DENIED`, `E_CFG_UNKNOWN_DEVICE` in failure table |
| E5 `/ops` shows audit row within one refresh | side effect 4 note                                      |
| E6 e2e `discovery-pick` step                 | `tests/e2e/ops_vendor_smoke.py` per Plan 15 Step 13     |

## Acceptance Checklist

- [ ] TS ↔ Python schema is byte-identical (JSON) with a versioned envelope.
- [ ] Every field has a type, unit, and nullability declared.
- [ ] Backwards-incompatible change requires version bump documented here.

## Facade Binding

Per spec 52 (SDK Facade Pattern), the discovery contract crosses the seam through the `VendorDeviceIO` facade only. TS callers (`selectCaptureDevice`, `getDiscoveredDevices`) invoke Python via `capture.functions.ts` → `capture.server.ts` → `vendor_discovery.py`, which fans out through per-vendor `VendorDeviceIO` facades (63/64/65). No route handler, server function, or React component may import a vendor SDK type; the wire envelope carries `VendorDeviceDescriptor` domain objects only.

| Business surface                                                 | Bound facade                                                   | Domain object crossing the seam                               |
| ---------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| `selectCaptureDevice` server fn (`src/lib/capture.functions.ts`) | `VendorDeviceIO` (via `vendor_discovery.resolve_selection`)    | `VendorDeviceDescriptor`, `settings.capture.device` audit row |
| `getDiscoveredDevices` server fn                                 | `VendorDeviceIO` (via `vendor_discovery.discover_all_devices`) | `VendorDeviceDescriptor[]`, `vendor_status[]`                 |
| `SettingsStore.write_capture_device` (Plan 25 SS-08)             | Config seam only, no vendor SDK                                | `{vendor, serial}` persisted, `I_SEC_ADMIN_WRITE` audit event |

Enforcement: any vendor SDK import outside the facade allow-list is `E_BUG_SDK_LEAK` at lint time (spec 52 §2). Exception translation happens inside the facade only.

## Contract back-links

| Downstream contract                                                                 | Field / behavior consumed                                                                                                                                                                                       | Anchor                 |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| spec/21-app/50-capture-modules.md §VendorDeviceIO contract lock                     | `VendorDeviceDescriptor` shape, close ordering, `E_CAP_*` codes                                                                                                                                                 | Plan 25 SS-02 lock     |
| spec/21-app/52-sdk-facade-pattern.md                                                | SDK Facade Pattern; `E_BUG_SDK_LEAK` lint gate                                                                                                                                                                  | §2 Enforcement         |
| spec/21-app/63-v2-vendor-pylon.md, 64-v2-vendor-spinnaker.md, 65-v2-vendor-vimba.md | `list_devices` + normalized error mapping per vendor                                                                                                                                                            | Vendor facade sections |
| spec/21-app/66-v2-vendor-discovery.md                                               | Aggregation semantics, `W_DISCOVERY_PARTIAL` warning                                                                                                                                                            | §Aggregation           |
| spec/21-app/40-error-manage.md                                                      | Wire codes: `E_SEC_UNAUTH`, `E_SEC_DENIED`, `E_CFG_BAD_INPUT`, `E_CFG_UNKNOWN_DEVICE`, `E_CFG_PERSIST_FAILED`, `E_SEC_AUDIT_FAILED`, `E_CAP_SDK_ABSENT`, `E_CAP_ENUM_FAILED`, `E_INTERNAL`, `I_SEC_ADMIN_WRITE` | Appendix A             |
| spec/21-app/72-audit-persistence.md                                                 | Durable sink for `I_SEC_ADMIN_WRITE` on subject `settings.capture.device`                                                                                                                                       | §Codes                 |
