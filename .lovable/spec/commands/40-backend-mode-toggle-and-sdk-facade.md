# Command 40: Backend mode toggle + SDK facade + BE folder + run scripts

Scope: whole app (frontend + new backend). Applies from now on.

Verbatim (paraphrased from voice): "On the homepage there must be two sections. One is the seeding value to test the UI. The other is a real backend API. Switching between Seed mode and Backend mode lives on the homepage AND in Settings. In Backend mode, the user only enters the backend PREFIX (base URL); the rest (endpoints, routing) is cemented in code. The URL of the backend must be savable/changeable at any time. Default backend = localhost with a configurable port. Backend and frontend usually run on the same machine (desktop app). SDK: when SDK files are dropped, first save them under an `sdk/` folder at repo root. From the SDK, build a facade (design pattern) for BOTH frontend and backend BEFORE any direct SDK call. Backend code lives in a `BE/` folder at repo root. Create `run.ps1` and `run.sh` at repo root that deploy + run backend + frontend (frontend inside a Chromium extension shell) and wire them together. Follow `spec/03-error-manage`, `spec/02-coding-guidelines`, `spec/02-coding-guidelines/21-app`, `spec/14-update`, `spec/17-consolidated-guidelines` strictly. Every error must be handled. Produce Mermaid diagrams of full system flow before coding. Write the backend implementation request as `spec/21-app/backend-implementation-request-v1.md`. All uploaded images and files go into git."

Convention going forward:

- `BE/` at repo root = backend source.
- `sdk/` at repo root = raw SDK drops (never edited in place).
- `sdk-facade/` (or `BE/sdk-facade/` and `src/lib/sdk-facade/`) = the wrapping facade layers.
- `run.ps1` / `run.sh` at repo root = one-shot dev launcher.
- Homepage exposes `Mode: Seed | Backend` toggle; Settings mirrors it and stores backend base URL.
- Backend base URL persisted in `localStorage` under `app.backend.baseUrl`, default `http://localhost:8787`.
