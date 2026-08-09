# IPC Schema Coverage Report

- Schema files: **10**
- Total `$defs` entries: **80**
- Referenced in spec: **0** (0.0%)
- Fixture-only references: **2**
- Unused (no reference anywhere): **78**
- Missing (referenced but no `$defs`): **1**

## Per-schema coverage

| Schema                 | $def                          | Status       | Referenced from                                                                                                                                 |
| ---------------------- | ----------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `capture.schema.json`  | `capture.device.req`          | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `capture.device.res`          | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `capture.frame.req`           | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `capture.frame.stream`        | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `capture.vendor.discover.req` | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `capture.vendor.discover.res` | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `capture.vendor.select.req`   | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `capture.vendor.select.res`   | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `capture.vendor.smoke.req`    | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `capture.vendor.smoke.res`    | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `device.res`                  | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `empty.req`                   | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `frame.req`                   | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `frame.stream`                | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `ok.res`                      | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `vendor.item`                 | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `vendor.select.req`           | unused       | -                                                                                                                                               |
| `capture.schema.json`  | `vendors.res`                 | unused       | -                                                                                                                                               |
| `errors.schema.json`   | `error.item`                  | unused       | -                                                                                                                                               |
| `errors.schema.json`   | `errors.list.req`             | unused       | -                                                                                                                                               |
| `errors.schema.json`   | `errors.list.res`             | unused       | -                                                                                                                                               |
| `home.schema.json`     | `home.summary.req`            | fixture-only | linter-scripts/fixtures/ipc-examples/bad/spec/21-app/shell/examples.md, linter-scripts/fixtures/ipc-examples/good/spec/21-app/shell/examples.md |
| `home.schema.json`     | `home.summary.res`            | fixture-only | linter-scripts/fixtures/ipc-examples/good/spec/21-app/shell/examples.md                                                                         |
| `license.schema.json`  | `license.features.req`        | unused       | -                                                                                                                                               |
| `license.schema.json`  | `license.features.res`        | unused       | -                                                                                                                                               |
| `ops.schema.json`      | `audit.retention.req`         | unused       | -                                                                                                                                               |
| `ops.schema.json`      | `audit.retention.res`         | unused       | -                                                                                                                                               |
| `ops.schema.json`      | `empty.req`                   | unused       | -                                                                                                                                               |
| `ops.schema.json`      | `event.item`                  | unused       | -                                                                                                                                               |
| `ops.schema.json`      | `events.req`                  | unused       | -                                                                                                                                               |
| `ops.schema.json`      | `events.res`                  | unused       | -                                                                                                                                               |
| `ops.schema.json`      | `ops.events.req`              | unused       | -                                                                                                                                               |
| `ops.schema.json`      | `ops.events.res`              | unused       | -                                                                                                                                               |
| `ops.schema.json`      | `ops.events.stream`           | unused       | -                                                                                                                                               |
| `results.schema.json`  | `result.item`                 | unused       | -                                                                                                                                               |
| `results.schema.json`  | `results.list.req`            | unused       | -                                                                                                                                               |
| `results.schema.json`  | `results.list.res`            | unused       | -                                                                                                                                               |
| `run.schema.json`      | `empty.req`                   | unused       | -                                                                                                                                               |
| `run.schema.json`      | `mode.res`                    | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.mode.req`                | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.mode.res`                | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.start.req`               | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.start.res`               | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.started.res`             | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.state`                   | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.state.req`               | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.state.stream`            | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.steps.req`               | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.steps.res`               | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.stop.req`                | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.stop.res`                | unused       | -                                                                                                                                               |
| `run.schema.json`      | `run.stopped.res`             | unused       | -                                                                                                                                               |
| `run.schema.json`      | `start.data`                  | unused       | -                                                                                                                                               |
| `run.schema.json`      | `state.event`                 | unused       | -                                                                                                                                               |
| `run.schema.json`      | `steps.res`                   | unused       | -                                                                                                                                               |
| `settings.schema.json` | `capture.device.req`          | unused       | -                                                                                                                                               |
| `settings.schema.json` | `capture.device.res`          | unused       | -                                                                                                                                               |
| `settings.schema.json` | `config.patch.req`            | unused       | -                                                                                                                                               |
| `settings.schema.json` | `config.patch.res`            | unused       | -                                                                                                                                               |
| `settings.schema.json` | `device.req`                  | unused       | -                                                                                                                                               |
| `settings.schema.json` | `device.res`                  | unused       | -                                                                                                                                               |
| `settings.schema.json` | `kv.req`                      | unused       | -                                                                                                                                               |
| `settings.schema.json` | `license.req`                 | unused       | -                                                                                                                                               |
| `settings.schema.json` | `license.res`                 | unused       | -                                                                                                                                               |
| `settings.schema.json` | `license.verify.req`          | unused       | -                                                                                                                                               |
| `settings.schema.json` | `license.verify.res`          | unused       | -                                                                                                                                               |
| `settings.schema.json` | `lighting.write.req`          | unused       | -                                                                                                                                               |
| `settings.schema.json` | `lighting.write.res`          | unused       | -                                                                                                                                               |
| `settings.schema.json` | `ok.res`                      | unused       | -                                                                                                                                               |
| `settings.schema.json` | `retention.req`               | unused       | -                                                                                                                                               |
| `settings.schema.json` | `retention.res`               | unused       | -                                                                                                                                               |
| `settings.schema.json` | `retention.write.req`         | unused       | -                                                                                                                                               |
| `settings.schema.json` | `retention.write.res`         | unused       | -                                                                                                                                               |
| `settings.schema.json` | `trigger.write.req`           | unused       | -                                                                                                                                               |
| `settings.schema.json` | `trigger.write.res`           | unused       | -                                                                                                                                               |
| `setup.schema.json`    | `empty.req`                   | unused       | -                                                                                                                                               |
| `setup.schema.json`    | `reference.capture.req`       | unused       | -                                                                                                                                               |
| `setup.schema.json`    | `reference.capture.res`       | unused       | -                                                                                                                                               |
| `setup.schema.json`    | `reference.res`               | unused       | -                                                                                                                                               |
| `setup.schema.json`    | `roi.req`                     | unused       | -                                                                                                                                               |
| `setup.schema.json`    | `roi.res`                     | unused       | -                                                                                                                                               |
| `setup.schema.json`    | `roi.write.req`               | unused       | -                                                                                                                                               |
| `setup.schema.json`    | `roi.write.res`               | unused       | -                                                                                                                                               |
| `shell.schema.json`    | `shell.ready.req`             | unused       | -                                                                                                                                               |
| `shell.schema.json`    | `shell.ready.res`             | unused       | -                                                                                                                                               |
| `shell.schema.json`    | `shell.shutdown.req`          | unused       | -                                                                                                                                               |
| `shell.schema.json`    | `shell.shutdown.res`          | unused       | -                                                                                                                                               |

## Missing $defs (referenced but not defined)

| Ref                | Referenced from                                                        |
| ------------------ | ---------------------------------------------------------------------- |
| `nope.missing.req` | linter-scripts/fixtures/ipc-examples/bad/spec/21-app/shell/examples.md |
