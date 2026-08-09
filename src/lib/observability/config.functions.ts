/**
 * Server function: `getEffectiveConfig`.
 *
 * Plan 90 Step 120. Server-side proxy over BE
 * `GET /api/cli/config/effective` (see `BE/routes/cli_config.py`) that
 * keeps `BE_URL` off the browser bundle and enforces Universal Envelope
 * unwrap. Mirrors `samples.functions.ts` transport-failure surfacing 1:1
 * per Plan 89 (beFetch parity) + spec/03-error-manage/.
 *
 * Wire (envelope payload):
 *   { layers: Layer[], effective: EffectiveLayer, exposed_fields: string[] }
 *
 * Layer discriminator: `source in {"defaults","repo","user","env","flags",
 * "not-implemented","effective"}`. `not-implemented` layers carry
 * `layer` + `reason` so the accordion can render an honest amber panel
 * rather than pretending the merge already spans 5 sources.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

const ValueMapSchema = z.record(z.string(), JsonValueSchema);

const UserFieldSchemaSchema = z.record(
  z.string(),
  z.object({
    type: z.enum(["string", "integer", "boolean", "number"]),
    enum: z.array(z.union([z.string(), z.number()])).optional(),
    minimum: z.number().optional(),
    maximum: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  }),
);

const LayerSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("defaults"),
    values: ValueMapSchema,
  }),
  z.object({
    source: z.literal("env"),
    prefix: z.string(),
    values: ValueMapSchema,
  }),
  z.object({
    source: z.literal("user"),
    values: ValueMapSchema,
    schema: UserFieldSchemaSchema,
    note: z.string().optional(),
  }),
  z.object({
    source: z.literal("not-implemented"),
    layer: z.enum(["repo", "user", "flags"]),
    reason: z.string(),
    values: ValueMapSchema,
  }),
]);

const EffectiveSchema = z.object({
  source: z.literal("effective"),
  values: ValueMapSchema,
});

const DataSchema = z.object({
  layers: z.array(LayerSchema),
  effective: EffectiveSchema,
  exposed_fields: z.array(z.string()),
});

const EnvelopeSchema = z.object({
  Status: z.object({ IsFailed: z.boolean() }).passthrough(),
  Results: z.array(z.unknown()).default([]),
  Errors: z
    .union([
      z.object({ Code: z.string(), Message: z.string() }).passthrough(),
      z.array(z.object({ Code: z.string(), Message: z.string() }).passthrough()),
    ])
    .optional(),
});

export type EffectiveConfigLayer = z.infer<typeof LayerSchema>;
export type EffectiveConfig = z.infer<typeof DataSchema>;

function beBaseUrl(): string {
  const url = process.env.BE_URL ?? "http://127.0.0.1:8787";

  return url.replace(/\/$/, "");
}
import { beFetch } from "@/lib/be-fetch";

export const getEffectiveConfig = createServerFn({ method: "GET" })
  .inputValidator((raw) =>
    z
      .object({})
      .default({})
      .parse(raw ?? {}),
  )
  .handler(async (): Promise<EffectiveConfig> => {
    const url = `${beBaseUrl()}/api/cli/config/effective`;
    const env = await beFetch<EffectiveConfig>(url);
    const payload = env.Results[0];

    if (payload === undefined) {
      throw new Error("BE_ENVELOPE_EMPTY: GET /api/cli/config/effective returned no Results");
    }

    return DataSchema.parse(payload);
  });

const UserLayerSchema = z.object({
  source: z.literal("user"),
  values: ValueMapSchema,
  schema: UserFieldSchemaSchema,
  note: z.string().optional(),
});

export type UserLayer = z.infer<typeof UserLayerSchema>;
export type UserFieldSchemaMap = z.infer<typeof UserFieldSchemaSchema>;

const UserWriteInput = z.object({
  values: z.record(z.string(), JsonValueSchema.nullable()),
});

export const getUserConfig = createServerFn({ method: "GET" })
  .inputValidator((raw) =>
    z
      .object({})
      .default({})
      .parse(raw ?? {}),
  )
  .handler(async (): Promise<UserLayer> => {
    const url = `${beBaseUrl()}/api/cli/config/user`;
    const env = await beFetch<UserLayer>(url);
    const payload = env.Results[0];

    if (payload === undefined) {
      throw new Error("BE_ENVELOPE_EMPTY: GET /api/cli/config/user returned no Results");
    }

    return UserLayerSchema.parse(payload);
  });

export const setUserConfig = createServerFn({ method: "POST" })
  .inputValidator((raw) => UserWriteInput.parse(raw))
  .handler(async ({ data }): Promise<UserLayer> => {
    const url = `${beBaseUrl()}/api/cli/config/user`;
    const env = await beFetch<UserLayer>(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ values: data.values }),
    });
    const payload = env.Results[0];

    if (payload === undefined) {
      throw new Error("BE_ENVELOPE_EMPTY: POST /api/cli/config/user returned no Results");
    }

    return UserLayerSchema.parse(payload);
  });
