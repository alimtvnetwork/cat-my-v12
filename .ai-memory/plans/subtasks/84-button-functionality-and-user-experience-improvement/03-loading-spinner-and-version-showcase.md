# Subtask 03: Pre-Hydration Loading Screen and Dynamic Version Display

- **Slug**: `button-functionality-and-user-experience-improvement - Task 03`
- **Owner**: Frontend Core Specialist
- **Status**: ACTIVE

## Objectives
1. Inject zero-latency inline HTML/CSS splash overlay into `RootShell` in `src/routes/__root.tsx`.
2. Display Cat Vision vector logo, dual-ring industrial spinner, application version (`v4.113.15`), and status indicator.
3. Implement `useSplashDismissal` hook to trigger smooth fade-out and unmount upon React hydration.
4. Ensure zero hydration mismatch warnings and zero layout shifts.

## Target Files
- `src/routes/__root.tsx`
- `02-spec/21-app/84-button-functionality-and-user-experience-improvement/03-loading-spinner-and-version-showcase-spec.md`
