# Validation Worker

Python scoring worker for the Control Automation validation pipeline. The
TanStack server function `scoreRulesRemote` in
`src/lib/editor/validation.functions.ts` POSTs `{ imageDataUrl, rules, ... }`
to `${VALIDATION_WORKER_URL}/score` and expects `{ results, worker }` back.

Cloudflare Workers can't host Python cleanly, so this lives outside the
Lovable Cloud runtime. Any host that can serve a Python HTTP endpoint works
(Fly.io, Railway, Render, ECS, a VM). Fly.io is the reference target because
`fly.toml` and the Dockerfile in this folder are pre-wired for it.

See `docs/validation-worker-runbook.md` for deploy, rotate, and rollback
procedures.

## Endpoints

- `POST /score` (auth: `Authorization: Bearer $VALIDATION_WORKER_TOKEN` when
  the env var is set)
- `GET /healthz` (unauthenticated, returns `{ ok: true, engine, version }`)

## Local run

```
cd worker
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
VALIDATION_WORKER_TOKEN=dev-token uvicorn app:app --reload --port 8787
```

Point the Lovable Cloud secret `VALIDATION_WORKER_URL` at `http://localhost:8787`
for smoke tests only. Production must be HTTPS; the settings UI rejects any
URL not matching `^https?://`, and only HTTPS should ship.
