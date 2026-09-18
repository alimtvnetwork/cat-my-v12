# 24 — Config Surface

**Status:** Locked (Plan 04 Step 24). Maps every runtime knob to exactly one owning layer.

Anchors: 04-seedable-config-digest (4-layer resolution Seed → App → Task → Runtime), 20 §4 (ownership matrix), 21 §3.5 (`AppSetting` table), 23 §3 (`RuleOverride` cascade).

## 1. Layer Recap (from 04-seedable-config-digest)

Highest wins:

```
1. Runtime      (in-memory; UI toggles; per-RunSession; not persisted)
2. Task         (task.db:AppSetting-equivalent OR rules.db override — depends on knob)
3. App          (root.db:AppSetting)
4. Seed         (config/seed.toml; read-only defaults)
```

If a layer is silent for a key, the next lower layer answers. `null` at any layer means "unset — fall through".

## 2. Master Knob Table

| Key                                   | Type                                  | Default (Seed)  | App | Task                                        | Runtime                      | Consumer                                 |
| ------------------------------------- | ------------------------------------- | --------------- | --- | ------------------------------------------- | ---------------------------- | ---------------------------------------- |
| `worker.count`                        | int 1–16                              | `min(cpu-2, 6)` | ✅  | ✅ (advisory; effective at next RunSession) | ❌                           | Supervisor at Task start — resolves Q-02 |
| `worker.batchSize`                    | int 1–8                               | `3`             | ✅  | ✅                                          | ❌                           | Dispatcher assignment loop               |
| `capture.targetFps`                   | int 1–120                             | `77`            | ✅  | ✅                                          | ❌                           | Capture (14)                             |
| `capture.imageFormat`                 | enum `jpg`\|`png`\|`bmp`              | `jpg`           | ✅  | ✅ (locked for RunSession)                  | ❌                           | Capture; enforces 25 §4.1                |
| `capture.jpegQuality`                 | int 60–100                            | `92`            | ✅  | ✅                                          | ❌                           | Capture (only when format=`jpg`)         |
| `capture.triggerSource`               | enum `EXTERNAL`\|`INTERNAL`\|`MANUAL` | `EXTERNAL`      | ✅  | ✅                                          | ✅ (MANUAL only for testing) | Capture (14 §4)                          |
| `pipeline.backPressureWarn`           | int                                   | `500`           | ✅  | ❌                                          | ❌                           | Dispatcher (15 §6)                       |
| `pipeline.backPressureDegraded`       | int                                   | `2000`          | ✅  | ❌                                          | ❌                           | Dispatcher (15 §6)                       |
| `pipeline.diskHaltMb`                 | int                                   | `500`           | ✅  | ❌                                          | ❌                           | Capture halt guard (14 §4)               |
| `storage.processedRetentionDays`      | int                                   | `30`            | ✅  | ✅                                          | ❌                           | Maintenance job (46)                     |
| `storage.failedRetentionDays`         | int                                   | `90`            | ✅  | ✅                                          | ❌                           | Maintenance job (46)                     |
| `logging.level`                       | enum `DEBUG`\|`INFO`\|`WARN`\|`ERROR` | `INFO`          | ✅  | ❌                                          | ✅                           | All processes (41)                       |
| `logging.rotateMb`                    | int                                   | `100`           | ✅  | ❌                                          | ❌                           | 41-logging                               |
| `logging.keepFiles`                   | int                                   | `10`            | ✅  | ❌                                          | ❌                           | 41-logging                               |
| `ui.theme`                            | enum `dark`\|`light`                  | `dark`          | ✅  | ❌                                          | ✅                           | UI Shell                                 |
| `ui.zoomDefault`                      | enum `fit`\|`100`\|`custom`           | `fit`           | ✅  | ✅                                          | ✅                           | Rule Setup / Results (35, 38)            |
| `rule.tolerance.matchPercentDefault`  | real 0–100                            | `80.0`          | ✅  | ✅ (via `rules.db` override, per 23)        | ❌                           | Rule Setup default                       |
| `rule.tolerance.xyBoundsPxDefault`    | int                                   | `5`             | ✅  | ✅                                          | ❌                           | Rule Setup default                       |
| `ai.provider`                         | enum `NONE`\|`GATEWAY`                | `NONE`          | ✅  | ❌                                          | ❌                           | AI stub (43) — currently unused          |
| `ai.enabled`                          | bool                                  | `false`         | ✅  | ✅                                          | ❌                           | AI stub (43)                             |
| `audit.retention.cadenceHours`        | int 1-24                              | `6`             | ✅  | ❌                                          | ❌                           | Rotation worker (71 §71.3.1)             |
| `audit.retention.batchRowCap`         | int 100-5000                          | `1000`          | ✅  | ❌                                          | ❌                           | Rotation worker (71 §71.3.2)             |
| `audit.retention.policyBudgetSeconds` | int 30-900                            | `300`           | ✅  | ❌                                          | ❌                           | Rotation worker (71 §71.3.2)             |
| `audit.retention.shortDays`           | int 30-180                            | `30`            | ✅  | ❌                                          | ❌                           | Policy window (71 §71.2.1)               |
| `audit.retention.standardDays`        | int 180-540                           | `180`           | ✅  | ❌                                          | ❌                           | Policy window (71 §71.2.1)               |
| `audit.retention.longDays`            | int 400-900                           | `400`           | ✅  | ❌                                          | ❌                           | Policy window (71 §71.2.1)               |
| `audit.retention.forensicDays`        | int 900-2555                          | `900`           | ✅  | ❌                                          | ❌                           | Policy window (71 §71.2.1)               |
| `audit.retention.exportEnabled`       | bool                                  | `true`          | ✅  | ❌                                          | ❌                           | Export server fn (71 §71.5)              |

