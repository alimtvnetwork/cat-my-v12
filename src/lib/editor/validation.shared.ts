/**
 * Shared helpers/schemas/types/constants for validation.functions.ts.
 *
 * Extracted out of `.functions.ts` per the TanStack server-fn splitting
 * contract: the code-splitter emits a separate module per handler
 * (`?tss-serverfn-split`), and any sibling declaration referenced from a
 * handler becomes a `ReferenceError` at runtime. Every symbol here is
 * imported into `validation.functions.ts` (never a sibling declaration),
 * which is the shape the splitter tolerates.
 */
import { z } from "zod";

const RuleInputSchema = z.object({
  id: z.string(),
  kind: z.enum(["C", "R", "K", "S", "E"]),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  params: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const InputSchema = z.object({
  imageDataUrl: z.string().min(1),
  imageName: z.string(),
  imageWidth: z.number().int().positive(),
  imageHeight: z.number().int().positive(),
  rules: z.array(RuleInputSchema).min(1),
});

export enum StatusType {
  Pass = "pass",
  Fail = "fail",
  Warn = "warn",
  Pending = "pending",
}
const StatusSchema = z.nativeEnum(StatusType);
const DebugValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const ResultSchema = z.object({
  status: StatusSchema,
  score: z.number().optional(),
  message: z.string().optional(),
  debug: z.record(DebugValueSchema).optional(),
});

export const ResponseSchema = z.object({
  results: z.record(ResultSchema),
  worker: z.object({ version: z.string(), engine: z.string() }).optional(),
});

export const HealthSchema = z.object({
  ok: z.boolean(),
  engine: z.string().optional(),
  version: z.string().optional(),
});

/**
 * Pure helper that validates VALIDATION_WORKER_URL. Kept exported so unit
 * tests can exercise it without spinning up a server function. Returns
 * `{ ok: true, isFail: false, endpoint }` on success or `{ ok: false, isFail: true, reason }` on a
 * config error. Never throws.
 */
export function parseWorkerHealthzEndpoint(
  url: string | undefined,
): { ok: true; isFail: false; endpoint: string } | { ok: false; isFail: true; reason: string } {
  if (!url) return { ok: false, isFail: true, reason: "VALIDATION_WORKER_URL not set" };
  const trimmed = url.trim();

  if (trimmed === "") return { ok: false, isFail: true, reason: "VALIDATION_WORKER_URL is empty" };
  let base: URL;
  try {
    base = new URL(trimmed);
  } catch {
    return {
      ok: false, isFail: true,
      reason: `VALIDATION_WORKER_URL is not a valid URL: ${JSON.stringify(trimmed)}`,
    };
  }

  if (base.protocol !== "http:" && base.protocol !== "https:") {
    return {
      ok: false, isFail: true,
      reason: `VALIDATION_WORKER_URL protocol must be http or https, got ${base.protocol}`,
    };
  }

  return { ok: true, isFail: false, endpoint: `${base.toString().replace(/\/$/, "")}/healthz` };
}

export enum ScoreErrorCodeType {
  WORKER_NOT_CONFIGURED = "WORKER_NOT_CONFIGURED",
  WORKER_UNREACHABLE = "WORKER_UNREACHABLE",
  WORKER_TIMEOUT = "WORKER_TIMEOUT",
  WORKER_HTTP_4XX = "WORKER_HTTP_4XX",
  WORKER_HTTP_5XX = "WORKER_HTTP_5XX",
  WORKER_HTTP_429 = "WORKER_HTTP_429",
  WORKER_NON_JSON = "WORKER_NON_JSON",
  WORKER_SCHEMA_MISMATCH = "WORKER_SCHEMA_MISMATCH",
  WORKER_ABORTED = "WORKER_ABORTED",
}
export type ScoreErrorCode = ScoreErrorCodeType;

export interface ScoreError {
  code: ScoreErrorCode;
  message: string;
  status?: number;
  snippet?: string;
  attempts: number;
  elapsedMs: number;
}

export type ScoreResult =
  | { ok: true; isFail: false; data: z.infer<typeof ResponseSchema>; attempts: number; elapsedMs: number }
  | { ok: false; isFail: true; error: ScoreError };

export const MAX_ATTEMPTS = 3;
export const BASE_BACKOFF_MS = 400;
export const REQUEST_TIMEOUT_MS = 20_000;

export function classifyStatus(
  status: number,
):
  | ScoreErrorCodeType.WORKER_HTTP_4XX
  | ScoreErrorCodeType.WORKER_HTTP_5XX
  | ScoreErrorCodeType.WORKER_HTTP_429 {
  if (status === 429) return ScoreErrorCodeType.WORKER_HTTP_429;

  if (status >= 500) return ScoreErrorCodeType.WORKER_HTTP_5XX;

  return ScoreErrorCodeType.WORKER_HTTP_4XX;
}

export function shouldRetry(code: ScoreErrorCode): boolean {
  return (
    code === ScoreErrorCodeType.WORKER_UNREACHABLE ||
    code === ScoreErrorCodeType.WORKER_TIMEOUT ||
    code === ScoreErrorCodeType.WORKER_HTTP_5XX ||
    code === ScoreErrorCodeType.WORKER_HTTP_429
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}