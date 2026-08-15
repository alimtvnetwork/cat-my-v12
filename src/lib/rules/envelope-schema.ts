// Plan 90 Step 117. Shared Zod validator for `RuleSetEnvelope`, mirroring
// `BE/app/domain/rule_set.py` `parse_envelope`. Extracted from the Step-116
// editor so the Step-117 import route validates operator-uploaded bundles
// against the *identical* schema the editor and BE enforce — no drift.
//
// Pure browser module (no I/O). Safe to import from routes and components.

import { z } from "zod";
import { RULESET_SCHEMA_VERSION, type RuleSetEnvelope } from "./draftStore";

const ShapeZ = z
  .object({
    Type: z.string().min(1),
    X: z.number(),
    Y: z.number(),
    W: z.number(),
    H: z.number(),
  })
  .strict();

const ToleranceZ = z
  .object({
    Kind: z.enum(["pct", "abs"]),
    Value: z.number(),
  })
  .strict();

const RuleItemZ = z
  .object({
    Id: z.number().int().positive(),
    Kind: z.enum(["presence", "absence", "match", "measure"]),
    Enabled: z.boolean(),
    Shape: ShapeZ,
    Tolerance: ToleranceZ,
    Params: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

const DraftMetaZ = z
  .object({
    ClientId: z.string().min(1),
    UpdatedAt: z.string().refine((s) => s.includes("T"), "must be ISO-8601"),
    Origin: z.enum(["indexeddb", "server"]),
  })
  .strict();

export const RuleSetEnvelopeZ = z
  .object({
    SchemaVersion: z.literal(RULESET_SCHEMA_VERSION),
    RuleSetId: z.number().int().nonnegative(),
    Name: z.string().min(1),
    Version: z.number().int().nonnegative(),
    Enabled: z.boolean(),
    Rules: z.array(RuleItemZ).superRefine((rules, ctx) => {
      const seen = new Set<number>();
      for (const r of rules) {
        if (seen.has(r.Id)) {
          ctx.addIssue({ code: "custom", message: `duplicate Rules[].Id ${r.Id}` });
        }

        seen.add(r.Id);
      }
    }),
    DraftMeta: DraftMetaZ,
  })
  .strict();

export type ValidationResult =
  | { ok: true; envelope: RuleSetEnvelope }
  | { ok: false; message: string };

export function validateEnvelopeJson(text: string): ValidationResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return {
      ok: false,
      message: `JSON parse: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const parsed = RuleSetEnvelopeZ.safeParse(raw);

  if (parsed.success === false) {
    const first = parsed.error.issues[0];
    const path = first?.path.join(".") || "(root)";

    return { ok: false, message: `${path}: ${first?.message ?? "invalid"}` };
  }

  return { ok: true, envelope: parsed.data as RuleSetEnvelope };
}

/** SHA-256 hex digest via SubtleCrypto. Browser-only. */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
