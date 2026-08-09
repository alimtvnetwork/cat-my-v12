# Command 19, UI error dialog gated by build mode

Scope: whole app (frontend + spec).
When it applies: every unhandled error surface (runtime, IPC, network).

## Verbatim (paraphrased from voice input)

> "Build the error dialog on the UI, and that would be enabled and
> disabled based on the debug mode or dev mode. By default dev mode is
> true. It would only be false when we publish the app. During
> publishing you should have the option to how you want to deploy the
> app: dev mode, production mode, or test mode."

## Requirements

- Introduce three build modes: `Dev`, `Test`, `Prod` (PascalCase).
- Default mode when not published = `Dev`. The dev server always runs in `Dev`.
- At publish time, the operator selects `Dev`, `Test`, or `Prod`; the
  choice is compiled into `import.meta.env.VITE_APP_MODE`.
- A single `ErrorDialogProvider` sits under `__root.tsx` and renders a
  modal (with copyable stack, error code, correlation id) whenever an
  uncaught error or explicit `reportError()` fires.
- The dialog is visible only when the effective mode is `Dev` or `Test`.
  In `Prod` it is silent (log only, generic toast).
- Behaviour is driven by `AppMode` from `src/lib/app-mode.ts`, not
  scattered string checks.

## Non-goals

- No new telemetry pipeline in this command.
- No change to Python worker error surfaces.
