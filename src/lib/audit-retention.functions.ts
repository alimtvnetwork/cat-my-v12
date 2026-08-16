import { ClientLogger } from "@/lib/observability/client-logger";
import { OpsEventCodeType } from "@/lib/ops.shared";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireCaptureAdmin } from "./capture-auth.server";
import { appendOpsEvent } from "./ops.server";
import { newCorrelationId, toCaptureError } from "./capture.shared";
import { HttpMethod } from "@/lib/constants";

/**
 * Plan 21 Step 5: `getAuditRetentionStatus` reads real counters from the
 * `public.audit_events` mirror (spec 72 §72.5). Until the Python sink
 * starts writing rows, results are honestly-zero snapshots (nulls where
 * there is no data), never fabricated numbers.
 */

export enum AuditRetentionPolicyType {
  RetentionShort = "RetentionShort",
  RetentionStandard = "RetentionStandard",
  RetentionLong = "RetentionLong",
  RetentionForensic = "RetentionForensic",
}
export type AuditRetentionPolicy = AuditRetentionPolicyType;

export type AuditRetentionPolicyStatus = {
  policy: AuditRetentionPolicy;
  windowDays: number;
  oldestSurvivingTs: string | null;
  rowsPurgedLast24h: number;
  rowsPurgedLastRun: number;
  batchOverrunLastRun: boolean;
};

export type AuditRetentionStatus = {
  lastRun: string | null;
  nextScheduledAt: string | null;
  cadenceHours: number;
  clockSkewMs: number;
  perPolicy: AuditRetentionPolicyStatus[];
  fetchedAt: string;
};

// Mirrors POLICY_WINDOW_DAYS in app/core/audit/retention_worker.py.
const WINDOW_DAYS: Record<AuditRetentionPolicy, number> = {
  [AuditRetentionPolicyType.RetentionShort]: 30,
  [AuditRetentionPolicyType.RetentionStandard]: 180,
  [AuditRetentionPolicyType.RetentionLong]: 400,
  [AuditRetentionPolicyType.RetentionForensic]: 900,
};

const POLICIES = Object.keys(WINDOW_DAYS) as AuditRetentionPolicy[];
const DEFAULT_CADENCE_HOURS = 6;

export const getAuditRetentionStatus = createServerFn({ method: HttpMethod.Get })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuditRetentionStatus> => {
    await requireCaptureAdmin(context.userId, "ops.audit.retention.status");
    const fetchedAt = new Date().toISOString();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Per-policy: oldest surviving ts.
    const perPolicy: AuditRetentionPolicyStatus[] = await Promise.all(
      POLICIES.map(async (policy) => {
        const { data, error } = await supabaseAdmin
          .from("audit_events")
          .select("ts")
          .eq("policy", policy)
          .order("ts", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          ClientLogger.error(`[audit.retention] policy=${policy} query_failed`, error);
        }

        return {
          policy,
          windowDays: WINDOW_DAYS[policy],
          oldestSurvivingTs: (data?.ts as string | undefined) ?? null,
          rowsPurgedLast24h: 0,
          rowsPurgedLastRun: 0,
          batchOverrunLastRun: false,
        };
      }),
    );

    // Last retention run + purge counts from the mirror's AuditRetentionRun events.
    let lastRun: string | null = null;
    const { data: runs, error: runsErr } = await supabaseAdmin
      .from("audit_events")
      .select("ts, payload")
      .eq("code", "AuditRetentionRun")
      .gte("ts", since24h)
      .order("ts", { ascending: false });

    if (runsErr) {
      ClientLogger.error("[audit.retention] runs_query_failed", runsErr);
    } else if (runs && runs.length > 0) {
      lastRun = runs[0].ts as string;
      // Sum per-policy purge counts across the last 24h of runs.
      for (const run of runs) {
        const perPol =
          (
            run.payload as {
              perPolicy?: Array<{ policy: string; rowsPurged?: number; batchOverrun?: boolean }>;
            } | null
          )?.perPolicy ?? [];
        for (const pp of perPol) {
          const tgt = perPolicy.find((p) => p.policy === pp.policy);

          if (!tgt) continue;
          tgt.rowsPurgedLast24h += pp.rowsPurged ?? 0;

          if (run.ts === lastRun) {
            tgt.rowsPurgedLastRun = pp.rowsPurged ?? 0;
            tgt.batchOverrunLastRun = Boolean(pp.batchOverrun);
          }
        }
      }
    }

    const nextScheduledAt = lastRun
      ? new Date(Date.parse(lastRun) + DEFAULT_CADENCE_HOURS * 3600 * 1000).toISOString()
      : null;

    ClientLogger.info(`[audit.retention] fetched actor=${context.userId} lastRun=${lastRun ?? "none"}`);

    return {
      lastRun,
      nextScheduledAt,
      cadenceHours: DEFAULT_CADENCE_HOURS,
      clockSkewMs: 0,
      perPolicy,
      fetchedAt,
    };
  });

