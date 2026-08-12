/**
 * Server function: `getObservabilitySessionLogs`.
 *
 * Plan 90 Step 76 (FE `LogTailViewer`). Thin server-side proxy over the
 * BE endpoint `GET /observability/sessions/{cli_invocation_id}/logs`
 * (Step 73). Kept on the server so `BE_URL` never ships to the browser
 * bundle and envelope unwrap + wire-code surfacing lives in one place.
 *
 * Contract mirrors Step 73:
 *  - `cliInvocationId`: positive int (path param).
 *  - `tail`: 1..2000, default 200. Ignored when `afterOffset` is set.
 *  - `afterOffset`: >=0 byte offset for incremental resume polls.
 *
 * Response shape (PascalCase, Universal Envelope unwrapped):
 *  { CliInvocationId, RunId, LogPath, NextOffset, IsTruncated, Items[] }
 *
 * Any `Errors[0]` on the envelope is re-thrown as `"<Code>: <Message>"`
 * so the UI banner shows the wire code (e.g. `E_BE_NOT_FOUND: session
 * has no LogPath`) instead of a generic HTTP status.
 */
import { beFetch } from "@/lib/be-fetch";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  cliInvocationId: z.number().int().positive(),
  tail: z.number().int().min(1).max(1000).optional(),
  afterOffset: z.number().int().nonnegative().optional(),
});

const LogLineSchema = z.object({
  Offset: z.number().int(),
  Line: z.string().optional(),
  _ParseError: z.string().optional(),
  _Raw: z.string().optional(),
  timestamp: z.string().optional(),
  Timestamp: z.string().optional(),
  level: z.string().optional(),
  Level: z.string().optional(),
  message: z.string().optional(),
  Message: z.string().optional(),
}).passthrough();

const DataSchema = z.object({
  CliInvocationId: z.number().int(),
  LogPath: z.string().optional(),
  LogPathExists: z.boolean().optional(),
  SizeBytes: z.number().int().optional(),
  LinesRead: z.number().int().optional(),
  NextOffset: z.number().int().optional(),
  IsTruncated: z.boolean().optional(),
  Lines: z.array(LogLineSchema).optional(),
  Items: z.array(LogLineSchema).optional(),
  RunId: z.string().optional(),
}).passthrough();

export type ObservabilityLogLine = z.infer<typeof LogLineSchema>;
export type LogTailItem = ObservabilityLogLine;
export type LogTailPage = z.infer<typeof DataSchema>;

function beBaseUrl(): string {
  const url = process.env.BE_URL ?? "http://127.0.0.1:8787";

  return url.replace(/\/$/, "");
}

export const getObservabilitySessionLogs = createServerFn({ method: "GET" })
  .inputValidator((raw) => InputSchema.parse(raw))
  .handler(async ({ data }): Promise<LogTailPage> => {
    const qs = new URLSearchParams();

    if (data.afterOffset != null) {
      qs.set("after_offset", String(data.afterOffset));
    } else if (data.tail !== undefined) {
      qs.set("tail", String(data.tail));
    }

    const url =
      `${beBaseUrl()}/observability/sessions/${data.cliInvocationId}/logs` +
      (qs.size ? `?${qs}` : "");
    const env = await beFetch<LogTailPage>(url);
    const payload = env.Results[0];

    if (payload === undefined) {
      throw new Error(
        `BE_ENVELOPE_EMPTY: /observability/sessions/${data.cliInvocationId}/logs returned no Results`,
      );
    }

    return DataSchema.parse(payload);
  });
