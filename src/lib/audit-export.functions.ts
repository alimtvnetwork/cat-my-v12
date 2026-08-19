import { ClientLogger } from "@/lib/observability/client-logger";
import { OpsEventCodeType } from "@/lib/ops.shared";
import { FeatureNameType } from "@/lib/license";
/**
 * Plan 21 Step 6 + v2.0.6.1 durable storage: `exportAuditBundle` streams
 * real rows from `public.audit_events` (spec 72 §72.7) into a JSONL
 * payload, computes sha256, enforces the 256 MiB cap, uploads the blob
 * to the private `audit-bundles` Supabase Storage bucket (admin-only
 * SELECT policy on `storage.objects`), and emits `AuditBundleExported`
 * with the real storage path.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireCaptureAdmin } from "./capture-auth.server";
import { requireServerFeature } from "./license-gate.server";
import { CaptureError } from "./capture.shared";
import { appendOpsEvent } from "./ops.server";
import { HttpMethod } from "@/lib/constants";

const RETENTION_POLICIES = [
  "RetentionShort",
  "RetentionStandard",
  "RetentionLong",
  "RetentionForensic",
] as const;

export type RetentionPolicy = (typeof RETENTION_POLICIES)[number];

const MAX_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_BUNDLE_BYTES = 256 * 1024 * 1024; // 256 MiB per spec §72.7
const DB_PAGE = 1000;

export const ExportAuditBundleInputSchema = z
  .object({
    fromTs: z.string().datetime({ offset: true }),
    toTs: z.string().datetime({ offset: true }),
    policies: z.array(z.enum(RETENTION_POLICIES)).min(1),
    categories: z.array(z.string().min(1)).optional(),
    includeAdminWrite: z.boolean().default(false),
    signed: z.boolean().default(false),
  })
  .strict();

export type ExportAuditBundleInput = z.infer<typeof ExportAuditBundleInputSchema>;

export type ExportAuditBundleResult = {
  bundleId: string;
  eventCount: number;
  bytes: number;
  payloadSha256Prefix8: string;
  storagePath: string;
  signed: boolean;
  correlationId: string;
};

export const CreateAuditBundleDownloadUrlInputSchema = z
  .object({
    storagePath: z.string().min(1),
    expiresInSeconds: z.number().int().min(30).max(300).default(60),
  })
  .strict();

export type CreateAuditBundleDownloadUrlInput = z.infer<
  typeof CreateAuditBundleDownloadUrlInputSchema
>;

export type CreateAuditBundleDownloadUrlResult = {
  signedUrl: string;
  expiresAt: string;
  storagePath: string;
  correlationId: string;
};

function newCorrelationId(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function newBundleId(): string {
  return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : newCorrelationId();
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", buf);

  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export const exportAuditBundle = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ExportAuditBundleInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<ExportAuditBundleResult> => {
    const correlationId = newCorrelationId();

    try {
      await requireCaptureAdmin(context.userId, "audit.export.request");
    } catch {
      appendOpsEvent({
        code: OpsEventCodeType.AuditBundleExportDenied,
        subject: "audit.export",
        actor: context.userId,
        detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_UNAUTHORIZED`,
      });

      throw new CaptureError("E_AUDIT_EXPORT_UNAUTHORIZED", `correlationId=${correlationId}`);
    }

    await requireServerFeature(FeatureNameType.AuditBundleExport).catch(() => {
      appendOpsEvent({
        code: OpsEventCodeType.AuditBundleExportDenied,
        subject: "audit.export",
        actor: context.userId,
        detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_FEATURE_LOCKED feature=AuditBundleExport`,
      });

      throw new CaptureError(
        "E_AUDIT_EXPORT_FEATURE_LOCKED",
        `correlationId=${correlationId} feature=AuditBundleExport`,
      );
    });

    if (data.signed) {
      await requireServerFeature(FeatureNameType.AuditBundleExportSigned).catch(() => {
        appendOpsEvent({
          code: OpsEventCodeType.AuditBundleExportDenied,
          subject: "audit.export",
          actor: context.userId,
          detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_FEATURE_LOCKED feature=AuditBundleExportSigned`,
        });

        throw new CaptureError(
          "E_AUDIT_EXPORT_FEATURE_LOCKED",
          `correlationId=${correlationId} feature=AuditBundleExportSigned`,
        );
      });
    }

    if (data.includeAdminWrite) {
      await requireServerFeature(FeatureNameType.AuditBundleExportAdmin).catch(() => {
        appendOpsEvent({
          code: OpsEventCodeType.AuditBundleExportDenied,
          subject: "audit.export",
          actor: context.userId,
          detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_FEATURE_LOCKED feature=AuditBundleExportAdmin`,
        });

        throw new CaptureError(
          "E_AUDIT_EXPORT_FEATURE_LOCKED",
          `correlationId=${correlationId} feature=AuditBundleExportAdmin`,
        );
      });
    }

    const fromMs = Date.parse(data.fromTs);
    const toMs = Date.parse(data.toTs);

    if (Number.isFinite(fromMs) === false || Number.isFinite(toMs) === false || toMs <= fromMs) {
      throw new CaptureError("E_AUDIT_EXPORT_EMPTY_WINDOW", `correlationId=${correlationId}`);
    }

    if (toMs - fromMs > MAX_WINDOW_MS) {
      appendOpsEvent({
        code: OpsEventCodeType.AuditBundleExportFailed,
        subject: "audit.export",
        actor: context.userId,
        detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_WINDOW_TOO_WIDE`,
      });

      throw new CaptureError("E_AUDIT_EXPORT_WINDOW_TOO_WIDE", `correlationId=${correlationId}`);
    }

    appendOpsEvent({
      code: OpsEventCodeType.AuditBundleExportRequested,
      subject: "audit.export",
      actor: context.userId,
      detail: `correlationId=${correlationId} fromTs=${data.fromTs} toTs=${data.toTs} policies=${data.policies.join(",")} signed=${data.signed}`,
    });

    const bundleId = newBundleId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const enc = new TextEncoder();
    const lines: Uint8Array[] = [];
    let byteLen = 0;
    let eventCount = 0;
    let cursorTs = data.fromTs;
    let cursorId: string | null = null;

    // Page in (ts ASC, event_id ASC) order per spec §72.7. `.gte(ts)` +
    // client-side tiebreak on event_id is safe since Supabase returns the
    // same ordering as the covering index.
    // Loop until fewer than DB_PAGE rows returned.
    // The size cap trips inside the loop.
    while (true) {
      let q = supabaseAdmin
        .from("audit_events")
        .select("event_id, ts, code, policy, correlation_id, actor, payload, schema_version")
        .in("policy", data.policies)
        .gte("ts", cursorTs)
        .lt("ts", data.toTs)
        .order("ts", { ascending: true })
        .order("event_id", { ascending: true })
        .limit(DB_PAGE);

      if (data.categories && data.categories.length > 0) {
        q = q.in("code", data.categories);
      }

      if (!data.includeAdminWrite) {
        q = q.neq("code", "I_SEC_ADMIN_WRITE");
      }

      const { data: rows, error } = await q;

      if (error) {
        ClientLogger.error(`[audit.export] query_failed correlationId=${correlationId}`, error);
        appendOpsEvent({
          code: OpsEventCodeType.AuditBundleExportFailed,
          subject: "audit.export",
          actor: context.userId,
          detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_SCHEMA_UNSUPPORTED`,
        });

        throw new CaptureError(
          "E_AUDIT_EXPORT_SCHEMA_UNSUPPORTED",
          `correlationId=${correlationId}`,
        );
      }

      if (!rows || rows.length === 0) break;

      let advanced = 0;
      for (const row of rows) {
        // Skip rows we already emitted (same ts as previous cursor, id <= cursorId).
        if (cursorId && row.ts === cursorTs && String(row.event_id) <= cursorId) continue;
        const line = enc.encode(JSON.stringify(row) + "\n");

        if (byteLen + line.byteLength > MAX_BUNDLE_BYTES) {
          appendOpsEvent({
            code: OpsEventCodeType.AuditBundleExportFailed,
            subject: "audit.export",
            actor: context.userId,
            detail: `correlationId=${correlationId} bundleId=${bundleId} ReasonCodeType=E_AUDIT_EXPORT_SIZE_CAP bytes=${byteLen} count=${eventCount}`,
          });

          throw new CaptureError(
            "E_AUDIT_EXPORT_SIZE_CAP",
            `correlationId=${correlationId} bundleId=${bundleId} bytes=${byteLen}`,
          );
        }

        lines.push(line);
        byteLen += line.byteLength;
        eventCount += 1;
        cursorTs = row.ts as string;
        cursorId = String(row.event_id);
        advanced += 1;
      }

      if (rows.length < DB_PAGE) break;

      if (advanced === 0) break; // safety: no progress
    }

    if (eventCount === 0) {
      appendOpsEvent({
        code: OpsEventCodeType.AuditBundleExportFailed,
        subject: "audit.export",
        actor: context.userId,
        detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_EMPTY_WINDOW bundleId=${bundleId}`,
      });

      throw new CaptureError(
        "E_AUDIT_EXPORT_EMPTY_WINDOW",
        `correlationId=${correlationId} bundleId=${bundleId}`,
      );
    }

    // Concatenate for hashing. Chunking to 4 MiB is a stream-writer detail
    // deferred with durable file storage; the hash + byte count over the
    // full payload are the contractually-checked values (§72.7).
    const payload = new Uint8Array(byteLen);
    let off = 0;
    for (const l of lines) {
      payload.set(l, off);
      off += l.byteLength;
    }

    const sha256 = await sha256Hex(payload);

    // Upload to the private `audit-bundles` bucket. Bucket read is admin-
    // only via storage.objects RLS (migration v2.0.6.1). Path is
    // `<bundleId>.catauditjsonl` so it is stable per bundle id.
    const objectPath = `${bundleId}.catauditjsonl`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("audit-bundles")
      .upload(objectPath, payload, {
        contentType: "application/x-ndjson",
        upsert: false,
      });

    if (uploadError) {
      ClientLogger.error(
        `[audit.export] upload_failed correlationId=${correlationId}`,
        uploadError,
      );
      appendOpsEvent({
        code: OpsEventCodeType.AuditBundleExportFailed,
        subject: "audit.export",
        actor: context.userId,
        detail: `correlationId=${correlationId} bundleId=${bundleId} ReasonCodeType=E_AUDIT_EXPORT_STORAGE_FAILED bytes=${byteLen}`,
      });

      throw new CaptureError(
        "E_AUDIT_EXPORT_STORAGE_FAILED",
        `correlationId=${correlationId} bundleId=${bundleId} err=${uploadError.message}`,
      );
    }

    const storagePath = `supabase://audit-bundles/${objectPath}`;

    appendOpsEvent({
      code: OpsEventCodeType.AuditBundleExported,
      subject: "audit.export",
      actor: context.userId,
      detail: `correlationId=${correlationId} bundleId=${bundleId} bytes=${byteLen} count=${eventCount} sha256=${sha256} storagePath=${storagePath}`,
    });

    ClientLogger.info(
      `[audit.export] ok correlationId=${correlationId} bundleId=${bundleId} bytes=${byteLen} count=${eventCount} sha256=${sha256.slice(0, 16)}`,
    );

    return {
      bundleId,
      eventCount,
      bytes: byteLen,
      payloadSha256Prefix8: sha256.slice(0, 16),
      storagePath,
      signed: data.signed,
      correlationId,
    };
  });

export const createAuditBundleDownloadUrl = createServerFn({ method: HttpMethod.Post })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateAuditBundleDownloadUrlInputSchema.parse(input))
  .handler(async ({ data, context }): Promise<CreateAuditBundleDownloadUrlResult> => {
    const correlationBytes = new Uint8Array(6);
    crypto.getRandomValues(correlationBytes);
    const correlationId = Array.from(correlationBytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );

    try {
      await requireCaptureAdmin(context.userId, "audit.export.download_url");
    } catch {
      appendOpsEvent({
        code: OpsEventCodeType.AuditBundleExportDenied,
        subject: "audit.export.download_url",
        actor: context.userId,
        detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_UNAUTHORIZED`,
      });

      throw new CaptureError("E_AUDIT_EXPORT_UNAUTHORIZED", `correlationId=${correlationId}`);
    }

    await requireServerFeature(FeatureNameType.AuditBundleExportSigned).catch(() => {
      appendOpsEvent({
        code: OpsEventCodeType.AuditBundleExportDenied,
        subject: "audit.export.download_url",
        actor: context.userId,
        detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_FEATURE_LOCKED feature=AuditBundleExportSigned`,
      });

      throw new CaptureError(
        "E_AUDIT_EXPORT_FEATURE_LOCKED",
        `correlationId=${correlationId} feature=AuditBundleExportSigned`,
      );
    });

    const prefix = "supabase://audit-bundles/";

    if (data.storagePath.startsWith(prefix) === false) {
      appendOpsEvent({
        code: OpsEventCodeType.AuditBundleExportFailed,
        subject: "audit.export.download_url",
        actor: context.userId,
        detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_BAD_PATH`,
      });

      throw new CaptureError("E_AUDIT_EXPORT_BAD_PATH", `correlationId=${correlationId}`);
    }

    const objectPath = data.storagePath.slice(prefix.length);
    const safePath = /^[0-9a-fA-F-]{36}\.catauditjsonl$/.test(objectPath);

    if (!safePath) {
      appendOpsEvent({
        code: OpsEventCodeType.AuditBundleExportFailed,
        subject: "audit.export.download_url",
        actor: context.userId,
        detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_BAD_PATH`,
      });

      throw new CaptureError("E_AUDIT_EXPORT_BAD_PATH", `correlationId=${correlationId}`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("audit-bundles")
      .createSignedUrl(objectPath, data.expiresInSeconds, { download: objectPath });

    if (error || !signed?.signedUrl) {
      ClientLogger.error(
        `[audit.export] signed_url_failed correlationId=${correlationId} objectPath=${objectPath}`,
        error,
      );
      appendOpsEvent({
        code: OpsEventCodeType.AuditBundleExportFailed,
        subject: "audit.export.download_url",
        actor: context.userId,
        detail: `correlationId=${correlationId} ReasonCodeType=E_AUDIT_EXPORT_SIGNED_URL_FAILED storagePath=${data.storagePath}`,
      });

      throw new CaptureError("E_AUDIT_EXPORT_SIGNED_URL_FAILED", `correlationId=${correlationId}`);
    }

    const expiresAt = new Date(Date.now() + data.expiresInSeconds * 1000).toISOString();
    appendOpsEvent({
      code: OpsEventCodeType.AuditBundleDownloadUrlIssued,
      subject: "audit.export.download_url",
      actor: context.userId,
      detail: `correlationId=${correlationId} storagePath=${data.storagePath} expiresInSeconds=${data.expiresInSeconds}`,
    });
    ClientLogger.info(
      `[audit.export] signed_url_ok correlationId=${correlationId} objectPath=${objectPath}`,
    );

    return {
      signedUrl: signed.signedUrl,
      expiresAt,
      storagePath: data.storagePath,
      correlationId,
    };
  });
