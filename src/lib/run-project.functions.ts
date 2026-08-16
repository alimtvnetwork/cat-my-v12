import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Plan 64 step 80 + step 85 wire-through: `runProject` server fn.
 *
 * Auth-gated. Inserts a queued row into `public.runs` under the caller's
 * RLS scope and returns the persisted run id. The capture pipeline hook
 * that flips status from `queued` to `running`/`succeeded`/`failed` lands
 * in a follow-up step; this fn owns the durable run identity.
 */
import { HttpMethod } from "@/lib/constants";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RunProjectInput = z.object({
  projectId: z.string().uuid(),
  rulesetIds: z.array(z.string().uuid()).min(1).max(32),
  testImageRef: z.string().min(1).max(512).optional(),
});

export interface RunProjectResult {
  runId: string;
  projectId: string;
  startedAt: string;
}

export const runProject = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => RunProjectInput.parse(data))
  .handler(async ({ data, context }): Promise<RunProjectResult> => {
    const supabase = context.supabase as unknown as SupabaseClient;
    const summary = {
      rulesetIds: data.rulesetIds,
      testImageRef: data.testImageRef ?? null,
    };
    const { data: row, error } = await supabase
      .from("runs")
      .insert({
        project_id: data.projectId,
        owner_id: context.userId,
        status: "queued",
        summary,
      })
      .select("id, started_at")
      .single();

    if (error || !row) {
      ClientLogger.error("[runProject] insert failed", error);

      throw new Error(error?.message ?? "runProject: insert failed");
    }

    const runId = (row as { id: string }).id;
    const startedAt = (row as { started_at: string }).started_at;
    ClientLogger.info("[runProject] queued", {
      user: context.userId,
      runId,
      projectId: data.projectId,
      rulesetCount: data.rulesetIds.length,
      hasTestImage: Boolean(data.testImageRef),
    });

    return { runId, projectId: data.projectId, startedAt };
  });
