# Task: Fix New CI/CD Failures

## Goals

1. **Fix Playwright E2E**: Restore `<h2 className="sr-only">Pick a workflow</h2>` in `src/routes/index.tsx` so `tests/e2e/padding_tokens_visual.py` stops timing out.
2. **Fix Pytest Integration**: Update `.github/workflows/ci.yml` and `.github/workflows/release.yml` to install `numpy` in the testing step.
3. **Fix tsgo typo**: Change `"typecheck": "bunx tsgo --noEmit"` to `"bunx tsc --noEmit"` in `package.json`.
4. **Fix UI Backend Map Linter**: Remove orphaned method references (`run.steps.list`, `settings.config.patch`) from `spec/` markdown files.

## Guidelines

- Follow standard formatting and error logging.
- Commit all changes cleanly.
