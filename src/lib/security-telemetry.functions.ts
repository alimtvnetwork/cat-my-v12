import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 33 slice 2 (Plan 48 step 1): admin-only server-fn returning the last
// N hours of denial-related audit rows.
//
// Anchored by:
// - spec/21-app/40-error-manage.md A.1 (Security codes)
// - spec/21-app/69a-v2-denial-tuning-evidence.md (tuning_version=plan-29-v1)
// - Plan file: .lovable/plans/pending/48-plan33-server-fn-and-percentiles.md
//
// RLS + auth model:
// - `.middleware([requireSupabaseAuth])` gives us `context.supabase` scoped to
//   the caller's JWT. `public.audit_events` has an admin-only SELECT policy
//   (see supabase/migrations/20260714094242_*.sql lines 30-35), so a non-admin
//   caller will always get zero rows via RLS. We still perform an explicit
//   admin gate below so a non-admin call returns a typed `E_SEC_ROLE_DENIED`
//   error instead of a misleading empty list.
// - The admin check queries `public.user_roles` directly (RLS: "Users can read
//   their own roles" grants each caller `SELECT` on their own rows). We do
//   NOT call `has_role()` because that function's EXECUTE grant to
//   `authenticated` was revoked in migration 20260713153814 and only
//   `service_role` can invoke it. Fixing that grant is out-of-scope for this
//   slice; documented in `.lovable/memory/v2/plan29/30-derivation-inputs.md`.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { HttpMethod } from "@/lib/constants";

export const DENIAL_CODES = [
  "E_SEC_ROLE_DENIED",
  "E_SEC_NOAUTH",
  "E_SEC_DENIAL_BURST",
  "W_SEC_BURST_APPROACHING",
] as const;
export type DenialCode = (typeof DENIAL_CODES)[number];

// Serializable JSON shape (must round-trip through the server-fn RPC).
export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface DenialBurstRow {
  event_id: string;
  ts: string;
  code: DenialCode | string;
  correlation_id: string;
  actor: Json;
  payload: Json;
}

export const HOURS_MIN = 1;
export const HOURS_MAX = 168;
export const HOURS_DEFAULT = 24;

export function clampHours(input: unknown): number {
  const n = Number(input);

  if (Number.isFinite(n) === false) return HOURS_DEFAULT;
  const floored = Math.floor(n);

  if (floored < HOURS_MIN) return HOURS_MIN;

  if (floored > HOURS_MAX) return HOURS_MAX;

  return floored;
}

export interface GetDenialBurstWindowInput {
  hours?: number;
}

export interface GetDenialBurstWindowResult {
  rows: DenialBurstRow[];
  hours: number;
  cutoffIso: string;
  tuningVersion: "plan-29-v1";
}

// Typed error carrying the spec 40-error-manage code. Never returns a null
// result; failures throw so route errorComponent + observability layers can
// surface them (per project rule: silent failure is unacceptable).
export class DenialTelemetryError extends Error {
  readonly code: "E_SEC_ROLE_DENIED";
  readonly correlationId: string;
  constructor(correlationId: string, message = "role required: admin") {
    super(message);
    this.name = "DenialTelemetryError";
    this.code = "E_SEC_ROLE_DENIED";
    this.correlationId = correlationId;
  }
}

function newCorrelationId(): string {
  // Crypto is available in the Cloudflare Worker runtime (see server-runtime).
  return (
    globalThis.crypto?.randomUUID?.() ?? `corr-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export const getDenialBurstWindow = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: GetDenialBurstWindowInput | undefined) => ({
    hours: clampHours(data?.hours),
  }))
  .handler(async ({ data, context }): Promise<GetDenialBurstWindowResult> => {
    const { supabase, userId } = context;
    const correlationId = newCorrelationId();

    // Admin gate. Reads the caller's own role row under RLS; a non-admin
    // caller gets zero rows and we throw the typed spec error.
    const roleQuery = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .limit(1);

    if (roleQuery.error) {
      // Surface, do not swallow.
      ClientLogger.error(
        `[security-telemetry] role-check failed correlation=${correlationId} user=${userId} error=${roleQuery.error.message}`,
      );

      throw new DenialTelemetryError(correlationId, "role-check failed");
    }

    if (!roleQuery.data || roleQuery.data.length === 0) {
      ClientLogger.warn(
        `[security-telemetry] E_SEC_ROLE_DENIED correlation=${correlationId} user=${userId} required=admin`,
      );

      throw new DenialTelemetryError(correlationId);
    }

    const cutoff = new Date(Date.now() - data.hours * 3600 * 1000);
    const cutoffIso = cutoff.toISOString();

    const { data: rows, error } = await supabase
      .from("audit_events")
      .select("event_id, ts, code, correlation_id, actor, payload")
      .in("code", DENIAL_CODES as unknown as string[])
      .gte("ts", cutoffIso)
      .order("ts", { ascending: false })
      .limit(10_000);

    if (error) {
      ClientLogger.error(
        `[security-telemetry] query failed correlation=${correlationId} error=${error.message}`,
      );

      throw new Error(`E_SEC_AUDIT_FAILED: ${error.message}`);
    }

    return {
      rows: (rows ?? []) as unknown as DenialBurstRow[],
      hours: data.hours,
      cutoffIso,
      tuningVersion: "plan-29-v1",
    };
  });
