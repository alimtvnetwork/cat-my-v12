# BE

Public HTTP surface for Control Automation. FastAPI + uvicorn, Python 3.11.

- Spec: `spec/21-app/backend-implementation-request-v1.md`
- Decision: `docs/plans/88/decisions.md` D-001 (language lock)
- Plan: `.lovable/plans/pending/88-backend-implementation-v1-150-steps.md`
- Subtask layout: `.lovable/plans/subtasks/88-backend-implementation-v1-150-steps/SS-02-be-scaffold.md`

Status: progressively implementing Plan 88.

## Getting Started

Run the following commands to set up, test, and run the backend:

```bash
make setup-backend
make test-backend
make dev-backend
```

## Layout

```
BE/
  pyproject.toml           # deps, ruff, pytest (Step 7); scripts + strict mypy (Steps 25-27)
  __init__.py              # __version__
  main.py                  # FastAPI app factory + `be-dev` entry (Steps 15, 25)
  config.py                # pydantic-settings: host, port=8787, env, logLevel (Step 9)
  envelope.py              # ok(data) / fail(code, message, details) (Step 10)
  errors/
    codes.py               # numeric ranges from spec/03-error-manage (Step 11)
    apperror.py            # AppError, Result[T], wrap() (Step 12)
    handlers.py            # FastAPI exception handlers -> envelope + JSON log (Step 13)
  routes/
    health.py              # GET /health (Step 16)
    meta.py                # GET /meta (Step 17)
    rules.py               # rules CRUD in-memory (Step 18)
    samples.py             # GET /samples mirroring FE seed (Step 19)
    observability/         # GET /observability/* IPC/logs/runs/sessions (Step 35+)
    cli_observability.py   # CLI entrypoints for observability
    cli_config.py          # CLI entrypoints for config
    cli_doctor.py          # CLI entrypoints for doctor
  sdk_facade/              # NOTE: SS-02 doc says `sdk-facade/`; disk uses `sdk_facade/`
                           # because Python import identifiers ban hyphens.
    __init__.py            # SdkFacade Protocol + SDK_FACADE_VERSION (Step 20)
    camera.py              # CameraFacade stub (Step 21)
    storage.py             # StorageFacade stub (Step 22)
  tests/
    test_skeleton.py       # import sanity (Step 7)
    test_health.py         # (Step 23)
    test_envelope.py       # (Step 23)
    test_error_handlers.py # (Step 23)
    test_rules_crud.py     # (Step 24)
```

## Run

Install dev deps once (from repo root):

```
pip install -e "./BE[dev]"
```

Dev server (available after Step 25):

```
be-dev                     # uvicorn on http://127.0.0.1:8787
```

Tests, lint, types:

```
pytest BE/tests            # available now (skeleton import test)
ruff check BE              # available now
mypy BE                    # strict config lands in Step 27
```

## Hardware Testing

For Daheng camera hardware testing, install the specific dependency extra and run the hardware test suite with the feature flag enabled:

```
pip install -e "./BE[camera-daheng]"
LOVABLE_HW_DAHENG=1 pytest BE/tests/hardware
```

## Facade rule (non-negotiable)

- HTTP handlers in `BE/routes/**` MUST call `BE/sdk_facade/**`. Never import from repo-root `sdk/` directly.
- Vendor SDK handles (camera, storage, transport-layer objects) MUST NOT cross the facade boundary. Copy buffers before releasing SDK memory.
- Every error at the boundary uses one wire code from `spec/21-app/40-error-manage.md` Appendix A (SCREAMING*SNAKE `E*<AREA>\_<CONDITION>`).
- Envelope contract: PascalCase envelope (`Status/Attributes/Results/Errors`). See `BE/envelope.py` and `src/lib/backend/envelope.ts`.

## Coding guidelines

Per `spec/coding-guidelines/python.md`:

- Function bodies ≤ 15 lines; positive, non-nested `if`; boolean names start with `is`/`has`.
- No bare `except`; every `except` logs once with `correlationId`, `operation`, `code`, primary subject id.
- Structured JSON logs, camelCase keys, stdlib `logging` + `extra=`.
- Unknown vendor exceptions surface as typed adapter errors at the facade; never swallow.

## Default endpoint

`http://127.0.0.1:8787` (locked by Plan 88 D-001; matches FE `localStorage` key `ui.backend.baseUrl` default from Step 47).

## Windows Service Mode (Future Work)

Running the BE as a Windows Service is deferred. See Step 92 notes for requirements regarding NSSM or native Python Windows service bindings.

Last verified: 2026-08-16
