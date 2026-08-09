import { OpsEventCodeType } from "@/lib/ops.shared";
import { appendOpsEvent } from "./ops.server";

const ADMIN_ROLE = "admin";

export class CaptureAuthorizationError extends Error {
  code = OpsEventCodeType.E_SEC_DENIED as const;
  constructor(userId: string) {
    super(`E_SEC_DENIED: admin role required for ${userId}`);
  }
}

export async function requireCaptureAdmin(userId: string, subject: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", ADMIN_ROLE)
    .maybeSingle();

  if (error) {
    console.error(`[capture.auth] actor=${userId} subject=${subject} result=E_INTERNAL`, error);

    throw new Error("E_INTERNAL: admin role lookup failed");
  }

  if (data) return userId;
  appendOpsEvent({
    code: OpsEventCodeType.E_SEC_DENIED,
    subject,
    actor: userId,
    detail: "write requires admin",
  });
  console.warn(`[capture.auth] actor=${userId} subject=${subject} result=E_SEC_DENIED`);

  throw new CaptureAuthorizationError(userId);
}