/**
 * Plan 20 Step 10: admin-gated write for audit retention policy.
 * Mirrors `selectCaptureDevice` (capture.functions.ts): `requireSupabaseAuth`
 * + `requireCaptureAdmin`, errors funnel through `toCaptureError`, every
 * success emits `I_SEC_ADMIN_WRITE` on `settings.audit.retention` with
 * prior/next JSON. Denials propagate as `E_SEC_ROLE_DENIED`.
 */

export type RetentionPolicyPayload = {
  enabled: boolean;
  policy: AuditRetentionPolicy;
  cadenceHours: number;
};

const CADENCE_MIN = 1;
const CADENCE_MAX = 168;

function parseRetentionPayload(input: unknown): RetentionPolicyPayload {
  if (typeof input !== "object" || input === null) {
    throw new Error("E_CFG_INVALID_RETENTION: payload must be an object");
  }

  const raw = input as Record<string, unknown>;

  if (typeof raw.enabled !== "boolean") {
    throw new Error("E_CFG_INVALID_RETENTION: enabled must be boolean");
  }

  if (typeof raw.policy !== "string" || !(raw.policy in WINDOW_DAYS)) {
    throw new Error(`E_CFG_INVALID_RETENTION: policy must be one of ${POLICIES.join(", ")}`);
  }

  if (
    typeof raw.cadenceHours !== "number" ||
    Number.isInteger(raw.cadenceHours) === false ||
    raw.cadenceHours < CADENCE_MIN ||
    raw.cadenceHours > CADENCE_MAX
  ) {
    throw new Error(
      `E_CFG_INVALID_RETENTION: cadenceHours must be integer in [${CADENCE_MIN}, ${CADENCE_MAX}]`,
    );
  }

  return {
    enabled: raw.enabled,
    policy: raw.policy as AuditRetentionPolicy,
    cadenceHours: raw.cadenceHours,
  };
}

let lastPolicy: RetentionPolicyPayload | null = null;

export const readRetentionPolicy = createServerFn({ method: HttpMethod.Get })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RetentionPolicyPayload | null> => {
    await requireCaptureAdmin(context.userId, "settings.audit.retention");

    return lastPolicy;
  });

export const writeRetentionPolicy = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .validator(parseRetentionPayload)
  .handler(async ({ data, context }) => {
    const cid = newCorrelationId();
    ClientLogger.info(`[audit.retention.write] subject=settings.audit.retention cid=${cid} phase=start`);
    try {
      const actor = await requireCaptureAdmin(context.userId, "settings.audit.retention");
      const prior = lastPolicy;
      lastPolicy = data;
      appendOpsEvent({
        code: OpsEventCodeType.I_SEC_ADMIN_WRITE,
        subject: "settings.audit.retention",
        actor,
        prior: prior ? JSON.stringify(prior) : "",
        next: JSON.stringify(data),
        correlationId: cid,
        detail: `actor=${actor} cid=${cid}`,
      });
      ClientLogger.info(
        `[audit.retention.write] cid=${cid} phase=ok actor=${actor} policy=${data.policy} cadence=${data.cadenceHours}`,
      );

      return {
        ok: true as const,
        subject: "settings.audit.retention" as const,
        prior,
        next: data,
        correlationId: cid,
      };
    } catch (err) {
      const ce = toCaptureError(err, cid);
      const denialCode: OpsEventCodeType =
        ce.code === "E_SEC_DENIED" || ce.code === "E_SEC_UNAUTH"
          ? OpsEventCodeType.E_SEC_ROLE_DENIED
          : OpsEventCodeType.E_SEC_RETENTION_FAILED;
      try {
        appendOpsEvent({
          code: denialCode,
          subject: "settings.audit.retention",
          actor: context.userId ?? "unknown",
          correlationId: cid,
          detail: `code=${ce.code} message=${ce.message}`,
        });
      } catch (emitErr) {
        ClientLogger.error(`[audit.retention.write] cid=${cid} ops_emit_failed`, emitErr);
      }

      ClientLogger.warn(`[audit.retention.write] cid=${cid} code=${ce.code} message=${ce.message}`);

      throw ce;
    }
  });
