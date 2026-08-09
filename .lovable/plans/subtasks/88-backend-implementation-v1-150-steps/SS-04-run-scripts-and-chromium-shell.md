---
Slug: run-scripts-and-chromium-shell
Status: pending
Created: 2026-07-21
Parent: 88-backend-implementation-v1-150-steps
---

# SS-04: run.ps1 / run.sh + Chromium extension shell

Deliverables:

- `run.sh` (POSIX) and `run.ps1` (Windows) at repo root:
  1. Parse flags: `--be-port 8787`, `--fe-port 5173`, `--no-shell`.
  2. Start backend: `uv run --project BE uvicorn BE.main:app --port $BE_PORT` (or `python -m uvicorn`).
  3. Poll `GET http://localhost:$BE_PORT/health` up to 30s.
  4. Start frontend: `bun run dev -- --port $FE_PORT`.
  5. Wait for frontend port.
  6. Package + launch Chromium shell pointing at `http://localhost:$FE_PORT` with query `?backend=http://localhost:$BE_PORT`.
  7. On Ctrl+C: kill both.
- `chromium-shell/` extension (MV3):
  - `manifest.json` (browser_action opens a window sized 1440x900 to the frontend URL).
  - `background.js` reads `backend` query param and stores it in `chrome.storage.local` under `app.backend.baseUrl`.
  - `popup.html` shows current backend URL + Save.
  - Packaged via `nix run nixpkgs#zip -- -r public/app-shell.zip .`.

Rules: scripts must be idempotent; safe to re-run; no orphan processes (trap EXIT).
