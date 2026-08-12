# 1. Backend Mode and Facade

Date: 2026-08-12
Status: Accepted

## Context

The application frontend (built with TanStack Start) originally ran entirely using in-memory mock data ("Seed" mode) to facilitate rapid prototyping, offline usage, and demos. As the project matures, we need to introduce a real Python backend (`BE/`) to interact with actual hardware (e.g., cameras). However, we want to retain the Seed mode to ensure the UI can still be developed and tested without requiring physical hardware or a running backend.

Furthermore, integrating third-party hardware SDKs poses a risk of vendor lock-in and domain pollution if the SDK types and methods leak into the core application logic.

## Decision

1. **Backend Mode Toggle**: We will introduce a persistent UI toggle (`app.backend.mode`) allowing users to switch between `SEED` and `BACKEND` modes.
2. **Unified Client Interface**: The frontend will use a typed HTTP client for `BACKEND` mode and an in-memory client for `SEED` mode. Both clients will implement the exact same interface (`BackendClient`), ensuring UI components do not need to branch logic based on the active mode.
3. **SDK Facade Pattern**: We mandate a strict facade layer for hardware integration. Raw SDK files will reside in the root `sdk/` directory. The backend will interact with the SDK exclusively through `BE/app/facades/`, exposing domain models in `BE/app/domain/`. The frontend will similarly restrict any browser-side SDK interactions to `src/lib/facades/`. Linting rules will enforce this boundary.
4. **Unified Launcher**: Development will be orchestrated via unified launcher scripts (`run.sh` and `run.ps1`) that start both the backend and frontend simultaneously, with explicit host binding and a Chromium shell for desktop-like execution.

## Consequences

- **Pros**: 
  - Zero downtime for UI developers who do not have access to hardware.
  - Clean architecture with a hard boundary against vendor SDKs, simplifying future hardware migrations.
  - Consistent component logic regardless of the data source.
- **Cons**: 
  - Increased maintenance overhead to keep the Seed mode in sync with the real Backend implementation.
  - Requires writing wrapper classes (Facades) for every hardware SDK feature we wish to use.
