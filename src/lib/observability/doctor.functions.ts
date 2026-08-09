/**
 * Server function: `getDoctorReport`.
 *
 * Plan 90 Step 122. Proxies `POST /api/cli/doctor` (see
 * `BE/routes/cli_doctor.py`) and unwraps the Universal Envelope. Keeps
 * `BE_URL` off the client bundle. Mirrors the transport-failure surfacing
 * used by `config.functions.ts` and `samples.functions.ts` per Plan 89.
 *
 * Wire (envelope Results[0]):
 *   { IsHealthy, TotalProbes, UnhealthyCount,
 *     Probes: [{ Tier, IsHealthy, Detail, Remediation? }] }
 */
import { beFetch } from "@/lib/be-fetch";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ProbeSchema = z.object({
  Tier: z.string(),
  IsHealthy: z.boolean(),
  Detail: z.string(),
  Remediation: z.string().optional(),
});

const DataSchema = z.object({
  IsHealthy: z.boolean(),
  TotalProbes: z.number().int(),
  UnhealthyCount: z.number().int(),
  Probes: z.array(ProbeSchema),
});

export type DoctorProbe = z.infer<typeof ProbeSchema>;
export type DoctorReport = z.infer<typeof DataSchema>;

function beBaseUrl(): string {
  const url = process.env.BE_URL ?? "http://127.0.0.1:8787";

  return url.replace(/\/$/, "");
}

export const getDoctorReport = createServerFn({ method: "POST" })
  .inputValidator((raw) =>
    z
      .object({})
      .default({})
      .parse(raw ?? {}),
  )
  .handler(async (): Promise<DoctorReport> => {
    const url = `${beBaseUrl()}/api/cli/doctor`;
    const env = await beFetch<DoctorReport>(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const payload = env.Results[0];

    if (payload === undefined) {
      throw new Error("BE_ENVELOPE_EMPTY: POST /api/cli/doctor returned no Results");
    }

    return DataSchema.parse(payload);
  });
