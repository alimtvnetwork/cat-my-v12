// Plan 43 slice-1 step 1: publish-time AppMode flag.
//
// Reads `import.meta.env.VITE_APP_MODE` (build-time replaced by Vite). Any
// unrecognized value falls back to `Dev` and logs a `console.warn` so the
// misconfiguration surfaces instead of silently defaulting.

export const AppMode = {
  Dev: "Dev",
  Test: "Test",
  Prod: "Prod",
} as const;

export type AppModeValue = (typeof AppMode)[keyof typeof AppMode];

const ALL_MODES = new Set<string>(Object.values(AppMode));

export function getAppMode(): AppModeValue {
  const raw = (import.meta.env?.VITE_APP_MODE ?? "").toString().trim();

  if (raw.length === 0) return AppMode.Dev;

  if (ALL_MODES.has(raw)) return raw as AppModeValue;
  // Surface, do not swallow.
  console.warn(
    `[app-mode] unknown VITE_APP_MODE="${raw}", falling back to Dev. Allowed: ${Object.values(AppMode).join(", ")}`,
  );

  return AppMode.Dev;
}

// The ErrorDialogProvider shows the full modal only in Dev + Test. Prod uses
// a generic toast fallback to avoid leaking stack traces to end users.
export function isDialogVisibleMode(mode: AppModeValue): boolean {
  return mode === AppMode.Dev || mode === AppMode.Test;
}
