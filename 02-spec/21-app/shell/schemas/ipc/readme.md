# IPC schemas

Status: Draft, strict schema coverage active as of v3.17.0.
Governing map: `../../05-ui-to-backend-map.md`.
Governing contract: `../../04-ipc-contract.md`.
Debugging workflow (log → schema): [`debugging.md`](./debugging.md).

Every `*.req` / `*.res` name referenced in `05-ui-to-backend-map.md` MUST
have a matching `$defs` entry in the owning JSON Schema file in this
directory. `linter-scripts/check-ui-backend-map.py --strict-schema` diffs
declared names against files here and emits `E_SPEC_UI_MAP_ORPHAN`; this
strict check now passes across all current map refs.

## Group files

One schema group file per functional area. Each file uses JSON Schema
Draft 2020-12 and defines both `*.req` and `*.res` under `$defs`.

| Group    | File                   | Methods                                                                                                                                           |
| -------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| home     | `home.schema.json`     | `home.summary.read`                                                                                                                               |
| run      | `run.schema.json`      | `run.state.subscribe`, `run.start`, `run.stop`, `run.mode.set`                                                                                    |
| results  | `results.schema.json`  | `results.list`                                                                                                                                    |
| errors   | `errors.schema.json`   | `errors.list`                                                                                                                                     |
| settings | `settings.schema.json` | `settings.audit.retention.write`, `settings.capture.device.write`, `settings.license.verify`, `settings.lighting.write`, `settings.trigger.write` |
| setup    | `setup.schema.json`    | `setup.reference.capture`, `setup.roi.write`                                                                                                      |
| ops      | `ops.schema.json`      | `ops.events.list`, `ops.events.subscribe`, `audit.retention.apply`                                                                                |
| capture  | `capture.schema.json`  | `capture.frame.subscribe`, `capture.vendor.discover`, `capture.vendor.select`, `capture.vendor.smoke`, `capture.device.read`                      |
| license  | `license.schema.json`  | `license.features.read`                                                                                                                           |
| shell    | `shell.schema.json`    | `shell.ready.probe`, `shell.shutdown.request`                                                                                                     |

## Common envelope

All IPC requests carry a correlation id and idempotency key; all responses
echo the correlation id and include a result code from the error registry.

```json
{
  "$id": "envelope",
  "$defs": {
    "req": {
      "type": "object",
      "required": ["cid", "method"],
      "properties": {
        "cid": { "type": "string", "format": "uuid" },
        "method": { "type": "string" },
        "idempotencyKey": { "type": "string" },
        "params": {}
      }
    },
    "res": {
      "type": "object",
      "required": ["cid", "code"],
      "properties": {
        "cid": { "type": "string", "format": "uuid" },
        "code": { "type": "string", "pattern": "^[IEW]_[A-Z0-9_]+$" },
        "data": {},
        "remediation": { "type": "string" }
      }
    }
  }
}
```

Individual group schemas MUST `$ref` this envelope for their `req` / `res`
shapes and constrain `params` and `data` inline.
