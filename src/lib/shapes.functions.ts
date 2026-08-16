import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Plan 64 step 68: `compileShape` server fn.
 * Authenticated only. Delegates every side-effect to `shapes.server.ts` so
 * the client bundle stays free of admin imports.
 */
import { HttpMethod } from "@/lib/constants";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CompileShapeInput = z.object({
  name: z.string().min(1).max(64),
  svgPath: z.string().min(4).max(64_000),
  viewBoxW: z.number().positive().max(10_000),
  viewBoxH: z.number().positive().max(10_000),
});

export const compileShape = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => CompileShapeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { normaliseSvgPath, insertShape } = await import("./shapes.server");
    const svgPath = normaliseSvgPath(data.svgPath);
    ClientLogger.info("[compileShape] start", {
      user: context.userId,
      name: data.name,
      bytes: svgPath.length,
    });
    try {
      const shape = await insertShape({
        supabase: context.supabase,
        ownerId: context.userId,
        name: data.name,
        svgPath,
        viewBoxW: data.viewBoxW,
        viewBoxH: data.viewBoxH,
      });
      ClientLogger.info("[compileShape] ok", { id: shape.id, sha256: shape.sha256 });

      return shape;
    } catch (err) {
      ClientLogger.error("[compileShape] fail", err);

      throw err;
    }
  });
