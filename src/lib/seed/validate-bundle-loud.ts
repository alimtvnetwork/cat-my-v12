// Loud, boot-time validator for `bundle.v2.json`.
//
// `parseSeedBundleV2` already enforces Zod shape, integrity (duplicate ids,
// frozen profile presence, unknown slice keys), and cross-slice referential
// integrity. This module wraps it in a boot-time entry point that:
//
//   1. Runs on module import so a malformed bundle surfaces before any
//      facade read or seed run,
//   2. Emits a grouped, human-readable `console.error` report with one line
//      per issue (kind, path, expected, got, message),
//   3. Rethrows the original `SeedBundleValidationError` so the app fails
//      loudly instead of silently rendering an empty UI,
//   4. Reports through `useErrorStore` when available so the Global Error
//      Modal + History Drawer pick it up (Tier 1/2 per error-manage spec).
//
// Kept free of React so it can be called from any module boundary.

import {
  parseSeedBundleV2,
  SeedBundleValidationError,
  type SeedBundleV2,
  type SeedIssue,
} from "./schemas-v2";

export interface LoudValidateOptions {
  /** Label used in the console group + error store source. */
  source?: string;
  /** Inject a logger (tests). Defaults to `console`. */
  logger?: Pick<Console, "error" | "group" | "groupEnd" | "info">;
  /**
   * Optional hook so callers can forward the error into `useErrorStore`
   * without this module depending on the store (keeps it tree-shake-safe
   * for tests / server contexts).
   */
  onError?: (err: SeedBundleValidationError) => void;
}

function logIssues(
  logger: NonNullable<LoudValidateOptions["logger"]>,
  source: string,
  issues: SeedIssue[],
): void {
  logger.group(`[seed-bundle-v2] ${source}: ${issues.length} validation issue(s)`);
  for (const iss of issues) {
    const parts: string[] = [`[${iss.kind}]`, iss.path, "-", iss.message];

    if (iss.expected) parts.push(`(expected: ${iss.expected})`);

    if (iss.got !== undefined) parts.push(`(got: ${JSON.stringify(iss.got)})`);
    logger.error(parts.join(" "));
  }

  logger.groupEnd();
}

/**
 * Validate a bundle and log any issues loudly. On success, logs a single
 * info line and returns the parsed bundle. On failure, logs a grouped
 * error report and rethrows `SeedBundleValidationError`.
 */
export function validateBundleLoud(raw: unknown, options: LoudValidateOptions = {}): SeedBundleV2 {
  const logger = options.logger ?? console;
  const source = options.source ?? "bundle.v2.json";
  try {
    const parsed = parseSeedBundleV2(raw);
    logger.info?.(`[seed-bundle-v2] ${source}: OK`);

    return parsed;
  } catch (err) {
    if (err instanceof SeedBundleValidationError) {
      logIssues(logger, source, err.issues);
      options.onError?.(err);
    } else {
      logger.error(`[seed-bundle-v2] ${source}: unexpected error`, err);
    }

    throw err;
  }
}
