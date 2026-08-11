/**
 * Server function: `getObservabilitySessions`.
 *
 * Plan 90 Step 85. Thin server-side proxy over the BE endpoint
 * `GET /observability/sessions` (Step 72, sort added Step 82,
 * cursor pagination added Step 84). Kept on the server so:
 *   1. `BE_URL` never ships to the browser bundle.
 *   2. CORS stays scoped to the BE dev origin.
 *   3. Envelope unwrap + error taxonomy happens in one place.
 *
 * Envelope contract (see `BE/envelope.py`): BE emits
 * `{ Status, Attributes, Results: [payload], Errors? }`. The payload
 * for this endpoint is a single object at `Results[0]`. Prior versions
 * read `env.Data` which does NOT exist on the wire, so every call
 * threw `BE_HTTP_200` silently. Root cause fixed here as part of
 * Step 85 (cursor pagination is unusable without a working transport).
 */
import { beFetch, EnvelopeError } from "@/lib/be-fetch";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CliName = z.enum(["worker-cli", "processing-cli"]);
const SessionStatus = z.enum(["active", "success", "failure"]);
const SortKeySchema = z.enum(["StartedAt", "CliName", "Status", "DurationMs"]);
const SortDirSchema = z.enum(["asc", "desc"]);

const InputSchema = z
  .object({
    limit: z.number().int().min(1).max(500).optional(),
    cli: CliName.optional(),
    status: SessionStatus.optional(),
    sort: SortKeySchema.optional(),
    dir: SortDirSchema.optional(),
    cursor: z.string().min(1).max(4096).optional(),
  })
  .default({});

const SessionSchema = z.object({
  CliInvocationId: z.string(),
  RunId: z.string().nullable(),
  CliName: z.string(),
  Subcommand: z.string().nullable(),
  HostName: z.string().nullable(),
  Pid: z.number().nullable(),
  StartedAt: z.number().nullable(),
  EndedAt: z.number().nullable(),
  ExitCode: z.number().nullable(),
  IsSuccess: z.union([z.boolean(), z.number()]).nullable(),
  LogPath: z.string().nullable(),
  DurationMs: z.number().nullable(),
});

const PayloadSchema = z.object({
  items: z.array(SessionSchema),
  total: z.number().int(),
  limit: z.number().int(),
  sort: SortKeySchema.optional(),
  dir: SortDirSchema.optional(),
  nextCursor: z.string().nullable().optional(),
});

export type ObservabilitySession = z.infer<typeof SessionSchema>;
export type SessionsPage = z.infer<typeof PayloadSchema>;

function beBaseUrl(): string {
  const url = process.env.BE_URL ?? "http://127.0.0.1:8787";

  return url.replace(/\/$/, "");
}

export const getObservabilitySessions = createServerFn({ method: "GET" })
  .inputValidator((raw) => InputSchema.parse(raw ?? {}))
  .handler(async ({ data }): Promise<SessionsPage> => {
    const qs = new URLSearchParams();

    if (data.limit !== undefined) qs.set("limit", String(data.limit));

    if (data.cli) qs.set("cli", data.cli);

    if (data.status) qs.set("status", data.status);

    if (data.sort) qs.set("sort", data.sort);

    if (data.dir) qs.set("dir", data.dir);

    if (data.cursor) qs.set("cursor", data.cursor);
    const url = `${beBaseUrl()}/observability/sessions${qs.size ? `?${qs}` : ""}`;
    try {
      const env = await beFetch<SessionsPage>(
        url,
        { headers: { accept: "application/json" } },
        { suppressCapture: true },
      );
      const payload = env.Results[0];

      if (payload === undefined) {
        throw new Error(`BE_ENVELOPE_EMPTY: /observability/sessions returned no Results`);
      }

      return PayloadSchema.parse(payload);
    } catch (err) {
      const isEnvelope =
        err instanceof EnvelopeError || (err instanceof Error && err.name === "EnvelopeError");
      const envErr = err as EnvelopeError;

      if (isEnvelope && (envErr.responseStatus === 404 || envErr.code === "E_BE_UNAVAILABLE")) {
        return {
          items: [],
          total: 0,
          limit: data.limit ?? 25,
          sort: data.sort,
          dir: data.dir,
          nextCursor: null,
        };
      }

      throw err;
    }
  });