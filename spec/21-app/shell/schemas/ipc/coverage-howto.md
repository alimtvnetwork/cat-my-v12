# Strict-Schema Coverage: How-To

Short guide to the IPC schema `$defs` + UI-backend map coverage workflow.
For error-trace debugging, see `debugging.md`.

## The three checks

| Check                            | Command                                                          | Fails on                                                                                  |
| -------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| UI-backend map coverage (strict) | `python3 linter-scripts/check-ui-backend-map.py --strict-schema` | orphan method, missing `$defs`, unmapped caller, drifted diagram (`E_SPEC_UI_MAP_ORPHAN`) |
| IPC example payloads             | `python3 linter-scripts/check-ipc-examples.py`                   | any `<!-- ipc:ref=... -->` block that does not validate (`E_SPEC_IPC_EXAMPLE`)            |
| Coverage report                  | `python3 linter-scripts/generate-schema-coverage-report.py`      | never fails; writes `reports/schema-coverage.{md,html}`                                   |

## Where they run

- **Locally, on save**: run any of the three commands from the repo root.
- **On commit**: `.githooks/pre-commit` runs the first two in strict mode
  (install once with `bash .githooks/install.sh`).
- **On PR**: `.github/workflows/ci.yml` runs the same two commands and fails
  the build when coverage drops.

Same command, same exit code, everywhere. Green locally = green in CI.

## Adding or changing a `$defs` entry without drift

Do these four things in one commit; skipping any one causes drift.

1. **Edit the schema** in `spec/21-app/shell/schemas/ipc/<group>.schema.json`.
   Add or rename the entry under `$defs`. Keep the key in
   `<group>.<method>.(req|res|stream)` form.
2. **Update the UI-backend map** row for that method so the `req` / `res`
   cell references the new `$defs` key in backticks. Add the row if the
   method is new. Remove the row if you deleted the entry.
3. **Update every example** that references the old key: change the
   `<!-- ipc:ref=... -->` marker AND the JSON body to match the new shape.
4. **Regenerate the coverage report** and commit it:

   ```bash
   python3 linter-scripts/generate-schema-coverage-report.py
   git add reports/schema-coverage.md reports/schema-coverage.html
   ```

Then run both linters strict-mode before committing:

```bash
python3 linter-scripts/check-ui-backend-map.py --strict-schema
python3 linter-scripts/check-ipc-examples.py
```

The pre-commit hook does the same when installed.

## Common drift patterns

- **Renamed `$def` but not the map** -> `E_SPEC_UI_MAP_ORPHAN` (missing `$defs`).
  Fix: update the ticked ref in the map row.
- **Added `$def` used only in fixtures** -> shows as `fixture-only` in the
  coverage report. Fix: reference it from real spec (a method row + example),
  or delete it.
- **Deleted `$def` still cited in an example** -> `E_SPEC_IPC_EXAMPLE`.
  Fix: delete or rewrite the example block.
- **Added a caller (`useServerFn`, `fetch(`, `WebSocket(`) without a map row**
  -> `E_SPEC_UI_MAP_ORPHAN` (unmapped caller). Fix: add the row.

## Bypass

`git commit --no-verify` skips the hook for WIP only. CI still enforces the
same checks on the PR, so the bypass buys you one commit, not one merge.
