import { ClientLogger } from "@/lib/observability/client-logger";
import { CaptureError, type CaptureErrorCode, newCorrelationId } from "./capture.shared";

/**
 * SDK Facade retry helper (spec/21-app/52-sdk-facade-pattern.md).
 *
 * Vendor SDK calls (enumerate / open / grab) occasionally fail with
 * transient conditions (bus contention, GigE ARP, USB re-enum). We retry
 * those with exponential backoff + jitter. Permanent failures (bad input,
 * missing device, SDK absent, unauthorized) short-circuit immediately and
 * surface the correct locked E_* code.
 */

// Codes that are known-permanent. Never retry.
const PERMANENT_CODES: ReadonlySet<CaptureErrorCode> = new Set<CaptureErrorCode>([
  "E_SEC_UNAUTH",
  "E_SEC_DENIED",
  "E_LIC_FEATURE_DENIED",
  "E_CFG_BAD_INPUT",
  "E_CFG_UNSUPPORTED_VENDOR",
  "E_CFG_UNKNOWN_DEVICE",
  "E_CAP_SDK_ABSENT",
]);

// Codes that are known-transient. Retry.
const TRANSIENT_CODES: ReadonlySet<CaptureErrorCode> = new Set<CaptureErrorCode>([
  "E_CAP_ENUM_FAILED",
  "E_SEC_AUDIT_FAILED",
  "E_INTERNAL",
]);

export type RetryOptions = {
  maxAttempts?: number; // total tries incl. first
  baseMs?: number; // initial backoff
  capMs?: number; // max backoff per attempt
  jitter?: boolean;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (info: {
    attempt: number;
    delayMs: number;
    code: CaptureErrorCode;
    cid: string;
  }) => void;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function isPermanent(err: CaptureError): boolean {
  if (PERMANENT_CODES.has(err.code)) return true;

  if (TRANSIENT_CODES.has(err.code)) return false;

  return true; // unknown = fail closed, do not hammer the SDK
}

function computeDelay(attempt: number, baseMs: number, capMs: number, jitter: boolean): number {
  const raw = Math.min(capMs, baseMs * 2 ** (attempt - 1));

  return jitter ? Math.floor(raw / 2 + (Math.random() * raw) / 2) : raw;
}

/**
 * Run an SDK operation with retry+backoff on transient CaptureErrors.
 * The correlation id is threaded through every attempt so logs and the
 * final error carry the same cid.
 */
export async function withSdkRetry<T>(
  subject: string,
  op: (ctx: { attempt: number; cid: string }) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 3);
  const baseMs = Math.max(1, opts.baseMs ?? 50);
  const capMs = Math.max(baseMs, opts.capMs ?? 800);
  const jitter = opts.jitter ?? true;
  const sleep = opts.sleep ?? defaultSleep;
  const cid = newCorrelationId();

  let lastErr: CaptureError | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await op({ attempt, cid });
    } catch (err) {
      const ce =
        err instanceof CaptureError
          ? new CaptureError(
              err.code,
              err.message.replace(/\s*\[cid=[^\]]+\]\s*$/, "").replace(/^[A-Z_]+:\s*/, ""),
              cid,
            )
          : new CaptureError("E_INTERNAL", err instanceof Error ? err.message : String(err), cid);
      lastErr = ce;

      if (isPermanent(ce) || attempt === maxAttempts) {
        ClientLogger.warn(
          `[sdk.facade] subject=${subject} cid=${cid} attempt=${attempt}/${maxAttempts} code=${ce.code} phase=fail-permanent`,
        );

        throw ce;
      }

      const delayMs = computeDelay(attempt, baseMs, capMs, jitter);
      ClientLogger.info(
        `[sdk.facade] subject=${subject} cid=${cid} attempt=${attempt}/${maxAttempts} code=${ce.code} phase=retry delay=${delayMs}ms`,
      );
      opts.onRetry?.({ attempt, delayMs, code: ce.code, cid });
      await sleep(delayMs);
    }
  }

  // Unreachable: loop either returns or throws.
  throw lastErr ?? new CaptureError("E_INTERNAL", "withSdkRetry exhausted", cid);
}

export const __test__ = { PERMANENT_CODES, TRANSIENT_CODES, computeDelay, isPermanent };
