---
Slug: mermaid-diagrams
Status: pending
Created: 2026-07-21
Parent: 88-backend-implementation-v1-150-steps
---

# SS-01: Mermaid diagrams for backend v1

Produce these `.mmd` files under `docs/diagrams/backend-v1/`:

1. `01-system-context.mmd` — user, Chromium shell, frontend, backend, sdk-facade, sdk, hardware.
2. `02-mode-toggle-flow.mmd` — Seed vs Backend selection, persistence, effect on typed client.
3. `03-request-envelope.mmd` — request -> handler -> facade -> sdk -> envelope response -> error store.
4. `04-error-flow.mmd` — throw -> apperror -> envelope -> frontend registry -> GlobalErrorModal.
5. `05-run-script-flow.mmd` — `run.ps1` / `run.sh` boot sequence: BE up, health probe, FE up, Chromium shell launch.
6. `06-sdk-facade-layers.mmd` — raw `sdk/` -> `BE/sdk-facade/` -> handlers; parallel `src/lib/sdk-facade/` for browser bits.

Rules: no emojis in mermaid; classDef colors must work in both themes; wrap each with `<lov-artifact url="/__l5e/documents/<name>.mmd" mime_type="text/vnd.mermaid"></lov-artifact>` when surfacing.
