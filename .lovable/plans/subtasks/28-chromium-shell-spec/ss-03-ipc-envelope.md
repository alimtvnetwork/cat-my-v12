---
Slug: ipc-envelope
Parent: 28-chromium-shell-spec
Status: pending
Created: 2026-07-14
---

# SS-03 — IPC envelope and transport

Produce `spec/21-app/shell/04-ipc-contract.md`. Must specify:

- Transport: loopback HTTP+WebSocket on a random port bound to 127.0.0.1 with a per-launch bearer token injected into the renderer via preload; alt: stdio JSON-RPC 2.0 for embedded modes. Choose HTTP+WS as primary, document stdio as fallback.
- Handshake: renderer receives `{port, token, version}` from shell at boot; renderer rejects any other origin.
- Request envelope:
  ```json
  {
    "cid": "01J...ULID",
    "method": "audit.retention.apply",
    "params": {},
    "actor": "user:<uuid>|system",
    "ts": "2026-07-14T00:00:00Z"
  }
  ```
- Response envelope: `{cid, ok: true, result}` or `{cid, ok: false, error: {code: "E_...", message, hint, retryable}}`.
- Streaming: WS frames carry the same envelope; add `seq` and `final` fields.
- Timeouts: default 5s; long-running methods must return a `job_id` and stream progress.
- Backpressure: renderer must not queue more than N (spec value) in-flight per method.
- Idempotency: writes require a client-generated `cid`; worker de-dupes by `cid` for 60s.
- Error taxonomy: reference `../12-error-taxonomy.md`; every error MUST carry an `E_*` code from `spec/03-error-manage/`.
- Auth: bearer token rotated per launch; token never logged; token stored only in renderer memory.
- Versioning: `X-Shell-IPC-Version` header; incompatible worker responds `E_SHELL_IPC_VERSION_MISMATCH`.
- Schema source of truth: JSON Schema under `spec/21-app/shell/schemas/ipc/*.json` (files to be created during implementation).
