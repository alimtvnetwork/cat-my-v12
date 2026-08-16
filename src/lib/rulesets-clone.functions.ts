import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Plan 64 step 84 + step 85 wire-through: distinct clone-Rule-Set server fns.
 *
 * Root cause: "Reference" vs "Snapshot" clone semantics differ in whether
 * downstream parent edits propagate. Collapsing them behind one boolean
 * flag hid the intent at call sites and made auditing propagation bugs
 * hard. Two named functions make the semantic explicit at every caller.
 *
 * Semantics against `public.rulesets`:
 *   - reference: `parent_ruleset_id = source.id`, `override_mode = 'reference'`,
 *     `body = {}` (empty override; parent edits propagate).
 *   - snapshot:  `parent_ruleset_id = null`, `override_mode = 'snapshot'`,
 *     `body = source.body` (frozen copy; parent edits do not propagate).
 */
import { HttpMethod } from "@/lib/constants";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CloneInput = z.object({
  sourceRulesetId: z.string().uuid(),
  name: z.string().min(1).max(120),
});

export interface CloneRulesetResult {
  rulesetId: string;
  sourceRulesetId: string;
  mode: "reference" | "snapshot";
  createdAt: string;
}

async function insertClone(params: {
  supabase: SupabaseClient;
  ownerId: string;
  sourceRulesetId: string;
  name: string;
  mode: "reference" | "snapshot";
}): Promise<CloneRulesetResult> {
  const { supabase, ownerId, sourceRulesetId, name, mode } = params;
  // Fetch source under RLS: user can only clone their own rule sets.
  const src = await supabase
    .from("rulesets")
    .select("id, body")
    .eq("id", sourceRulesetId)
    .maybeSingle();

  if (src.error) throw src.error;

  if (!src.data) throw new Error("cloneRuleset: source not found");

  const body = mode === "snapshot" ? (src.data as { body: unknown }).body : {};
  const parent_ruleset_id = mode === "reference" ? sourceRulesetId : null;

  const ins = await supabase
    .from("rulesets")
    .insert({
      owner_id: ownerId,
      name,
      parent_ruleset_id,
      override_mode: mode,
      body,
    })
    .select("id, created_at")
    .single();

  if (ins.error || !ins.data) throw ins.error ?? new Error("cloneRuleset: insert failed");

  return {
    rulesetId: (ins.data as { id: string }).id,
    sourceRulesetId,
    mode,
    createdAt: (ins.data as { created_at: string }).created_at,
  };
}

export const cloneRulesetReference = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CloneInput.parse(data))
  .handler(async ({ data, context }): Promise<CloneRulesetResult> => {
    const supabase = context.supabase as unknown as SupabaseClient;
    const result = await insertClone({
      supabase,
      ownerId: context.userId,
      sourceRulesetId: data.sourceRulesetId,
      name: data.name,
      mode: "reference",
    });
    ClientLogger.info("[cloneRulesetReference] ok", {
      user: context.userId,
      rulesetId: result.rulesetId,
      sourceRulesetId: data.sourceRulesetId,
    });

    return result;
  });

export const cloneRulesetSnapshot = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CloneInput.parse(data))
  .handler(async ({ data, context }): Promise<CloneRulesetResult> => {
    const supabase = context.supabase as unknown as SupabaseClient;
    const result = await insertClone({
      supabase,
      ownerId: context.userId,
      sourceRulesetId: data.sourceRulesetId,
      name: data.name,
      mode: "snapshot",
    });
    ClientLogger.info("[cloneRulesetSnapshot] ok", {
      user: context.userId,
      rulesetId: result.rulesetId,
      sourceRulesetId: data.sourceRulesetId,
    });

    return result;
  });

/** Utility: next free "Rule Set NN" name given existing names. */
export function nextRuleSetName(existing: readonly string[]): string {
  const used = new Set<number>();
  const re = /^Rule Set (\d+)$/;
  for (const n of existing) {
    const m = re.exec(n);

    if (m) used.add(Number(m[1]));
  }

  let i = 1;
  while (used.has(i)) i += 1;

  return `Rule Set ${i.toString().padStart(2, "0")}`;
}
