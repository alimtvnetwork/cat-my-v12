# Per-method diagrams

Status: Draft (Plan 28, Step A of prompt 314 executed).
Governing map: `../../05-ui-to-backend-map.md`.
Group schemas: `../../schemas/ipc/*.schema.json`.

One `.mmd` per IPC method row in the mapping table. Filename equals the
dotted method name. Every diagram uses the same shape (UI → IPC → worker →
sink) so the coverage linter can cross-check filenames against map rows and
against schema group `$def` keys.

| Method                           | Diagram                              | Group schema           | Map row (UI element)                          |
| -------------------------------- | ------------------------------------ | ---------------------- | --------------------------------------------- |
| `home.summary.read`              | `home.summary.read.mmd`              | `home.schema.json`     | `src/routes/index.tsx`                        |
| `run.state.subscribe`            | `run.state.subscribe.mmd`            | `run.schema.json`      | `src/routes/run.tsx`                          |
| `run.start`                      | `run.start.mmd`                      | `run.schema.json`      | `src/routes/run.tsx`                          |
| `run.stop`                       | `run.stop.mmd`                       | `run.schema.json`      | `src/routes/run.tsx`                          |
| `run.mode.set`                   | `run.mode.set.mmd`                   | `run.schema.json`      | `src/components/hmi/ModeHeader.tsx`           |
| `results.list`                   | `results.list.mmd`                   | `results.schema.json`  | `src/routes/results.tsx`                      |
| `errors.list`                    | `errors.list.mmd`                    | `errors.schema.json`   | `src/routes/errors.tsx`                       |
| `settings.audit.retention.write` | `settings.audit.retention.write.mmd` | `settings.schema.json` | `src/routes/settings.index.tsx`               |
| `settings.capture.device.write`  | `settings.capture.device.write.mmd`  | `settings.schema.json` | `src/routes/settings.camera.tsx`              |
| `settings.license.verify`        | `settings.license.verify.mmd`        | `settings.schema.json` | `src/routes/settings.license.tsx`             |
| `settings.lighting.write`        | `settings.lighting.write.mmd`        | `settings.schema.json` | `src/routes/settings.lighting.tsx`            |
| `settings.trigger.write`         | `settings.trigger.write.mmd`         | `settings.schema.json` | `src/routes/settings.trigger.tsx`             |
| `setup.reference.capture`        | `setup.reference.capture.mmd`        | `setup.schema.json`    | `src/routes/setup.reference.tsx`              |
| `setup.roi.write`                | `setup.roi.write.mmd`                | `setup.schema.json`    | `src/routes/setup.roi.tsx`                    |
| `ops.events.list`                | `ops.events.list.mmd`                | `ops.schema.json`      | `src/routes/ops.tsx`                          |
| `ops.events.subscribe`           | `ops.events.subscribe.mmd`           | `ops.schema.json`      | `src/components/hmi/StatusLog.tsx`            |
| `audit.retention.apply`          | `audit.retention.apply.mmd`          | `ops.schema.json`      | `src/components/ops/audit-retention-tile.tsx` |
| `capture.frame.subscribe`        | `capture.frame.subscribe.mmd`        | `capture.schema.json`  | `src/components/hmi/Viewport.tsx`             |
| `capture.vendor.discover`        | `capture.vendor.discover.mmd`        | `capture.schema.json`  | `src/components/hmi/DeviceDiscoveryPanel.tsx` |
| `capture.vendor.select`          | `capture.vendor.select.mmd`          | `capture.schema.json`  | `src/components/hmi/DeviceDiscoveryPanel.tsx` |
| `capture.vendor.smoke`           | `capture.vendor.smoke.mmd`           | `capture.schema.json`  | `src/routes/ops.tsx`                          |
| `capture.device.read`            | `capture.device.read.mmd`            | `capture.schema.json`  | `src/routes/ops.tsx`                          |
| `license.features.read`          | `license.features.read.mmd`          | `license.schema.json`  | `src/components/hmi/FeatureGate.tsx`          |
| `shell.ready.probe`              | `shell.ready.probe.mmd`              | `shell.schema.json`    | `src/components/hmi/HmiShell.tsx`             |
| `shell.shutdown.request`         | `shell.shutdown.request.mmd`         | `shell.schema.json`    | `src/components/hmi/Titlebar.tsx`             |

The linter (see `linter-scripts/check-ui-backend-map.py`, tracked separately)
must diff this table against the mapping table and the schema `$def`s and
emit `E_SPEC_UI_MAP_ORPHAN` on drift.
