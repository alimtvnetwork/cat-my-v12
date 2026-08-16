import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Plan 64 step 85 code side: `saveRule` server fn.
 *
 * Root cause: rule edits (name, params, hidden, locked) lived only in the
 * client-side Zustand editor store, so a page refresh dropped every change.
 * `rulesets.body` is the JSON blob that owns the persisted rule list; this
 * server fn merges the incoming rule into that blob under RLS.
 *
 * Contract:
 *   - Input: rulesetId (uuid) + rule (id + kind + name + params + flags).
 *   - Effect: read `rulesets.body.rules`, replace or append matching id,
 *     write back, return the new `updated_at` for cache invalidation.
 *   - Auth: `requireSupabaseAuth` middleware; the caller's Supabase client
 *     is used so RLS scopes to their owned rule sets.
 */
import { HttpMethod } from "@/lib/constants";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RuleShape = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  name: z.string().min(1).max(200),
  params: z.record(z.string(), z.unknown()).default({}),
  isHidden: z.boolean().default(false),
  isLocked: z.boolean().default(false),
  order: z.number().int().nonnegative().optional(),
});

const SaveRuleInput = z.object({
  rulesetId: z.string().uuid(),
  rule: RuleShape,
});

export interface SaveRuleResult {
  rulesetId: string;
  ruleId: string;
  updatedAt: string;
}

interface RulesetBody {
  rules?: z.infer<typeof RuleShape>[];
  [k: string]: unknown;
}

export const saveRule = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SaveRuleInput.parse(data))
  .handler(async ({ data, context }): Promise<SaveRuleResult> => {
    const correlationId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sr-${Date.now().toString(36)}`;
    const supabase = context.supabase as unknown as SupabaseClient;

    const { data: existing, error: readErr } = await supabase
      .from("rulesets")
      .select("id, body")
      .eq("id", data.rulesetId)
      .maybeSingle();

    if (readErr) {
      ClientLogger.error("[saveRule] read failed", { correlationId, err: readErr });

      throw new Error(
        JSON.stringify({
          code: "E_SAVE_RULE_READ",
          message: readErr.message,
          correlationId,
          operation: "saveRule.read",
        }),
      );
    }

    if (!existing) {
      throw new Error(
        JSON.stringify({
          code: "E_SAVE_RULE_NOT_FOUND",
          message: `ruleset ${data.rulesetId} not found or not accessible`,
          correlationId,
          operation: "saveRule.read",
        }),
      );
    }

    const body: RulesetBody =
      existing.body && typeof existing.body === "object" ? (existing.body as RulesetBody) : {};
    const rules = Array.isArray(body.rules) ? [...body.rules] : [];
    const idx = rules.findIndex((r) => r.id === data.rule.id);

    if (idx >= 0) rules[idx] = data.rule;
    else rules.push(data.rule);
    const nextBody: RulesetBody = { ...body, rules };

    const { data: updated, error: writeErr } = await supabase
      .from("rulesets")
      .update({ body: nextBody })
      .eq("id", data.rulesetId)
      .select("id, updated_at")
      .single();

    if (writeErr || !updated) {
      ClientLogger.error("[saveRule] write failed", { correlationId, err: writeErr });

      throw new Error(
        JSON.stringify({
          code: "E_SAVE_RULE_WRITE",
          message: writeErr?.message ?? "update returned no row",
          correlationId,
          operation: "saveRule.write",
        }),
      );
    }

    ClientLogger.info("[saveRule] persisted", {
      correlationId,
      rulesetId: data.rulesetId,
      ruleId: data.rule.id,
      appended: idx < 0,
    });

    return {
      rulesetId: data.rulesetId,
      ruleId: data.rule.id,
      updatedAt: updated.updated_at as string,
    };
  });
