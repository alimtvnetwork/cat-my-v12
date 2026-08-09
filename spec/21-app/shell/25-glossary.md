# 25 - Glossary

Terms used across `spec/21-app/shell/*`. Definitions are authoritative for this spec; when a term also appears in `spec/14-update/*` or `spec/21-app/*`, the definition here matches those.

- **Shell**: the Tauri-hosted native process that owns the OS window, tray, autostart, and the `app://` renderer origin.
- **Renderer**: the Chromium web view inside the shell. Loads the Vite-built SPA over `app://`. Isolated context, no Node integration.
- **Worker**: the Python inspection backend, spawned as a child process by the shell. Communicates only over loopback WebSocket with a bearer token.
- **Preload**: the small JS bridge exposed via `contextBridge` from shell to renderer. Only whitelisted IPC methods.
- **IPC envelope**: the JSON message shape defined in `04-ipc-contract.md`. All renderer → worker and worker → renderer traffic uses it.
- **Feature flag**: a runtime toggle resolved by license, config, or remote kill-switch (`13-feature-flags.md`).
- **Kill-switch**: a signed remote flag that disables a feature or the whole app on next boot.
- **Update feed**: the signed manifest at `08-updates-binding.md` that lists channel, version, artifact URLs, and Ed25519 signatures.
- **Rollback**: reverting to the previous installed version + data snapshot per `15-data-migration.md` backup policy.
- **Migration**: a forward-only, filename-sorted, transactional data step under `app/core/io/migrations/`.
- **Permission class**: one of camera, filesystem, network, notifications, autostart (`07-permissions-and-consent.md`).
- **Log record**: the structured shape in `app/core/telemetry/log_record.py`.
- **SBOM**: CycloneDX 1.5 JSON produced during packaging (`21-supply-chain.md`).
- **Cosign attestation**: Sigstore signature over the SBOM + artifact digest.
- **Blind-AI reader**: a future agent with no prior context. The implementation checklist (`23-implementation-checklist.md`) is written for this reader.
