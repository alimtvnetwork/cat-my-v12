import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Server function: `getCliStatus`.
 *
 * Plan 90 Step 123. Proxies `GET /api/cli/status` (see
 * `BE/routes/cli_observability.py`) and unwraps the Universal Envelope.
 * Consumed by the global CLI status widget mounted in `__root` (see
 * `src/components/cli/GlobalCliStatusWidget.tsx`).
 */
import { beFetch } from "@/lib/be-fetch";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ProcStatusSchema = z.object({
  Pid: z.number().int(),
  Subcmd: z.string(),
  StartedAt: z.string(),
  MemoryMb: z.number(),
  CpuPct: z.number(),
  ActiveSessionId: z.string().nullable(),
  ExitCode: z.number().nullable().optional(),
});

const IpcSummarySchema = z.object({
  Pending: z.number().int(),
  Truncated: z.boolean(),
  Available: z.boolean(),
});

const DataSchema = z.object({
  Worker: ProcStatusSchema.nullable(),
  Processing: ProcStatusSchema.nullable(),
  Ipc: IpcSummarySchema,
  LastErrorCode: z.string().nullable(),
  LogRootAvailable: z.boolean(),
});

export type ProcStatus = z.infer<typeof ProcStatusSchema>;
export type CliStatus = z.infer<typeof DataSchema>;

function beBaseUrl(): string {
  const url = process.env.BE_URL ?? "http://127.0.0.1:8787";

  return url.replace(/\/$/, "");
}

export const getCliStatus = createServerFn({ method: "GET" })
  .inputValidator((raw) =>
    z
      .object({})
      .default({})
      .parse(raw ?? {}),
  )
  .handler(async (): Promise<CliStatus> => {
    const url = `${beBaseUrl()}/api/cli/status`;
    const unavailable: CliStatus = {
      Worker: null,
      Processing: null,
      Ipc: { Pending: 0, Truncated: false, Available: false },
      LastErrorCode: null,
      LogRootAvailable: false,
    };
    try {
      const env = await beFetch<CliStatus>(url, {}, { suppressCapture: true });
      const payload = env.Results[0];

      if (payload === undefined) {
        throw new Error("BE_ENVELOPE_EMPTY: GET /api/cli/status returned no Results");
      }

      return DataSchema.parse(payload);
    } catch (cause) {
      ClientLogger.warn(
        `[getCliStatus] BE unreachable at ${url}: ${cause instanceof Error ? cause.message : String(cause)}`,
      );

      return unavailable;
    }
  });
