import { ScoreErrorCodeType } from "@/lib/editor/validation.shared";
/**
 * Real scoring server function.
 *
 * Root cause it addresses: `runStubValidation` produced a hash-of-ruleId
 * heuristic so the UI had chips to render. The user now wants scoring
 * driven by an external Python worker (Cloudflare Workers cannot host
 * Python), so this server fn is the boundary that forwards the payload
 * to the worker and returns the same ValidationResult map shape the
 * store already understands.
 *
 * Env contract (server-only, read inside .handler()):
 *   VALIDATION_WORKER_URL    Base URL of the Python worker, e.g.
 *                            https://validator.example.com
 *   VALIDATION_WORKER_TOKEN  Optional bearer token; sent as
 *                            Authorization: Bearer <token>
 *
 * When VALIDATION_WORKER_URL is unset the fn throws with a clear
 * message. No silent fallback: the caller must know it is not scoring.
 */
import { HttpMethod } from "@/lib/constants";
import { createServerFn } from "@tanstack/react-start";
import {
  InputSchema,
  ResponseSchema,
  HealthSchema,
  parseWorkerHealthzEndpoint,
  classifyStatus,
  shouldRetry,
  sleep,
  MAX_ATTEMPTS,
  BASE_BACKOFF_MS,
  REQUEST_TIMEOUT_MS,
  type ScoreErrorCode,
  type ScoreError,
  type ScoreResult,
} from "@/lib/editor/validation.shared";

// Re-export for existing importers (tests + UI).
export { ScoreErrorCodeType, parseWorkerHealthzEndpoint };
export type { ScoreErrorCode, ScoreError, ScoreResult };

export const checkWorkerHealth = createServerFn({ method: HttpMethod.Get }).handler(
  async (): Promise<{
    configured: boolean;
    ok: boolean;
    isFail?: boolean;
    engine?: string;
    version?: string;
    latencyMs?: number;
    reason?: string;
  }> => {
    // Plan 65 step 19: validate the configured URL up front so a bad env
    // value ("x", "localhost:8080" without scheme, whitespace) surfaces
    // as a clear config error instead of leaking `fetch`'s low-level
    // "Failed to parse URL from x/healthz" into the operator-facing
    // WorkerHealthBanner.
    const parsed = parseWorkerHealthzEndpoint(process.env.VALIDATION_WORKER_URL);

    if (parsed.ok === false) {
      console.warn("[validation.functions] worker URL invalid", { reason: parsed.reason });

      return { configured: false, ok: false, reason: parsed.reason };
    }

    const endpoint = parsed.endpoint;
    const started = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(endpoint, { method: HttpMethod.Get, signal: controller.signal });
      clearTimeout(timer);

      if (res.ok === false) {
        return {
          configured: true,
          ok: false,
          isFail: true,
          reason: `worker returned ${res.status}`,
          latencyMs: Date.now() - started,
        };
      }

      const parsed = HealthSchema.safeParse(await res.json().catch(() => ({})));

      if (parsed.success === false || parsed.data.ok === false) {
        return {
          configured: true,
          ok: false,
          isFail: true,
          reason: "healthz payload not ok",
          latencyMs: Date.now() - started,
        };
      }

      return {
        configured: true,
        ok: true,
        isFail: false,
        engine: parsed.data.engine,
        version: parsed.data.version,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[validation.functions] healthz failed", { endpoint, message });

      return {
        configured: true,
        ok: false,
        isFail: true,
        reason: message,
        latencyMs: Date.now() - started,
      };
    }
  },
);

