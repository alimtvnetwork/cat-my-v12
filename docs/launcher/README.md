# run.ps1 - local launcher

One PowerShell file at the repo root starts the app locally. It is standalone:
no modules to import, no Docker. Configuration lives in `run.config.json`
beside it.

```powershell
.\run.ps1            # frontend only, seeded demo data, browser opens
.\run.ps1 -Full      # backend + frontend, wired together
.\run.ps1 -Help      # every flag, explained
```

On a fresh clone run `.\run.ps1 -Install -Full` once: it installs frontend
dependencies, creates `.venv`, installs the backend in editable mode, then
starts both.

## Modes

| Flag               | What it does                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| _(none)_ / `-Seed` | Vite dev server only. The UI boots in Seed mode with bundled demo data, so no backend is required.                        |
| `-Full`            | Starts the FastAPI backend, waits for `/healthz`, then starts the frontend and opens it already switched to Backend mode. |
| `-Backend`         | Backend only. Useful when you run the frontend from another terminal or from the hosted preview.                          |
| `-Build`           | Production frontend build, then serves the preview server.                                                                |
| `-Install`         | Frontend deps + Python venv + `pip install -e BE[dev]`. Combine with a run mode to continue straight into it.             |
| `-Clean`           | Removes the caches listed in `run.config.json` (`cleanPaths`) plus `__pycache__` folders.                                 |
| `-Test`            | Runs vitest and pytest, then exits.                                                                                       |
| `-Doctor`          | Prints prerequisites, resolved paths and port state. Changes nothing.                                                     |

Options: `-FePort <n>`, `-BePort <n>`, `-NoBrowser`, `-Force` (kill whatever
holds the ports), `-Verbose`.

## How the data mode reaches the UI

The launcher opens `http://localhost:<fePort>/?ds=seed` or
`?ds=backend&backend=http://localhost:<bePort>`.
`src/lib/data-source/url-bootstrap.ts` reads those params once on boot, writes
them into the data-source store, then strips them from the address bar. You can
still flip the mode any time from the homepage toggle or Settings; the launcher
only sets the starting position.

## Logs

Every run creates `.logs/launcher/<timestamp>/` containing:

- `launcher.log` - one JSON object per line (start, child_start, backend_ready, exit).
- `backend.log` / `backend.log.err` - uvicorn output.
- `frontend.log` / `frontend.log.err` - vite output.

When a child dies during startup the launcher prints the tail of the relevant
log before exiting, so the reason is on screen.

## Exit codes

| Code | Meaning                                      |
| ---- | -------------------------------------------- |
| 0    | Success                                      |
| 10   | The script itself failed its own parse check |
| 11   | `run.config.json` missing or invalid         |
| 12   | Missing prerequisite (bun/node/python/deps)  |
| 13   | Port already in use (retry with `-Force`)    |
| 14   | Backend never became healthy                 |
| 15   | A child process failed or exited             |
| 16   | Install step failed                          |
| 17   | Tests failed                                 |

## Configuration

`run.config.json` holds ports, directories, the venv path, health endpoint,
timeouts, log directory, and the exact shell commands used for install / dev /
build / preview / test. Change it rather than editing the script.

## `sample-powershell/`

Reference material from another project, kept for style comparison only. It is
never executed by this repo.
