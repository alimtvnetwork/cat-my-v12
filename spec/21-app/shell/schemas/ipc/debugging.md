# Debugging an IPC / schema mismatch

Use this workflow when a runtime IPC call fails, a linter raises
`E_SPEC_UI_MAP_ORPHAN`, or a schema validation error appears in logs. The goal:
trace from the log line back to the exact schema file, `$defs` entry, and
caller so the fix is minimum and correct.

## 0. Prerequisites

- Reproduce the failure or capture the failing log line first. If there are
  no logs, that is the bug: instrument the caller before continuing (per
  `spec/21-app/41-logging.md`; do not swallow errors).
- Keep the failing correlation_id handy: every step below filters by it.

## 1. Read the error log line

Every IPC error must carry these fields (see `spec/21-app/40-error-manage.md`
Appendix A and `spec/21-app/41-logging.md`):

- `code` — e.g. `E_IPC_SCHEMA_MISMATCH`, `E_INSTRUCTION_SCHEMA`, `E_SPEC_UI_MAP_ORPHAN`
- `method` — dotted IPC method, e.g. `run.state.subscribe`
- `direction` — `req` | `res` | `stream`
- `field_path` — JSON pointer of the offending field, e.g. `/rules/0/paramsJson/MinCount`
- `correlation_id`
- `payload_sample` (redacted) — first mismatching subtree only

If any of these are absent from the log, the caller violates the logging
contract; fix that first, then re-run.

## 2. Locate the responsible schema group

Map `method` to its group file via
`spec/21-app/shell/schemas/ipc/readme.md` "Group files" table. Example:
`run.state.subscribe` → `run.schema.json`.

If the method is not in that table, the linter would already flag it as
orphaned. Run the coverage linter to confirm:

```sh
python3 linter-scripts/check-ui-backend-map.py --strict-schema
```

A non-zero exit prints the exact orphan method or missing `$defs` name.

## 3. Open the `$defs` entry

Inside the group schema, jump to `$defs["<method>.<direction>"]`. Example
key: `run.state.subscribe.req`. This is the single authoritative shape.

- Rule: every `*.req` / `*.res` name referenced in
  `spec/21-app/shell/05-ui-to-backend-map.md` MUST have a `$defs` entry.
  Missing → `E_SPEC_UI_MAP_ORPHAN` from `--strict-schema`.

## 4. Trace `field_path` to the schema node

Walk `field_path` from step 1 inside the `$defs` entry. The mismatch is one
of exactly three cases:

- **Missing / extra field:** compare against the schema's `properties` +
  `required`. Fix the caller to match the schema, or amend the schema and
  add a fixture. Never both silently.
- **Wrong type / enum:** compare against `type` / `enum` / `pattern` on the
  node. Prefer PascalCase enum values (see `spec/21-app/33-rule-catalog.md`
  reason-code table).
- **Ref target moved:** if the node uses `$ref`, follow it. Cross-file
  `$ref` is banned; refs must stay within the group file's `$defs`. A
  broken ref surfaces as `E_IPC_SCHEMA_MISMATCH` with `field_path` pointing
  at the ref parent.

## 5. Confirm the caller matches

Search for the callers of the method:

```sh
rg -n "run\.state\.subscribe" src/
```

`check-ui-backend-map.py` already enforces that every schema method has at
least one caller (`useServerFn` / `fetch(` / `WebSocket(`) referenced from
the map. If your caller uses a different name than the schema, one of the
two is wrong — the schema wins.

## 6. Reproduce with a fixture

Add or extend a fixture that reproduces the exact failing payload:

- Passing payload → `linter-scripts/fixtures/ipc-examples/good/spec/21-app/shell/schemas/ipc/examples/<group>/<method>.<direction>.json`
- Failing payload → `.../bad/.../<method>.<direction>.<reason>.json`

Then run:

```sh
python3 linter-scripts/check-ipc-examples.py
```

`good/` payloads must validate; `bad/` payloads must fail validation with
the same `field_path` seen in the runtime log. If the fixture doesn't
reproduce the log, either the log field_path is wrong or the schema differs
from what runtime uses. Do not proceed until fixture and log agree.

## 7. Apply the minimum fix

Exactly one of:

- Amend the caller to match the schema (most common — schema is truth).
- Amend the schema `$defs` entry AND add a `good/` fixture AND bump the
  schema semver in the group file's `$id` / `version` field AND update
  `spec/21-app/shell/schemas/ipc/readme.md` if the method list changed.

Never silence the error with `try/except`, a permissive `additionalProperties: true`,
or a wider `type` union — those are symptom patches and violate the
error-management contract in `spec/21-app/40-error-manage.md`.

## 8. Prove it

Re-run both linters and the targeted test:

```sh
python3 linter-scripts/check-ui-backend-map.py --strict-schema
python3 linter-scripts/check-ipc-examples.py
python3 -m pytest tests -x --tb=short -k ipc
```

All three must be green. The CI workflow at `.github/workflows/ci.yml`
enforces the first two on every pull request and fails the build on any
non-zero exit, so a drop in coverage blocks merge automatically.

## 9. Update the log if the code changed

If you added a new error code, register it in
`spec/21-app/40-error-manage.md` Appendix A in the same commit. Unregistered
codes are caught by `check-mws-error-codes.py`.

---

## Quick reference

| Log signal                 | Root cause                                           | First file to open                                                        |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `E_SPEC_UI_MAP_ORPHAN`     | method in map without `$defs` (or vice versa)        | `spec/21-app/shell/05-ui-to-backend-map.md` and the group `*.schema.json` |
| `E_IPC_SCHEMA_MISMATCH`    | payload shape ≠ `$defs` entry                        | group `*.schema.json` at `$defs["<method>.<direction>"]`                  |
| `E_INSTRUCTION_SCHEMA`     | canonical JSON instruction doesn't match v2 envelope | `spec/21-app/36-json-instruction-output.md` + `instruction.schema.json`   |
| `E_IPC_UNKNOWN_METHOD`     | caller uses a name absent from the map               | `spec/21-app/shell/05-ui-to-backend-map.md`                               |
| Missing / unexpected field | `properties` / `required` mismatch                   | `$defs["<method>.<direction>"].properties`                                |
| Wrong enum value           | `enum` list on the field                             | `$defs["<method>.<direction>"]` at `field_path`                           |

## Diagrams

Auto-generated by `linter-scripts/generate-error-diagrams.py` from the same
inputs the validators read. Regenerate after a schema change; broken edges
are drawn with `==>` and tagged with the matching error code.

- `docs/diagrams/ipc-error-path.mmd` (schema file -> $def -> ref site;
  unused `$defs` and missing refs are highlighted)
- `docs/diagrams/ipc-error-edge.mmd` (method -> $def, split by
  req / res / stream)
