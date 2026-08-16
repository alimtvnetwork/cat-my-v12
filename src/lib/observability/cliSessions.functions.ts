/**
 * Server function: `getCliSessions`.
 *
 * Plan 90 Step 75. Server-side proxy over the disk-backed BE endpoint
 * `GET /api/cli/sessions` (Step 71). Distinct from `getObservabilitySessions`
 * (Root-DB-backed): this reader answers "what JSONL files actually exist
 * under `APP_LOG_ROOT` right now" so operators see sessions even when the
 * Root-DB tier is lagging or unavailable.
 *
 * Envelope contract: BE emits `{ Status, Results: [payload], Errors? }`
 * per `BE/envelope.py`. Payload lives at `Results[0]` and matches
 * `{ items: SessionSummary[], total: number, limit: number }`. Any
 * envelope-shape drift throws loudly instead of silently returning empty.
 */
import { beFetch } from "@/lib/be-fetch";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SourceEnum = z.enum(["worker-cli", "processing-cli", "be"]);

const InputSchema = z
  .object({
    limit: z.number().int().min(1).max(500).optional(),
    source: SourceEnum.optional(),
  })
  .default({});

const SessionSummarySchema = z.object({
  Source: z.string(),
  Date: z.string(),
  StartedAt: z.string(),
  Pid: z.number().int(),
  Subcmd: z.string(),
  LogPath: z.string(),
  RunId: z.string().nullable(),
  SizeBytes: z.number().int(),
});

const PayloadSchema = z.object({
  items: z.array(SessionSummarySchema),
  total: z.number().int(),
  limit: z.number().int(),
});

export type CliSessionSummary = z.infer<typeof SessionSummarySchema>;
export type CliSessionsPage = z.infer<typeof PayloadSchema>;

function beBaseUrl(): string {
  const url = process.env.BE_URL ?? "http://127.0.0.1:8787";

  return url.replace(/\/$/, "");
}

export const getCliSessions = createServerFn({ method: "GET" })
  .inputValidator((raw) => InputSchema.parse(raw ?? {}))
  .handler(async ({ data }): Promise<CliSessionsPage> => {
    const qs = new URLSearchParams();

    if (data.limit !== undefined) qs.set("limit", String(data.limit));

    if (data.source) qs.set("source", data.source);
    const url = `${beBaseUrl()}/api/cli/sessions${qs.size ? `?${qs}` : ""}`;
    let env;
    try {
      env = await beFetch<CliSessionsPage>(url, {}, { suppressCapture: true });
    } catch (err) {
      const isEnvelope =
        err instanceof Error && (err.name === "EnvelopeError" || "responseStatus" in err);
      const envErr = err as any;

      if (
        isEnvelope &&
        (envErr.responseStatus === 404 ||
          envErr.responseStatus === 403 ||
          envErr.code === "E_BE_UNAVAILABLE" ||
          envErr.code === "E_BE_BAD_RESPONSE")
      ) {
        return {
          items: [],
          total: 0,
          limit: data.limit ?? 50,
        };
      }

      throw err;
    }

    const payload = env.Results[0];

    if (payload === undefined) {
      throw new Error(`BE_ENVELOPE_EMPTY: /api/cli/sessions returned no Results`);
    }

    return PayloadSchema.parse(payload);
  });
