---
name: fastapi-backend-and-runtime
description: FastAPI backend services, route contracts, query wrappers, build caching prevention, and split-DB persistence in BE/.
---

# FastAPI Backend & Runtime Architecture

## Overview
Governs the development, execution, error handling, and database interactions of the FastAPI HTTP backend services located in `BE/` (listening on `:8787`).

## 1. Directory Structure & Service Layout
- **`BE/main.py`**: Application bootstrap, CORS middleware, error handlers, and router registration.
- **`BE/routes/`**:
  - `rules.py`: Ruleset retrieval, draft merging, and versioned updates (`/rules/{ruleSetId}`).
  - `samples.py`: Image and metadata sample ingestion and cataloging.
  - `vision.py`: Server-side vision algorithms (e.g. `POST /vision/white-box-marking`).
  - `cli_observability.py` & `cli_doctor.py`: Diagnostics, log stream inspection, and health reports.
  - `cli_config.py`: Hardware and runtime configuration management.
- **`BE/sdk_facade/`**: Pure abstraction wrappers over camera devices and storage adapters.
- **`BE/db/`**: Connection management, migrations, and query execution wrappers.

## 2. Universal Response Envelope
All API endpoints must return payloads conforming to the Universal Response Envelope:
```json
{
  "Status": "success",
  "Attributes": {
    "timestamp": "2026-09-24T12:00:00Z",
    "version": "1.0.0"
  },
  "Results": [ ... ],
  "Errors": []
}
```
- In case of failure: `"Status": "error"`, `"Results": []`, `"Errors": [{ "Code": "E_*", "Message": "..." }]`.

## 3. Safe Database Query Wrappers
- **Prohibition**: Never use raw `conn.execute(...)` or unguarded `try/except` blocks.
- **Required**:
  - Python: Use `safe_execute`, `safe_executemany`, and `safe_executescript` from `BE.db.connections`.
  - TypeScript: Use `executeApiQuery` from `src/lib/db-wrapper.ts`.
- These wrappers handle transaction rollback, error logging, and envelope formation automatically.

## 4. Python uv Build Caching Hazard (`be.egg-info`)
- **Hazard**: Executing `uv run --project BE` generates a `BE/be.egg-info` directory. If left cached or committed, subsequent runs execute stale code regardless of local edits.
- **Mandate**:
  - Always ensure `BE/be.egg-info` is defensively deleted in launcher scripts (`run.ps1`, `run.sh`) before launching `uv run`.
  - Verify `*.egg-info` is included in `.gitignore`.

## 5. Rotated Observability Streams
- Log endpoints must inspect both active and rotated JSONL streams:
  - `retention.log` (current) and `retention.log.1` (previous rotated log).
  - Explicit boolean flags (`hasCurrent`, `hasPrevious`) must be returned to avoid conflating empty logs with missing files.
