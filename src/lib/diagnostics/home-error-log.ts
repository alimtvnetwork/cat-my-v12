// Records the latest home error boundary failure so /diagnostics can inspect it.
// Persisted to localStorage (best-effort) so a full-page reload still shows the last error.

import { AppError, isAppError } from "@/lib/errors/AppError";
import { ErrorCodeType } from "@/types/errors/ErrorCode";

const STORAGE_KEY = "diag.homeError.v1";

export interface HomeErrorRecord {
  at: string; // ISO timestamp
  message: string;
  stack: string | null;
  failedPlanIds: string[];
  code?: ErrorCodeType;
}

let inMemory: HomeErrorRecord | null = null;

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;

    return window.localStorage;
  } catch {
    return null;
  }
}

export function recordHomeError(
  error: Error | AppError,
  failedPlanIds: string[] = [],
): HomeErrorRecord {
  const rec: HomeErrorRecord = {
    at: new Date().toISOString(),
    message: error?.message || String(error) || "Unknown error",
    stack: error?.stack ?? null,
    failedPlanIds: [...failedPlanIds],
    code: isAppError(error) ? error.code : ErrorCodeType.HomeLoad,
  };
  inMemory = rec;
  const s = safeStorage();

  if (s) {
    try {
      s.setItem(STORAGE_KEY, JSON.stringify(rec));
    } catch {
      /* ignore quota */
    }
  }

  return rec;
}

export function getHomeError(): HomeErrorRecord | null {
  if (inMemory) return inMemory;
  const s = safeStorage();

  if (!s) return null;
  try {
    const raw = s.getItem(STORAGE_KEY);

    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeErrorRecord;

    if (parsed && typeof parsed.message === "string") {
      inMemory = parsed;

      return parsed;
    }
  } catch {
    /* ignore */
  }

  return null;
}

export function clearHomeError(): void {
  inMemory = null;
  const s = safeStorage();

  if (s) {
    try {
      s.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
