# SS-04: Visual Regression Gate

## Objective
Start the local Vite server, reproduce the visual failures, determine if they are intended UI changes or regressions, fix genuine regressions, and update baselines only if the resulting UI is intentional. Do not assume current screenshots should become new baselines.

## Files/Area Involved
- `src/components/app-shell/` and related UI files
- `tests/visual/`
- `tests/visual/baselines/`

## Verification Command
```bash
# Terminal 1
npm run dev

# Terminal 2
npx playwright test tests/visual/routes.spec.ts tests/visual/header-spacing.spec.ts
```

## Completion Condition
The Playwright visual regression suite passes. Genuine regressions (e.g., density or spacing overlaps) are fixed in CSS/TSX. Baselines are regenerated via `npm run visual:update` only for confirmed, intentional UI evolution.

## Recovery/Checkpoint Instructions
- **Review Step:** Examine the diff output of Playwright failures in `tests/reports/screenshots/`.
- **Commit Boundary:** Commit fixes as `fix(visual): resolve visual regression gate` and ensure the Vite server is stopped.
