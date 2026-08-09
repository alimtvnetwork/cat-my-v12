# Self-update binding (to spec/14-update)

Status: Draft (Plan 28)
Companion: `./diagrams/05-update-flow.mmd`
Governing spec: `spec/14-update/*`

## Feed

- URL: `https://updates.<project-domain>/app/{channel}/{platform}/{arch}/manifest.json`.
- Channels: `stable`, `beta`, `dev`. User-selectable in `settings.updates`.
- Manifest schema: per `spec/14-update/` (version, url, sha256, signature, notes).

## Signature

- Ed25519 keypair; public key pinned in shell binary at build time; private
  key held in CI signing enclave.
- Manifest and artifact both signed. Verification order: manifest signature
  → artifact hash → artifact signature. Failure at any step → `E_SHELL_UPDATE_UNSIGNED`.

## Download / verify / apply

1. Shell polls feed every 6 h (jittered) and on user request.
2. On new version: download to `<data-dir>/updates/<version>/`.
3. Verify hash and signature.
4. Run pre-migration hook: worker exports schema version.
5. Stop worker (graceful, 5 s budget).
6. Replace binaries atomically (staged rename).
7. Run migrations under `app/core/io/migrations/` in order.
8. Restart shell → new worker binds → `/healthz` → `I_SHELL_UPGRADED` emitted
   with `prior_version` and `next_version`.

## Rollback

- If migrations fail or `/healthz` fails within 60 s after restart, shell
  reverts binaries to the previous staged copy and marks the update as
  `E_SHELL_UPDATE_FAILED` with `remediation: "auto-rolled-back"`.
- Two consecutive failed updates pin the channel until the user acknowledges.

## Migration hook order

Aligns with `spec/14-update/`:

1. Backup SQLite (`<data-dir>/backups/<ts>.sqlite`).
2. Run migrations sequentially by filename.
3. Verify head via `app/core/io/migrate.py`.
4. Delete backup older than N days (per retention policy).

## Offline behavior

- If no network at check time: skip silently, log `I_SHELL_UPDATE_SKIPPED_OFFLINE`.
- If download interrupted: resume with HTTP Range; failed hash after resume
  restarts from zero.

## Non-goals

- Delta updates (patch files) — deferred to v2 of the updater; documented in
  `24-open-questions.md`.