export const scoreRulesRemote = createServerFn({ method: HttpMethod.Post })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<ScoreResult> => {
    const url = process.env.VALIDATION_WORKER_URL;
    const token = process.env.VALIDATION_WORKER_TOKEN;
    const startedAll = Date.now();

    if (!url) {
      return {
        ok: false,
        isFail: true,
        error: {
          code: ScoreErrorCodeType.WORKER_NOT_CONFIGURED,
          message:
            "VALIDATION_WORKER_URL is not set. Configure the Python worker URL or use the stub scorer.",
          attempts: 0,
          elapsedMs: 0,
        },
      };
    }

    const endpoint = `${url.replace(/\/$/, "")}/score`;
    let lastError: ScoreError | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const attemptStarted = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: HttpMethod.Post,
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        const aborted = err instanceof Error && err.name === "AbortError";
        const code: ScoreErrorCode = aborted
          ? ScoreErrorCodeType.WORKER_TIMEOUT
          : ScoreErrorCodeType.WORKER_UNREACHABLE;
        const message = err instanceof Error ? err.message : String(err);
        console.error("[validation.functions] worker fetch failed", {
          endpoint,
          attempt,
          code,
          error: message,
        });
        lastError = {
          code,
          message: aborted
            ? `Worker did not respond within ${REQUEST_TIMEOUT_MS} ms.`
            : `Worker unreachable at ${endpoint}: ${message}`,
          attempts: attempt,
          elapsedMs: Date.now() - startedAll,
        };

        if (shouldRetry(code) === false || attempt === MAX_ATTEMPTS) break;
        const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
        console.info("[validation.functions] retrying", { attempt, backoff });
        await sleep(backoff);
        continue;
      }

      clearTimeout(timer);

      if (res.ok === false) {
        const body = await res.text().catch(() => "");
        const code = classifyStatus(res.status);
        console.error("[validation.functions] worker non-2xx", {
          endpoint,
          attempt,
          status: res.status,
          code,
          body: body.slice(0, 500),
        });
        lastError = {
          code,
          status: res.status,
          message: `Worker returned HTTP ${res.status}.`,
          snippet: body.slice(0, 500),
          attempts: attempt,
          elapsedMs: Date.now() - startedAll,
        };

        if (shouldRetry(code) === false || attempt === MAX_ATTEMPTS) break;
        const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1);
        console.info("[validation.functions] retrying", { attempt, backoff, status: res.status });
        await sleep(backoff);
        continue;
      }

      let json: unknown;
      try {
        json = await res.json();
      } catch (err) {
        console.error("[validation.functions] worker returned non-JSON", err);
        lastError = {
          code: ScoreErrorCodeType.WORKER_NON_JSON,
          message: "Worker response was not valid JSON.",
          attempts: attempt,
          elapsedMs: Date.now() - startedAll,
          snippet: err instanceof Error ? err.message : String(err),
        };
        break;
      }

      const parsed = ResponseSchema.safeParse(json);

      if (parsed.success === false) {
        console.error("[validation.functions] worker payload schema mismatch", {
          issues: parsed.error.issues.slice(0, 10),
        });
        lastError = {
          code: ScoreErrorCodeType.WORKER_SCHEMA_MISMATCH,
          message: "Worker payload did not match the expected schema.",
          snippet: JSON.stringify(parsed.error.issues.slice(0, 5)),
          attempts: attempt,
          elapsedMs: Date.now() - startedAll,
        };
        break;
      }

      console.info("[validation.functions] worker ok", {
        rules: data.rules.length,
        results: Object.keys(parsed.data.results).length,
        ms: Date.now() - attemptStarted,
        attempts: attempt,
        engine: parsed.data.worker?.engine,
      });

      return {
        ok: true,
        isFail: false,
        data: parsed.data,
        attempts: attempt,
        elapsedMs: Date.now() - startedAll,
      };
    }

    return {
      ok: false,
      isFail: true,
      error:
        lastError ??
        ({
          code: ScoreErrorCodeType.WORKER_UNREACHABLE,
          message: "Worker call failed for an unknown reason.",
          attempts: MAX_ATTEMPTS,
          elapsedMs: Date.now() - startedAll,
        } as ScoreError),
    };
  });
