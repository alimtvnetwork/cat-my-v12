/**
 * Server function: `getCliSession`.
 *
 * Plan 90 Step 76. Server-side proxy over the disk-backed BE endpoint
 * `GET /api/cli/sessions/{run_id}` (Step 73). Complements the SSE tail
 * (Step 72) by giving the drill-down UI a static first-paint payload
 * (Summary + bounded backlog Records) without opening an EventSource.
 *
 * Envelope contract: BE emits `{ Status, Results: [payload], Errors? }`
 * per `BE/envelope.py`. Payload lives at `Results[0]` and matches
 * `{ Summary, Records, TailLines, Requested, DroppedInvalid }`. Any
 * envelope-shape drift throws loudly instead of silently returning
 * empty, so stale UI deep-links do not render a phantom empty page.
 */
import { beFetch } from "@/lib/be-fetch";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  runId: z.string().min(1),
  tail: z.number().int().min(1).max(1000).optional(),
});

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
  Summary: SessionSummarySchema,
  Records: z.array(z.record(z.string(), z.any())),
  TailLines: z.number().int(),
  Requested: z.number().int(),
  DroppedInvalid: z.number().int(),
});

export type CliSessionDetail = z.infer<typeof PayloadSchema>;
export type CliSessionSummary = z.infer<typeof SessionSummarySchema>;

function beBaseUrl(): string {
  const url = process.env.BE_URL ?? "http://127.0.0.1:8787";

  return url.replace(/\/$/, "");
}

export const getCliSession = createServerFn({ method: "GET" })
  .inputValidator((raw) => InputSchema.parse(raw))
  .handler(async ({ data }): Promise<CliSessionDetail> => {
    const qs = new URLSearchParams();

    if (data.tail !== undefined) qs.set("tail", String(data.tail));
    const url = `${beBaseUrl()}/api/cli/sessions/${encodeURIComponent(data.runId)}${
      qs.size ? `?${qs}` : ""
    }`;
    const env = await beFetch<CliSessionDetail>(url);
    const payload = env.Results[0];

    if (payload === undefined) {
      throw new Error(`BE_ENVELOPE_EMPTY: /api/cli/sessions/${data.runId} returned no Results`);
    }

    return PayloadSchema.parse(payload);
  });
