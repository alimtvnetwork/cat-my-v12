/**
 * Server function: `listRules`.
 *
 * Plan 90 Step 115 (FE `/cli/rules`). Server-side proxy over BE
 * `GET /rules` (see `BE/routes/rules.py`) that keeps `BE_URL` off the
 * browser bundle and centralises Universal Envelope unwrap.
 *
 * The envelope payload shape (per `list_rules` in `BE/routes/rules.py`):
 *   `{ items: CatRule[], total: number, provider: string }`
 * where `CatRule` (see `BE/app/domain/cat_rule.py`) is
 *   `{ id: number, name: string, version: number, enabled: boolean }`.
 *
 * `provider` is the active facade class name (`InMemoryRuleFacade` /
 * `VendorRuleFacade`) and is authoritative for the "Provider" column on
 * `/cli/rules`; we deliberately do NOT synthesize a per-row provider so
 * the UI never lies about which adapter served the row.
 *
 * `UpdatedAt` is NOT part of the wire yet (`CatRule` is frozen at
 * `{id,name,version,enabled}`); the caller renders `"-"` rather than a
 * fabricated timestamp, matching the "no false-OK" rule in
 * `spec/03-error-manage/`.
 */
import { beFetch } from "@/lib/be-fetch";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CatRuleSchema = z.object({
  RuleId: z.number().int(),
  LegacyRuleId: z.string().optional(),
  RuleKind: z.string(),
  OrderIndex: z.number().int(),
  ParamsJson: z.string(),
  IsActive: z.boolean(),
  CreatedAt: z.string().optional(),
  UpdatedAt: z.string().optional(),
});

const DataSchema = z.object({
  items: z.array(CatRuleSchema),
  total: z.number().int(),
});

export type CatRuleRecord = z.infer<typeof CatRuleSchema>;
export type CatRuleWire = CatRuleRecord;
export type RulesPage = z.infer<typeof DataSchema>;

function beBaseUrl(): string {
  const url = process.env.BE_URL ?? "http://127.0.0.1:8787";

  return url.replace(/\/$/, "");
}

export const listRules = createServerFn({ method: "GET" })
  .inputValidator((raw) =>
    z
      .object({})
      .default({})
      .parse(raw ?? {}),
  )
  .handler(async (): Promise<RulesPage> => {
    const url = `${beBaseUrl()}/rules`;
    const env = await beFetch<RulesPage>(url);
    const payload = env.Results[0];

    if (payload === undefined) {
      throw new Error("BE_ENVELOPE_EMPTY: GET /rules returned no Results");
    }

    return DataSchema.parse(payload);
  });
