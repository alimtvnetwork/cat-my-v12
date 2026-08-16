import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Plan 64 step 73 + step 85 wire-through: `createProject` server fn.
 *
 * Auth-gated. Inserts a row into `public.projects` under the caller's RLS
 * scope, then attaches any requested rule sets via `project_rulesets` and
 * creates any requested per-project categories via `project_categories`.
 * The client store becomes a cache of server truth.
 */
import { HttpMethod } from "@/lib/constants";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CreateProjectInput = z.object({
  name: z.string().min(1).max(80),
  cameraSettingsId: z.string().uuid().optional(),
  rulesetIds: z.array(z.string().uuid()).max(32).optional(),
  categoryNames: z.array(z.string().min(1).max(80)).max(32).optional(),
});

export interface CreateProjectResult {
  projectId: string;
  createdAt: string;
}

export const createProject = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CreateProjectInput.parse(data))
  .handler(async ({ data, context }): Promise<CreateProjectResult> => {
    // Cast to untyped client: step-85 tables are not yet in the generated
    // `Database` types. Same pattern as `shapes.server.ts`.
    const supabase = context.supabase as unknown as SupabaseClient;
    const userId = context.userId;
    const insertPayload: {
      owner_id: string;
      name: string;
      camera_settings_id?: string;
    } = { owner_id: userId, name: data.name };

    if (data.cameraSettingsId) insertPayload.camera_settings_id = data.cameraSettingsId;

    const { data: project, error } = await supabase
      .from("projects")
      .insert(insertPayload)
      .select("id, created_at")
      .single();

    if (error || !project) {
      ClientLogger.error("[createProject] insert failed", error);

      throw new Error(error?.message ?? "createProject: insert failed");
    }

    const projectId = (project as { id: string }).id;

    if (data.rulesetIds && data.rulesetIds.length > 0) {
      const rows = data.rulesetIds.map((ruleset_id, i) => ({
        project_id: projectId,
        ruleset_id,
        sort_order: i,
      }));
      const { error: joinErr } = await supabase.from("project_rulesets").insert(rows);

      if (joinErr) {
        ClientLogger.error("[createProject] project_rulesets insert failed", joinErr);

        throw new Error(joinErr.message);
      }
    }

    if (data.categoryNames && data.categoryNames.length > 0) {
      const rows = data.categoryNames.map((name) => ({ project_id: projectId, name }));
      const { error: catErr } = await supabase.from("project_categories").insert(rows);

      if (catErr) {
        ClientLogger.error("[createProject] project_categories insert failed", catErr);

        throw new Error(catErr.message);
      }
    }

    ClientLogger.info("[createProject] ok", { user: userId, projectId, name: data.name });

    return { projectId, createdAt: (project as { created_at: string }).created_at };
  });
