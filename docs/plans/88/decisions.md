# Plan 88 Decisions

Slug: backend-implementation-v1-150-steps
Updated: 2026-07-21
Owner: Lovable agent

Purpose: single source of truth for cross-step decisions made while executing Plan 88. Each decision is dated, has a rationale, and lists what it locks in downstream.

## D-001 Backend language: Python + FastAPI

Date: 2026-07-21
Step: 6
Status: accepted

Decision: the new `BE/` service is Python 3.11 + FastAPI + uvicorn. Same runtime family already used by `app/` (`app/capture`, `app/core`, `app/dispatcher`, `app/rules`, `app/supervisor`, `app/worker`) and `worker/` (`worker/app.py`, `worker/calibration_service.py`). No Node/Go split.

Rationale:

- Reuses existing dev toolchain (pytest, ruff, mypy) and existing team fluency; zero net-new language surface.
- Envelope + error handlers per `spec/03-error-manage` map cleanly to FastAPI exception handlers; documented in `spec/21-app/backend-implementation-request-v1.md`.
- Async I/O for future capture/worker RPC without dragging Node into the tree.
- Structured logging (JSON, camelCase) already standardized in `worker/app.py`; reused verbatim in `BE/main.py`.

What this locks in:

- Step 7 `BE/` skeleton is Python (`pyproject.toml`, not `package.json`).
- Steps 9-17 use `pydantic-settings`, `fastapi`, `uvicorn`.
- Steps 20-22 SDK facade is a Python `Protocol` under `BE/sdk-facade/`, mirrored on the FE by `src/lib/backend/types.ts` (Step 30).
- Steps 25-27 tooling: `ruff`, `mypy --strict`, `pytest`.
- Step 47 default backend base URL is `http://localhost:8787` (Python uvicorn), matching `BE/config.py` default.

Non-goals:

- Not adopting Node/Fastify or Go for `BE/`. Any future capture-hotpath rewrite is out of Plan 88 scope and requires a separate decision entry.
- Not merging `BE/` into `app/` or `worker/`; `BE/` is the public HTTP surface, `app/` and `worker/` remain internal services.

Verification:

- `ls app/ worker/` confirms both are Python trees (`app/capture`, `worker/app.py`, `worker/calibration_service.py`, etc.).
- `spec/21-app/backend-implementation-request-v1.md` already specifies FastAPI envelope and error handlers; no spec conflict.
