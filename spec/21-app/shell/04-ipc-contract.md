# IPC contract

Status: Draft (Plan 28)
Companion: `./diagrams/04-ipc-request.mmd`
Schema source of truth: `spec/21-app/shell/schemas/ipc/*.json` (created during implementation)

## Transport

Primary: **loopback HTTP + WebSocket** on `127.0.0.1:<random>`, bound by the
Python worker at boot and reported to the shell on stdout (`READY {"port":N}`).
Fallback (embedded / test): **stdio JSON-RPC 2.0** using the same envelope.

Renderer never opens sockets directly. All IPC goes through the shell IPC
thread, which:

1. Attaches the per-launch bearer token.
2. Enforces origin `app://` on renderer-side callers.
3. Rate-limits per method (see backpressure below).

## Handshake

On boot, shell injects into the renderer via preload:

```
window.__SHELL_IPC__ = {
  port: <int>,       // loopback port bound by worker
  token: <hex-32>,   // per-launch bearer
  version: "1.0.0",  // IPC contract version
}
```

Renderer sends every request with header:

```
Authorization: Bearer <token>
X-Shell-IPC-Version: 1.0.0
X-Correlation-Id: <ULID>
```

Worker rejects with `E_SHELL_IPC_UNAUTHORIZED` (401) on token mismatch and
`E_SHELL_IPC_VERSION_MISMATCH` (409) on major version drift.

## Request envelope

```json
{
  "cid": "01J...ULID",
  "method": "audit.retention.apply",
  "params": {},
  "actor": "user:<uuid> | system",
  "ts": "2026-07-14T00:00:00Z"
}
```

- `cid` — ULID, client-generated; used for idempotency + log correlation.
- `method` — dotted lowercase; MUST appear in `05-ui-to-backend-map.md`.
- `params` — validated against JSON Schema; unknown fields rejected.
- `actor` — `system` for shell-originated, `user:<uuid>` after login.
- `ts` — ISO-8601 UTC; drift > 5 min → `E_SHELL_IPC_CLOCK_SKEW` (warn only).

## Response envelope

Success:

```json
{ "cid": "01J...", "ok": true, "result": {} }
```

Failure:

```json
{
  "cid": "01J...",
  "ok": false,
  "error": {
    "code": "E_SEC_RETENTION_FAILED",
    "message": "human-readable",
    "hint": "actionable remediation",
    "retryable": false
  }
}
```

Every `code` MUST be registered in `spec/21-app/40-error-manage.md` and
mirrored in `12-error-taxonomy.md` for shell-scope codes.

## Streaming

WebSocket frames carry the same envelope plus:

```json
{ "cid": "...", "seq": 0, "final": false, "result": {} }
```

`final: true` closes the logical stream. Renderer MUST tolerate out-of-order
`seq` only within one `cid`.

## Timeouts

- Default request timeout: **5 s**.
- Long-running methods (perf harness, migrations) MUST return `{ job_id }` and
  stream progress via WS; no request may exceed 30 s without streaming.
- Timeout → `E_SHELL_IPC_TIMEOUT`, `retryable: true`.

## Backpressure

- Renderer: max **8 in-flight** requests per method; overflow rejected client-side
  as `E_SHELL_IPC_BACKPRESSURE`.
- Worker: bounded async queue per method; overflow → 503 with same code.

## Idempotency

Writes (`method` prefix `settings.*`, `audit.*`, `capture.write.*`) MUST include
`cid`. Worker de-dupes by `cid` for **60 s** using an in-memory LRU
(10k entries). Duplicate `cid` returns the cached response without re-executing.

## Versioning

- `X-Shell-IPC-Version` uses semver. Minor bumps additive, major bumps
  breaking. Worker maintains an N-1 major compat shim for one release cycle.
- Every method row in `05-ui-to-backend-map.md` MUST cite the minimum IPC
  version it requires.

## Auth

- Bearer token is per-launch; rotated on every shell start.
- Token never logged, never persisted to disk, never sent to non-loopback.
- Worker binds only `127.0.0.1`; requests from other interfaces refused at
  socket layer (not just at auth).

## Error taxonomy (shell-scope)

Full list in `12-error-taxonomy.md`. Codes referenced here:

- `E_SHELL_IPC_UNAUTHORIZED` — bad or missing bearer.
- `E_SHELL_IPC_VERSION_MISMATCH` — major version drift.
- `E_SHELL_IPC_CLOCK_SKEW` — informational warning only.
- `E_SHELL_IPC_TIMEOUT` — server-side or transport timeout.
- `E_SHELL_IPC_BACKPRESSURE` — queue full.
- `E_SHELL_WORKER_CRASH` — supervisor detected crash during in-flight call.

## Observability

Every request logs one record on entry and one on exit via
`app/core/telemetry/log_record.py` with fields `cid`, `method`, `actor`,
`duration_ms`, `outcome`, and (on failure) `code`. A missing pair indicates
a bug in the IPC thread, not a silent success.
