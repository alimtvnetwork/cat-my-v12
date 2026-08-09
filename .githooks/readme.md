# Git hooks

Versioned pre-commit hook that blocks commits when IPC schema $defs or
UI-backend map coverage checks fail in strict mode.

## Install (once per clone)

```bash
bash .githooks/install.sh
```

This sets `core.hooksPath` to `.githooks` so `pre-commit` runs on every
`git commit`. The hook only runs when files under `spec/21-app/shell/`,
`linter-scripts/{check-ui-backend-map,check-ipc-examples,fixtures/...}`,
`src/`, or `app/` are staged.

## What it runs

1. `python3 linter-scripts/check-ui-backend-map.py --strict-schema`
   Fails on any orphan method, missing `$defs` entry, unmapped caller, or
   drifted diagram (error code `E_SPEC_UI_MAP_ORPHAN`).
2. `python3 linter-scripts/check-ipc-examples.py`
   Fails when any annotated example payload does not validate against its
   schema (`E_SPEC_IPC_EXAMPLE`).

Same commands run in CI (`.github/workflows/ci.yml`), so a commit that
passes the hook also passes the PR gate.

## Bypass

Use only for WIP branches or emergency fixes:

```bash
git commit --no-verify
```

The CI job still enforces the same checks on the PR.
