# run.ps1 - standalone local launcher (backend + frontend)

Goal: one PowerShell entry point at the repo root that can start the Python backend (BE, FastAPI/uvicorn on 8787), the frontend (Vite on 8080), or both wired together, open a browser, and log everything with clear errors.

Okay, so by default, running the PowerShell should run the, uh, front end by default and opening it to the port. That is the main idea. Make sure, uh, to run it locally. Everything is configured and planned in here. If anything missing, please don't miss it. Please make sure that, uh, everything is properly done. And there is no need to have Docker. We're not going to use Docker. Remember that it's going to run locally. That is the main plan. So if anywhere it says Docker, forget about it. Okay? Um, yeah, run SH. We can keep the out of scope. That is absolutely fine

## What gets created

1. `sample-powershell/` at repo root

- `run.ps1` and `powershell.json` you uploaded, stored verbatim as reference material (never executed, never imported).
- `README.md` explaining these are training samples only.

2. `run.ps1` at repo root - the real launcher (standalone, single file, no dot-sourced modules so it works after a fresh clone).
3. `run.config.json` at repo root - launcher config, sample-inspired shape:
   projectName, feDir, beDir, fePort (8080), bePort (8787), pythonVenv (.venv), openBrowser, defaultMode, logDir (`.logs/launcher`), healthPath (`/healthz`), prerequisites (node/bun, python).
4. `docs/launcher/README.md` - short human page: modes, flags, troubleshooting table. Root `README.md` gets a "Run locally" section linking to it.

## Modes (flags)

- `-Help` / `-h` - full feature help, grouped sections, examples (mirrors the sample's help style).
- `-Seed` - frontend only, forces Seed data mode (no backend needed).
- `-Backend` / `-BeOnly` - backend only (uvicorn), prints health URL.
- default / `-Full` - backend + frontend, frontend pre-set to Backend mode pointing at the backend URL.
- `-Build` - production frontend build then serve preview.
- `-Install` - install deps (bun install, python venv + `pip install -e BE[dev]`).
- `-Clean` - remove `.vite`, `dist`, `__pycache__`, launcher logs.
- `-Test` - run vitest + pytest and exit.
- `-NoBrowser`, `-FePort N`, `-BePort N`, `-Verbose`, `-Doctor` (prereq + port check report only).

## Frontend/backend wiring

The launcher opens `http://localhost:<fePort>/?ds=backend&backend=http://localhost:<bePort>` (or `?ds=seed`).
Small frontend addition: a bootstrap in the root route that reads `ds` and `backend` query params once and writes them into the existing data-source store (`ca.data-source`, `ca.data-source.baseUrl`), then strips the params. This is the only app-code change; everything else is script + docs.

## Error handling and logging

- Self-lint parse check of the script before running (as in the sample).
- `$ErrorActionPreference = "Stop"`, every external call wrapped, non-zero exit codes surfaced with a numbered reason.
- Prereq gate: node/bun, python >= 3.11, venv present, ports free (with the PID holding a busy port named in the error).
- Per-run log folder `.logs/launcher/<timestamp>/` with `backend.log`, `frontend.log`, `launcher.log` (JSONL events: start, health-probe, ready, exit).
- Health gate: poll `GET /healthz` up to 30s before starting the frontend; on failure print the last 30 backend log lines instead of a bare timeout.
- Ctrl+C / exit trap kills both child processes; stale processes on the target ports are reported and optionally killed with `-Force`.

## Verification

- PowerShell parser check on `run.ps1` (`[Parser]::ParseFile`) in the sandbox via pwsh.
- `-Help` and `-Doctor` run cleanly.
- Typecheck + vitest for the query-param bootstrap.
- `.gitignore` gets `.logs/`.

## Notes

- `run.sh` (POSIX twin) is out of scope for this pass unless you want it; say the word and I add it.
- The uploaded sample's site/credential blocks are WordPress-specific and are not carried into our config; only the structure (config-driven paths, ports, prerequisites, clean paths, help layout) is reused.
