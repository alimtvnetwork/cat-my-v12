# SS-01 — Backend Split-Brain Resolution

Parent: 99-full-architecture-remediation
Slug: SS-01-backend-split-brain
Status: pending
Created: 2026-08-17

## Goal

Eliminate the competing `BE/routes/` architecture. The established path is
`BE/routes/` + `BE/envelope.py`. Either fully integrate `BE/routes/` into that
path or delete it. After this subtask exactly ONE `envelope.py` exists in `BE/`.

## Pre-conditions

- Read `BE/routes/api/system.py` to determine if its `/system/status` endpoint
  is reachable through `BE/main.py` via `api_router` (it currently is via
  `BE/routes/api/router.py` which mounts `system_router`).
- Read `BE/routes/models/envelope.py` and compare it with `BE/envelope.py`.
  If the `BE/routes` models envelope is a strict subset (it is — 570 bytes vs 7640
  bytes), it can be deleted and callers redirected.
- Verify no test file imports from `BE/routes/`.

## Steps

### SS-01-01: Audit BE/routes imports
Run `grep -r "from BE.src" BE/` to list every module that imports from `BE.src`.
Record results. If only `BE/main.py` imports `BE.src.api.router`, proceed.

### SS-01-02: Compare envelope files
Read `BE/routes/models/envelope.py` in full. Confirm its `Envelope` class is a
smaller duplicate of `BE/envelope.py`. Document the delta in a comment block
at the top of this file.

### SS-01-03: Migrate system route
Move the functionality of `BE/routes/api/system.py` (`GET /system/status`) into
a new file `BE/routes/system.py` following the same pattern as `BE/routes/health.py`.
Use `BE/envelope.py`'s `Envelope` class, not `BE/routes/models/envelope.py`.

### SS-01-04: Register system route in main.py
Import `BE.routes.system` in `BE/main.py` and call
`app.include_router(system_route.router)` after the existing router block.
Remove the import of `BE.src.api.router` from `BE/main.py`.

### SS-01-05: Delete BE/routes tree
Delete `BE/routes/` entirely: `BE/routes/api/`, `BE/routes/models/`, `BE/routes/__init__.py`
if it exists. Verify the directory is gone.

### SS-01-06: Verify
Run `python -m py_compile BE/main.py` to verify no broken imports remain.
Run `pytest BE/tests/test_main.py` (with venv active) to confirm app startup.

## Acceptance Criteria

- `grep -r "BE.src" BE/` returns zero results.
- `ls BE/routes/` fails (directory does not exist).
- `BE/main.py` imports only from `BE.routes.*`, `BE.config`, `BE.errors`,
  `BE.middleware`, `BE.security`, `BE.logging_config`, `BE.src.api.router` is GONE.
- `GET /system/status` continues to return a valid envelope (verified by test).
