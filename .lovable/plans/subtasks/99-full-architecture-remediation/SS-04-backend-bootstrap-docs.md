# SS-04 — Backend Bootstrapping & Docs Alignment

Parent: 99-full-architecture-remediation
Slug: SS-04-backend-bootstrap-docs
Status: completed
Created: 2026-08-17

## Goal

Create a `Makefile` at the repo root so that any developer or AI can run
`make setup-backend` and `make test-backend` without reading any README.
Also update all spec/README files that reference the now-deleted `BE/routes/`
or old flat route filenames.

## Steps

### SS-04-01: Inspect pyproject.toml
Read `BE/pyproject.toml`. Confirm whether `uv` is the declared package manager
or `pip`. Confirm the venv location (`.venv` inside `BE/`).

### SS-04-02: Write Makefile
Create `Makefile` at the repo root with targets:
```makefile
setup-backend:
	cd BE && uv sync

test-backend:
	cd BE && uv run pytest tests/ -v

lint-backend:
	cd BE && uv run ruff check .

dev-backend:
	cd BE && uv run python -m BE.main
```
Each target must succeed from a clean checkout with only Python 3.11+ installed.

### SS-04-03: Verify setup-backend
Run `make setup-backend` from the repo root. Confirm `BE/.venv/` is populated
and `pydantic-settings` is installed. Capture exit code 0.

### SS-04-04: Verify test-backend
Run `make test-backend`. Confirm pytest collects tests with zero
`ModuleNotFoundError`. All existing tests must pass or be documented as
failing for pre-existing reasons unrelated to this plan.

### SS-04-05: Update BE/README.md
Replace any references to `BE/routes/` with the correct `BE/routes/` path.
Add a "Getting Started" section pointing to `make setup-backend` and
`make test-backend`.

### SS-04-06: Update spec files
Run `grep -r "BE/routes" spec/` and `.lovable/`. For each hit, update the
reference to `BE/routes/` or remove it if the sentence is now obsolete.

### SS-04-07: Update memory/index.md
If `memory/index.md` references `BE/routes/`, correct it to `BE/routes/`.

### SS-04-08: Update overview.md
If `.lovable/overview.md` has an architecture diagram referencing `BE/routes/`,
update the diagram to reflect `BE/routes/` only.

### SS-04-09: Final typecheck + pytest
Run `npx tsc --noEmit` (must exit 0). Run `make test-backend` (must exit 0
or document known pre-existing failures). Confirm no regressions.

## Acceptance Criteria

- `make setup-backend` exits 0 from a clean checkout.
- `make test-backend` exits 0 or documents pre-existing failures only.
- `grep -r "BE/routes" spec/ .lovable/` returns zero results.
- `BE/README.md` does not mention `BE/routes/`.
