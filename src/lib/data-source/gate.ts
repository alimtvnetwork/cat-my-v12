import { ClientLogger } from "@/lib/observability/client-logger";
// runBackendWrite: gate mutating backend calls behind the data-source
// runtime store. In "seed" mode we return a caller-supplied simulated
// result so demos stay hermetic; in "backend" mode we invoke the real
// operation. Callers pass a `label` used for logging + toast messaging.

import { getDataSource } from "./store";

export interface RunBackendWriteOptions<T> {
  /** Value returned when data-source is "seed". */
  seedResult: T;
  /** Human label used in logs / info toast (e.g. "save rule"). */
  label: string;
  /** Optional info-toast reporter. Defaults to console.info only. */
  onSeedSkip?: (label: string) => void;
}

export async function runBackendWrite<T>(
  op: () => Promise<T>,
  opts: RunBackendWriteOptions<T>,
): Promise<T> {
  const source = getDataSource();

  if (source === "seed") {
    ClientLogger.info("[data-source] skipping write in seed mode", { label: opts.label });
    opts.onSeedSkip?.(opts.label);

    return opts.seedResult;
  }

  return op();
}
