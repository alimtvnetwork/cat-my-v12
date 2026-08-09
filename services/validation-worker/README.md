# Validation Worker (Python)

Real scoring backend for the Control Automation editor. Cloudflare Workers cannot host Python, so this service runs anywhere reachable from the app: Fly.io, Render, Cloud Run, a VM.

## Contract

- `POST /score` with the JSON payload described in `src/lib/editor/validation.functions.ts` (`PayloadIn` / `PayloadOut`).
- `GET  /health` returns `{status, version, engine}`.

The response shape is authoritative. The per-rule algorithms are v1 placeholders (edge density, saturation) and are safe to replace without touching the contract.

## Env

- `VALIDATION_WORKER_TOKEN` (optional): if set, the worker rejects any request whose `Authorization: Bearer <token>` header does not match.
- `LOG_LEVEL` (default `INFO`).

## App-side env (`process.env` in server fn)

- `VALIDATION_WORKER_URL` (required): base URL of the worker, e.g. `https://validator.example.com`.
- `VALIDATION_WORKER_TOKEN` (optional): forwarded as `Authorization: Bearer ...`.

If `VALIDATION_WORKER_URL` is unset, `scoreRulesRemote` throws and the editor falls back to `runStubValidation` with a visible warning banner. There is no silent stub.

## Run locally

```
python -m pip install --no-cache-dir -r requirements.txt
VALIDATION_WORKER_TOKEN=devtoken uvicorn scorer:app --host 0.0.0.0 --port 8787
```

Then in the app deployment env:

```
VALIDATION_WORKER_URL=http://localhost:8787
VALIDATION_WORKER_TOKEN=devtoken
```

## Deploy

Any container host works. Example Fly.io Dockerfile:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY scorer.py .
CMD ["uvicorn", "scorer:app", "--host", "0.0.0.0", "--port", "8080"]
```
