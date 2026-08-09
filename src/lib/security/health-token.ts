/**
 * Timing-safe token compare + brute-force counter for health endpoints.
 * Mirrors `app/core/security/tokens.py` (F-46, F-47, F-49).
 *
 * - `verifyToken` compares UTF-8 byte arrays with a XOR fold; length
 *   mismatches still walk `max(len)` iterations and always return false,
 *   so both position-of-first-diff and length side channels are closed.
 * - `recordDenial` maintains a fixed-window per-process counter and returns
 *   `true` when the caller has crossed the brute-force threshold.
 */

export const BRUTE_FORCE_WINDOW_MS = 60_000;
export const BRUTE_FORCE_THRESHOLD = 10;

export function verifyToken(expected: string, provided: string): boolean {
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(provided);
  const len = Math.max(a.length, b.length, 1);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }

  return diff === 0;
}

interface DenialBucket {
  count: number;
  windowStart: number;
}

const denialBuckets = new Map<string, DenialBucket>();

export function recordDenial(sourceKey: string, now: number = Date.now()): boolean {
  const bucket = denialBuckets.get(sourceKey);
  const fresh = !bucket || now - bucket.windowStart > BRUTE_FORCE_WINDOW_MS;
  const next: DenialBucket = fresh
    ? { count: 1, windowStart: now }
    : { count: bucket.count + 1, windowStart: bucket.windowStart };
  denialBuckets.set(sourceKey, next);

  return next.count > BRUTE_FORCE_THRESHOLD;
}

export function resetDenialCountersForTests(): void {
  denialBuckets.clear();
}
