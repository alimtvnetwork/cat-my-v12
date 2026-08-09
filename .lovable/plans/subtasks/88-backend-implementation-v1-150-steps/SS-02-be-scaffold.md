---
Slug: be-scaffold
Status: pending
Created: 2026-07-21
Parent: 88-backend-implementation-v1-150-steps
---

# SS-02: `BE/` backend scaffold

Choice: Python FastAPI (matches existing `app/` and `worker/` python stack; keeps SDK bindings simple for vendor camera SDKs which are Python-first).

Layout:

```
BE/
  pyproject.toml
  BE/main.py                # FastAPI app factory
  BE/config.py              # env + defaults (host, port=8787)
  BE/envelope.py            # UniversalResponseEnvelope helpers
  BE/errors/
    __init__.py
    apperror.py             # AppError, Result[T], codes
    handlers.py             # FastAPI exception handlers -> envelope
    codes.py                # numeric ranges per spec/03-error-manage
  BE/routes/
    health.py               # GET /health -> envelope
    meta.py                 # GET /meta -> version, mode, capabilities
    rules.py                # GET/POST/PUT/DELETE stubs backed by facade
    samples.py              # GET /samples
  BE/sdk-facade/
    __init__.py
    camera.py               # CameraFacade (stub)
    storage.py              # StorageFacade
  BE/tests/
    test_health.py
    test_envelope.py
    test_error_handlers.py
```

Rules:

- All handlers return `envelope.ok(data)` or raise `AppError(code=..., message=..., details=...)`.
- No handler imports from `sdk/` directly; only via `BE/sdk-facade/`.
- Function bodies <=15 lines; no nested if; no bare except.
- Logging: structured JSON via stdlib logging + `extra=` dict; camelCase keys.
