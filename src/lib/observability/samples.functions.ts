/**
 * Server function: `listSamples`.
 *
 * Plan 90 Step 118 (FE `/cli/samples`). Server-side proxy over BE
 * `GET /samples` (see `BE/routes/samples.py`) that keeps `BE_URL` off the
 * browser bundle and centralises Universal Envelope unwrap.
 *
 * Wire (envelope payload from `BE/routes/samples.py::list_samples`):
 *   `{ items: CatSample[], total: number, provider: string }`
 * where `CatSample` (see `BE/app/domain/cat_sample.py`) is
 *   `{ id: number, rule_id: number, label: string, captured_at: string }`.
 *
 * IMPORTANT (honest-wire, no false-OK per `spec/03-error-manage/`):
 *  - The wire has NO `tag`, NO `status`, NO thumbnail/image URL, and NO
 *    `Attributes.TotalRecords` (samples returns the full page in one shot).
 *    The Step-118 UI therefore renders placeholder thumbnails, filters on
 *    the fields that DO exist (`rule_id`, free-text over `label`), and
 *    paginates client-side over `payload.total`. When the BE wire adds
 *    `tag`/`status`/`thumbnail_url`, the schema below and the caller are
 *    the two touch-points.
 *  - Mirrors `src/lib/observability/rules.functions.ts` (Step 115) 1:1 for
 *    envelope parsing, transport-failure surfacing, and shape guards.
 */
import { beFetch } from "@/lib/be-fetch";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CatSampleSchema = z.object({
  SampleId: z.number().int(),
  LegacySampleId: z.string().optional(),
  Label: z.string(),
  ImageFilePath: z.string(),
  WidthPx: z.number().int().optional(),
  HeightPx: z.number().int().optional(),
  Channels: z.number().int().optional(),
  SizeBytes: z.number().int().optional(),
  Sha256: z.string().optional(),
  CreatedAt: z.string().optional(),
  UpdatedAt: z.string().optional(),
});

const DataSchema = z.object({
  items: z.array(CatSampleSchema),
  total: z.number().int(),
});

export type CatSampleWire = z.infer<typeof CatSampleSchema>;
export type SamplesPage = z.infer<typeof DataSchema>;

function beBaseUrl(): string {
  const url = process.env.BE_URL ?? "http://127.0.0.1:8787";

  return url.replace(/\/$/, "");
}

export const listSamples = createServerFn({ method: "GET" })
  .inputValidator((raw) =>
    z
      .object({})
      .default({})
      .parse(raw ?? {}),
  )
  .handler(async (): Promise<SamplesPage> => {
    const url = `${beBaseUrl()}/samples`;
    const env = await beFetch<SamplesPage>(url);
    const payload = env.Results[0];

    if (payload === undefined) {
      throw new Error("BE_ENVELOPE_EMPTY: GET /samples returned no Results");
    }

    return DataSchema.parse(payload);
  });

/**
 * Server function: `getSample`.
 *
 * Plan 90 Step 119 (FE `/cli/samples/$sampleId`). Server-side proxy over
 * BE `GET /samples/{sample_id}` (see `BE/routes/samples.py::get_sample`).
 * The envelope payload is the raw `CatSample` wire (NOT wrapped in
 * `{items,total,provider}` like the list endpoint), per
 * `BE/routes/samples.py` L143.
 */
export const getSample = createServerFn({ method: "GET" })
  .inputValidator((raw) => z.object({ sampleId: z.number().int().min(1) }).parse(raw))
  .handler(async ({ data }): Promise<CatSampleWire> => {
    const url = `${beBaseUrl()}/samples/${data.sampleId}`;
    const env = await beFetch<CatSampleWire>(url);
    const payload = env.Results[0];

    if (payload === undefined) {
      throw new Error(`BE_ENVELOPE_EMPTY: GET /samples/${data.sampleId} returned no Results`);
    }

    return CatSampleSchema.parse(payload);
  });