**"Task" column notation:**

- ✅ via `AppSetting`-style rows scoped by `taskId` — writes go into `task.db:AppSetting` (mirror of root's shape, keyed the same way).
- ✅ (via `rules.db`) — only rule-scoped knobs use the per-rule override cascade in 23.

## 3. Where Each Layer Lives

| Layer   | Storage                                                             | Writer                            | Reader boot pattern                                  |
| ------- | ------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| Seed    | `config/seed.toml`                                                  | installer only                    | parsed once by Supervisor at boot                    |
| App     | `root.db:AppSetting`                                                | Supervisor (from UI Settings, 39) | Supervisor reads once + hot-reloads on Settings save |
| Task    | `task.db:AppSetting` (new; mirror shape) OR `rules.db` (rule knobs) | UI Rule Setup / Task Settings     | Dispatcher reads at Task/RunSession start            |
| Runtime | in-memory, per-RunSession                                           | UI (toggles + query params)       | ephemeral; lost on process exit                      |

`task.db:AppSetting` is a new table added by the initial `task/000_init.sql` migration; it uses the exact shape as `root.db:AppSetting` (21 §3.5).

## 4. Resolution Contract (`core/config.resolve`)

```
def resolve(key: str, taskId: Optional[str], runtimeOverrides: dict) -> Any:
    for layer in [runtimeOverrides, taskLayer(taskId), appLayer(), seedLayer()]:
        if key in layer and layer[key] is not None:
            return layer[key]
    raise E_CONFIG_MISSING(key)   # unknown key = bug, not a fall-through
```

- Unknown keys raise. There is no "silent default". Every knob in this file is registered in a code-side schema (`core/config/schema.py`) — the schema is the source of truth for allowed keys, types, and ranges.
- Type/range validation happens on **write**, not read. UI Settings validates before persisting.
- Hot-reload: App-layer writes broadcast an `AppSettingChanged{key}` event; subscribers re-read only that key. Task and Runtime layers do not hot-reload mid-run (per 13 immutable-snapshot rule) — they take effect at the **next** RunSession.

## 5. Never-Configurable

Locked at code-time, not exposed:

- ULID format (25 §2)
- `imageSequence` width (9 digits)
- Directory literals (`pending/`, `inflight/`, `processed/`, `failed/`, `snapshots/`, `results/`, `logs/`)
- WAL / synchronous mode
- Verdict precedence (`NG > ERROR > OK`)
- IPC protocol (JSON-lines over UDS/named-pipe)

Changing any of these requires a code change and a version bump, not a config toggle.

## 6. Failure Modes

| Code               | Cause                        |
| ------------------ | ---------------------------- |
| `E_CONFIG_MISSING` | Unknown key requested        |
| `E_CONFIG_TYPE`    | Write of wrong type          |
| `E_CONFIG_RANGE`   | Write outside declared range |
| `E_CONFIG_ENUM`    | Write not in enum            |

All raised by `core/config` — never swallowed.

## 7. Non-Goals

- No `.env` support in v1 (config is TOML + DB).
- No environment-variable overrides for operational knobs. Operators change values via UI Settings; devs edit `seed.toml`.
- No per-user config in v1 (single-operator install, 44).
- No live-editing of `seed.toml` at runtime — the file is read exactly once at boot.

## Acceptance Checklist

- [ ] Every config key is namespaced (`Runtime.*`, `Capture.*`, `Audit.*`, `License.*`).
- [ ] Defaults produce a bootable system with zero manual edits (matches spec 07).
- [ ] Hot-reloadable keys marked; the rest require restart (`I_CFG_RESTART_REQUIRED`).
