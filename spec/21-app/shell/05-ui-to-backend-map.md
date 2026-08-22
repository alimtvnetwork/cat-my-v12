# UI → backend map

Status: Draft (Plan 28)
Companion: `./diagrams/09-ui-to-backend-map.mmd`
Governing contract: `./04-ipc-contract.md`

Every UI action MUST resolve to exactly one row below. Orphan UI (no row) or
orphan method (no UI caller) is a bug. Coverage script suggested at end.

Column semantics:

- **UI element** — file path relative to repo root.
- **Action** — user gesture / mount effect.
- **IPC method** — dotted, must match `04-ipc-contract.md` naming.
- **Params / Result** — JSON Schema ref under `schemas/ipc/`.
- **Codes** — success `I_*` + failure `E_*` codes (registered in `spec/21-app/40-error-manage.md`).
- **Auth** — `anon` / `user` / `admin` (checked by `requireSupabaseAuth` + `has_role`).
- **Notes** — IPC min version, streaming, idempotency.

## Routes (page-level)

| UI element                                                    | Action         | IPC method                       | Params                  | Result                  | Codes                                                                           | Auth  | Notes               |
| ------------------------------------------------------------- | -------------- | -------------------------------- | ----------------------- | ----------------------- | ------------------------------------------------------------------------------- | ----- | ------------------- |
| `src/routes/index.tsx`                                        | mount          | `home.summary.read`              | `home.summary.req`      | `home.summary.res`      | `I_HOME_SUMMARY_READ` / `E_HOME_SUMMARY_FAILED`                                 | user  | v1.0                |
| `src/routes/run.tsx`                                          | mount          | `run.state.subscribe`            | `run.state.req`         | `run.state.stream`      | `I_RUN_SUBSCRIBED` / `E_RUN_SUBSCRIBE_FAILED`                                   | user  | WS stream           |
| `src/routes/run.tsx`                                          | start button   | `run.start`                      | `run.start.req`         | `run.start.res`         | `I_RUN_STARTED` / `E_RUN_START_FAILED`                                          | user  | idempotent by `cid` |
| `src/routes/run.tsx`                                          | stop button    | `run.stop`                       | `run.stop.req`          | `run.stop.res`          | `I_RUN_STOPPED` / `E_RUN_STOP_FAILED`                                           | user  |                     |
| `src/routes/results.tsx`                                      | mount          | `results.list`                   | `results.list.req`      | `results.list.res`      | `I_RESULTS_LISTED` / `E_RESULTS_LIST_FAILED`                                    | user  | paginated           |
| `src/routes/errors.tsx`                                       | mount          | `errors.list`                    | `errors.list.req`       | `errors.list.res`       | `I_ERRORS_LISTED` / `E_ERRORS_LIST_FAILED`                                      | user  |                     |
| `src/routes/settings.tsx`                                     | mount (layout) | (none — child routes)            | —                       | —                       | —                                                                               | user  | Outlet only         |
| `src/routes/settings.index.tsx`                               | save retention | `settings.audit.retention.write` | `retention.write.req`   | `retention.write.res`   | `I_SEC_AUDIT_RETENTION_WRITTEN` / `E_SEC_RETENTION_FAILED`, `E_SEC_ROLE_DENIED` | admin | idempotent, audits  |
| `src/routes/settings.camera.tsx`                              | save           | `settings.capture.device.write`  | `capture.device.req`    | `capture.device.res`    | `I_CAPTURE_DEVICE_WRITTEN` / `E_CAPTURE_DEVICE_FAILED`                          | admin |                     |
| `src/routes/settings.license.tsx`                             | verify         | `settings.license.verify`        | `license.verify.req`    | `license.verify.res`    | `I_LICENSE_VERIFIED` / `E_LICENSE_INVALID`                                      | user  |                     |
| `src/routes/settings.lighting.tsx`                            | save           | `settings.lighting.write`        | `lighting.write.req`    | `lighting.write.res`    | `I_LIGHTING_WRITTEN` / `E_LIGHTING_FAILED`                                      | admin |                     |
| `src/routes/settings.trigger.tsx`                             | save           | `settings.trigger.write`         | `trigger.write.req`     | `trigger.write.res`     | `I_TRIGGER_WRITTEN` / `E_TRIGGER_FAILED`                                        | admin |                     |
| `src/routes/setup.reference.tsx`                              | capture ref    | `setup.reference.capture`        | `reference.capture.req` | `reference.capture.res` | `I_REFERENCE_CAPTURED` / `E_REFERENCE_FAILED`                                   | user  |                     |
| `src/routes/setup.roi.tsx`                                    | save ROI       | `setup.roi.write`                | `roi.write.req`         | `roi.write.res`         | `I_ROI_WRITTEN` / `E_ROI_FAILED`                                                | user  |                     |
| `src/routes/ops.tsx`                                          | mount          | `ops.events.list`                | `ops.events.req`        | `ops.events.res`        | `I_OPS_EVENTS_READ` / `E_OPS_EVENTS_FAILED`                                     | admin |                     |
| `src/routes/__tests__/denial-burst-shell.test.tsx`            | test           | (none)                           | —                       | —                       | —                                                                               | admin | test only           |
| `src/routes/admin.debug.calibration.tsx`                      | mount          | (none)                           | —                       | —                       | —                                                                               | admin |                     |
| `src/routes/admin.security.denial-burst.tsx`                  | mount          | (none)                           | —                       | —                       | —                                                                               | admin |                     |
| `src/routes/cli-sessions.$runId.tsx`                          | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/cli-sessions.index.tsx`                           | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/cli.ipc.tsx`                                      | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/cli.rules.$ruleId.tsx`                            | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/cli.rules.tsx`                                    | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/cli.samples.$sampleId.tsx`                        | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/cli.samples.tsx`                                  | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/cli.sessions.$sessionId.tsx`                      | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/cli.sessions.compare.tsx`                         | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/cli.sessions.tsx`                                 | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/observability.sessions.$cliInvocationId.ipc.tsx`  | mount          | (none)                           | —                       | —                       | —                                                                               | admin |                     |
| `src/routes/observability.sessions.$cliInvocationId.logs.tsx` | mount          | (none)                           | —                       | —                       | —                                                                               | admin |                     |
| `src/routes/observability.sessions.tsx`                       | mount          | (none)                           | —                       | —                       | —                                                                               | admin |                     |
| `src/routes/projects.$projectId.index.tsx`                    | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/projects.$projectId.rulesets.$rulesetId.tsx`      | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |
| `src/routes/projects.index.tsx`                               | mount          | (none)                           | —                       | —                       | —                                                                               | user  |                     |

## HMI components (event-level)

| Component | Event | IPC method | Codes | Auth |
| --------------------------------------------- | -------------- | ----------------------------------- | --------------------------------------------------- | ----- | --- |
| `src/components/hmi/ActionBar.tsx` | primary action | delegates to route method | — | user |
| `src/components/hmi/Counter.tsx` | tick | (read-only from `run.state.stream`) | — | user |
| `src/components/hmi/DeviceDiscoveryPanel.tsx` | discover | `capture.vendor.discover` | `I_VENDOR_DISCOVERED` / `E_VENDOR_DISCOVERY_FAILED` | user |
| `src/components/hmi/DeviceDiscoveryPanel.tsx` | select | `capture.vendor.select` | `I_VENDOR_SELECTED` / `E_VENDOR_SELECT_FAILED` | admin |
| `src/components/hmi/FeatureGate.tsx` | mount | `license.features.read` | `I_FEATURES_READ` / `E_FEATURES_FAILED` | user |
| `src/components/hmi/GlobalNav.tsx` | nav | (client-only, no IPC) | — | — |
| `src/components/hmi/HmiShell.tsx` | mount | `shell.ready.probe` | `I_SHELL_READY` / `E_SHELL_BOOT_FAILED` | anon |
| `src/components/hmi/MachineFrame.tsx` | mount | (composition only) | — | — |
| `src/components/hmi/ModeHeader.tsx` | mode switch | `run.mode.set` | `I_RUN_MODE_SET` / `E_RUN_MODE_FAILED` | user |
| `src/components/hmi/StatusLog.tsx` | mount | `ops.events.subscribe` | `I_OPS_SUBSCRIBED` / `E_OPS_SUBSCRIBE_FAILED` | user | WS |
| `src/components/hmi/Titlebar.tsx` | close | `shell.shutdown.request` | `I_SHELL_SHUTDOWN` / — | user |
| `src/components/hmi/Viewport.tsx` | mount | `capture.frame.subscribe` | `I_FRAME_SUBSCRIBED` / `E_FRAME_SUBSCRIBE_FAILED` | user | WS |

## Ops tiles

| Component                                     | Action    | IPC method                   | Codes                                               | Auth  |
| --------------------------------------------- | --------- | ---------------------------- | --------------------------------------------------- | ----- |
| `src/components/ops/audit-retention-tile.tsx` | apply now | `audit.retention.apply`      | `I_SEC_AUDIT_PRUNED` / `E_SEC_RETENTION_FAILED`     | admin |
| `src/routes/ops.tsx` `RetentionAuditPanel`    | mount     | `ops.events.list` (filtered) | reuses above                                        | admin |
| `src/routes/ops.tsx` capture device panel     | mount     | `capture.device.read`        | `I_CAPTURE_DEVICE_READ` / `E_CAPTURE_DEVICE_FAILED` | admin |
| `src/routes/ops.tsx` vendor smoke             | run       | `capture.vendor.smoke`       | `I_VENDOR_SMOKE_OK` / `E_VENDOR_SMOKE_FAILED`       | admin |

## Public API routes (local HTTP, not IPC)

These live under `src/routes/api/public/*` and are called by external
processes (pg_cron, monitors). They MUST verify a shared secret, not a
bearer token. Listed here for completeness; not routed through the IPC layer.

| Route                                            | Purpose      | Auth                                      |
| ------------------------------------------------ | ------------ | ----------------------------------------- |
| `src/routes/api/public/health.live.ts`           | liveness     | none                                      |
| `src/routes/api/public/health.ready.ts`          | readiness    | none                                      |
| `src/routes/api/public/hooks/audit-retention.ts` | cron trigger | `x-retention-secret` header (timing-safe) |

## Example payloads

All examples use the common envelope from `schemas/ipc/readme.md`. `cid` is
a UUIDv4 the caller mints; `code` is registered in `spec/21-app/40-error-manage.md`.

### `run.start` (routes/run.tsx, start button)

Request:

```json
{
  "cid": "8b1c...c2",
  "method": "run.start",
  "idempotencyKey": "run-2026-07-14T10:00Z",
  "params": { "recipeId": "rec_qfn32_v3", "lotId": "LOT-000421" }
}
```

Response (success):

```json
{
  "cid": "8b1c...c2",
  "code": "I_RUN_STARTED",
  "data": { "runId": "run_01HZ...", "startedAt": "2026-07-14T10:00:01.234Z" }
}
```

Response (failure):

```json
{
  "cid": "8b1c...c2",
  "code": "E_RUN_START_FAILED",
  "remediation": "Camera not ready; check `capture.device.read`."
}
```

### `results.list` (routes/results.tsx, mount)

Request:

```json
{
  "cid": "1f...",
  "method": "results.list",
  "params": { "runId": "run_01HZ...", "page": 1, "pageSize": 50 }
}
```

Response:

```json
{
  "cid": "1f...",
  "code": "I_RESULTS_LISTED",
  "data": {
    "items": [{ "id": "res_01", "verdict": "pass", "score": 0.987 }],
    "page": 1,
    "pageSize": 50,
    "total": 1240
  }
}
```

### `settings.audit.retention.write` (routes/settings.index.tsx, save retention)

Request:

```json
{
  "cid": "9a...",
  "method": "settings.audit.retention.write",
  "idempotencyKey": "retention-2026-07-14",
  "params": { "days": 365, "reason": "compliance-q3" }
}
```

Response:

```json
{
  "cid": "9a...",
  "code": "I_SEC_AUDIT_RETENTION_WRITTEN",
  "data": { "days": 365, "effectiveAt": "2026-07-14T10:05:00Z" }
}
```

Failure (RBAC):

```json
{ "cid": "9a...", "code": "E_SEC_ROLE_DENIED", "remediation": "Requires role `admin`." }
```

### `capture.frame.subscribe` (components/hmi/Viewport.tsx, mount)

Request:

```json
{
  "cid": "42...",
  "method": "capture.frame.subscribe",
  "params": { "deviceId": "cam-0", "fps": 15 }
}
```

Response (initial ack; frames follow on WS):

```json
{
  "cid": "42...",
  "code": "I_FRAME_SUBSCRIBED",
  "data": { "streamId": "s_01HZ...", "codec": "mjpeg" }
}
```

### `shell.ready.probe` (components/hmi/HmiShell.tsx, mount)

Request:

```json
{ "cid": "00...", "method": "shell.ready.probe", "params": {} }
```

Response:

```json
{
  "cid": "00...",
  "code": "I_SHELL_READY",
  "data": { "shellVersion": "3.13.0", "workerVersion": "3.13.0", "featureFlags": ["v2"] }
}
```

Remaining groups (`home`, `errors`, `settings.capture.device.write`,
`settings.license.verify`, `settings.lighting.write`,
`settings.trigger.write`, `setup.reference.capture`,
`setup.roi.write`, `ops.events.list`, `ops.events.subscribe`,
`audit.retention.apply`, `capture.vendor.*`, `capture.device.read`,
`license.features.read`, `run.state.subscribe`, `run.stop`, `run.mode.set`,
`shell.shutdown.request`) follow the same envelope and are
authored alongside their group schema in `schemas/ipc/*.schema.json`.

## Coverage assertion

`linter-scripts/check-ui-backend-map.py` MUST:

1. Enumerate every file under `src/routes/*` and `src/components/hmi/*`.
2. Grep for `useServerFn`, `fetch(`, `WebSocket(`.
3. Diff against the tables above AND against `schemas/ipc/*.schema.json`.
4. Emit `E_SPEC_UI_MAP_ORPHAN` for any UI without a row, any row without a
   caller, or any declared `*.req` / `*.res` without a schema `$def`.

The default CI run checks map rows, caller files, method index rows, diagram
filenames, and schema group files. The `--strict-schema` mode additionally
fails any declared request/response/stream ref missing from `$defs`; enable it
after the schema `$defs` fill lands.
