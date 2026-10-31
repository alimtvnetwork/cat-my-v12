import { HttpMethod } from "@/lib/constants";

export const MAX_STORAGE_BYTES = 450 * 1024 * 1024; // 450MB (471,859,200 bytes)
export const MAX_SUPABASE_QUOTA_BYTES = MAX_STORAGE_BYTES;
export const DEFAULT_RETENTION_DAYS = 14;
export const RETENTION_WINDOW_MS = DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const STORAGE_KEY = "cat_vision_supabase_config";
export const OFFLINE_QUEUE_KEY = "cat_vision_offline_supabase_queue";
export const USAGE_TRACKER_KEY = "cat_vision_supabase_usage_bytes";
export const ESTIMATED_ROW_OVERHEAD_BYTES = 8192;

export interface SupabaseConfigLike {
  supabaseUrl: string;
  publishableKey: string;
  bucketName: string;
  isEnabled: boolean;
  hasAutoSync: boolean;
}

export interface SupabaseStorageStatus {
  totalBytes: number;
  quotaBytes: number;
  isQuotaExceeded: boolean;
  availableBytes: number;
  usagePercentage: number;
  attachmentBytes?: number;
  reportCount?: number;
}

export interface SupabasePruningResult {
  isPruned: boolean;
  deletedReportsCount: number;
  deletedAttachmentsCount: number;
  freedBytes: number;
  cutoffIso: string;
}

export interface SupabaseQuotaCheckResult {
  isAllowed: boolean;
  currentUsageBytes: number;
  maxBytes: number;
  isPruned: boolean;
  availableBytes: number;
  message?: string;
  pruningResult?: SupabasePruningResult;
}

export interface SupabaseQuotaOptions {
  config?: SupabaseConfigLike;
  hasAutoPrune?: boolean;
  retentionDays?: number;
}

export function getTrackedUsageBytes(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = localStorage.getItem(USAGE_TRACKER_KEY);

    if (!raw) {
      return 0;
    }

    const parsed = Number(raw);

    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  } catch {
    return 0;
  }
}

export function recordUsageBytesDelta(deltaBytes: number): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const current = getTrackedUsageBytes();
    const updated = Math.max(0, current + deltaBytes);
    localStorage.setItem(USAGE_TRACKER_KEY, String(updated));
  } catch {
    // Local storage quota safe ignore
  }
}

export function loadStoredSupabaseConfig(): SupabaseConfigLike | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    return {
      supabaseUrl: String(parsed.supabaseUrl ?? "").trim(),
      publishableKey: String(parsed.publishableKey ?? "").trim(),
      bucketName: String(parsed.bucketName ?? "cat-vision-telemetry").trim(),
      isEnabled: Boolean(parsed.isEnabled ?? true),
      hasAutoSync: Boolean(parsed.hasAutoSync ?? true),
    };
  } catch {
    return null;
  }
}

export async function fetchSupabaseStorageUsage(
  config?: SupabaseConfigLike,
): Promise<SupabaseStorageStatus> {
  const activeConfig = config ?? loadStoredSupabaseConfig();
  let currentBytes = getTrackedUsageBytes();
  let attachmentBytes = 0;
  let reportCount = 0;

  if (activeConfig && activeConfig.isEnabled && activeConfig.supabaseUrl && activeConfig.publishableKey) {
    const baseUrl = activeConfig.supabaseUrl.replace(/\/+$/, "");

    // 1. Attempt RPC call for server-calculated storage usage
    try {
      const rpcRes = await fetch(`${baseUrl}/rest/v1/rpc/get_telemetry_storage_usage`, {
        method: HttpMethod.Post,
        headers: {
          apikey: activeConfig.publishableKey,
          Authorization: `Bearer ${activeConfig.publishableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (rpcRes.ok) {
        const data = (await rpcRes.json()) as Record<string, unknown>;

        if (typeof data.total_bytes === "number") {
          currentBytes = Number(data.total_bytes);
          attachmentBytes = Number(data.attachment_bytes ?? 0);
          reportCount = Number(data.report_count ?? 0);

          if (typeof window !== "undefined") {
            localStorage.setItem(USAGE_TRACKER_KEY, String(currentBytes));
          }

          const isQuotaExceeded = currentBytes >= MAX_STORAGE_BYTES;
          const availableBytes = Math.max(0, MAX_STORAGE_BYTES - currentBytes);
          const usagePercentage = Math.min(100, Math.round((currentBytes / MAX_STORAGE_BYTES) * 1000) / 10);

          return {
            totalBytes: currentBytes,
            quotaBytes: MAX_STORAGE_BYTES,
            isQuotaExceeded,
            availableBytes,
            usagePercentage,
            attachmentBytes,
            reportCount,
          };
        }
      }
    } catch {
      // RPC not deployed; proceed to fallback query below
    }

    // 2. Fallback: query attachments and reports directly via PostgREST
    try {
      const attRes = await fetch(`${baseUrl}/rest/v1/bug_attachments?select=size_bytes`, {
        method: HttpMethod.Get,
        headers: {
          apikey: activeConfig.publishableKey,
          Authorization: `Bearer ${activeConfig.publishableKey}`,
        },
      });

      if (attRes.ok) {
        const rows = (await attRes.json().catch(() => [])) as Array<{ size_bytes?: number }>;

        if (Array.isArray(rows)) {
          attachmentBytes = rows.reduce((acc, row) => acc + (Number(row.size_bytes) || 0), 0);
          currentBytes = attachmentBytes;
        }
      }

      const repRes = await fetch(`${baseUrl}/rest/v1/bug_reports?select=id`, {
        method: HttpMethod.Get,
        headers: {
          apikey: activeConfig.publishableKey,
          Authorization: `Bearer ${activeConfig.publishableKey}`,
        },
      });

      if (repRes.ok) {
        const repRows = (await repRes.json().catch(() => [])) as unknown[];

        if (Array.isArray(repRows)) {
          reportCount = repRows.length;
          currentBytes += reportCount * ESTIMATED_ROW_OVERHEAD_BYTES;
        }
      }

      if (typeof window !== "undefined") {
        localStorage.setItem(USAGE_TRACKER_KEY, String(currentBytes));
      }
    } catch {
      // Direct size query unavailable; retain current tracked usage
    }
  }

  const isQuotaExceeded = currentBytes >= MAX_STORAGE_BYTES;
  const availableBytes = Math.max(0, MAX_STORAGE_BYTES - currentBytes);
  const usagePercentage = Math.min(100, Math.round((currentBytes / MAX_STORAGE_BYTES) * 1000) / 10);

  return {
    totalBytes: currentBytes,
    quotaBytes: MAX_STORAGE_BYTES,
    isQuotaExceeded,
    availableBytes,
    usagePercentage,
    attachmentBytes,
    reportCount,
  };
}

export async function pruneExpiredSupabaseRecords(
  options?: { retentionDays?: number; config?: SupabaseConfigLike },
): Promise<SupabasePruningResult> {
  const days = options?.retentionDays ?? DEFAULT_RETENTION_DAYS;
  const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffTime).toISOString();
  let deletedReportsCount = 0;
  let deletedAttachmentsCount = 0;
  let freedBytes = 0;

  // 1. Purge local offline queue entries older than retention window
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);

      if (raw) {
        const queue = JSON.parse(raw);

        if (Array.isArray(queue)) {
          const freshItems = queue.filter((item) => {
            const time = item.queuedAt ? new Date(item.queuedAt).getTime() : Date.now();

            return time >= cutoffTime;
          });

          const localDeleted = queue.length - freshItems.length;

          if (localDeleted > 0) {
            deletedReportsCount += localDeleted;
            localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(freshItems));
          }
        }
      }
    } catch {
      // Local queue cleanup error safe ignore
    }
  }

  // 2. Purge remote Supabase records older than retention window
  const activeConfig = options?.config ?? loadStoredSupabaseConfig();

  if (activeConfig && activeConfig.isEnabled && activeConfig.supabaseUrl && activeConfig.publishableKey) {
    const baseUrl = activeConfig.supabaseUrl.replace(/\/+$/, "");

    // 2a. Attempt server-side RPC procedure
    try {
      const rpcRes = await fetch(`${baseUrl}/rest/v1/rpc/prune_expired_bug_reports`, {
        method: HttpMethod.Post,
        headers: {
          apikey: activeConfig.publishableKey,
          Authorization: `Bearer ${activeConfig.publishableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_retention_days: days }),
      });

      if (rpcRes.ok) {
        const rpcData = (await rpcRes.json()) as Record<string, unknown>;
        const repCount = Number(rpcData.deleted_reports_count ?? 0);
        const attCount = Number(rpcData.deleted_attachments_count ?? 0);
        const bytes = Number(rpcData.freed_bytes ?? 0);

        deletedReportsCount += repCount;
        deletedAttachmentsCount += attCount;
        freedBytes += bytes;

        if (bytes > 0) {
          recordUsageBytesDelta(-bytes);
        }

        const isPruned = deletedReportsCount > 0 || deletedAttachmentsCount > 0;

        return {
          isPruned,
          deletedReportsCount,
          deletedAttachmentsCount,
          freedBytes,
          cutoffIso,
        };
      }
    } catch {
      // RPC unavailable; proceed to PostgREST DELETE fallback
    }

    // 2b. Fallback: PostgREST DELETE on bug_reports older than cutoff
    try {
      const deleteUrl = `${baseUrl}/rest/v1/bug_reports?created_at=lt.${cutoffIso}`;
      const res = await fetch(deleteUrl, {
        method: HttpMethod.Delete,
        headers: {
          apikey: activeConfig.publishableKey,
          Authorization: `Bearer ${activeConfig.publishableKey}`,
          Prefer: "return=representation",
        },
      });

      if (res.ok) {
        const deletedRows = (await res.json().catch(() => [])) as unknown[];
        const remoteCount = Array.isArray(deletedRows) ? deletedRows.length : 0;

        if (remoteCount > 0) {
          deletedReportsCount += remoteCount;
          const estimatedFreed = remoteCount * 2 * 1024 * 1024;
          freedBytes += estimatedFreed;
          recordUsageBytesDelta(-estimatedFreed);
        }
      }
    } catch {
      // Network or authorization error on delete; non-blocking
    }
  }

  const isPruned = deletedReportsCount > 0 || deletedAttachmentsCount > 0;

  return {
    isPruned,
    deletedReportsCount,
    deletedAttachmentsCount,
    freedBytes,
    cutoffIso,
  };
}

export async function checkSupabaseQuota(
  newPayloadSizeBytes: number,
  options?: SupabaseQuotaOptions,
): Promise<SupabaseQuotaCheckResult> {
  const activeConfig = options?.config ?? loadStoredSupabaseConfig() ?? undefined;
  let usage = await fetchSupabaseStorageUsage(activeConfig);
  let projectedBytes = usage.totalBytes + newPayloadSizeBytes;
  let isPruned = false;
  let pruningResult: SupabasePruningResult | undefined;

  // If projected usage exceeds 450MB and auto-pruning is enabled, trigger 14-day eviction
  if (projectedBytes > MAX_STORAGE_BYTES && options?.hasAutoPrune !== false) {
    pruningResult = await pruneExpiredSupabaseRecords({
      retentionDays: options?.retentionDays ?? DEFAULT_RETENTION_DAYS,
      config: activeConfig,
    });
    isPruned = pruningResult.isPruned;

    // Re-evaluate usage after 14-day rolling eviction
    usage = await fetchSupabaseStorageUsage(activeConfig);
    projectedBytes = usage.totalBytes + newPayloadSizeBytes;
  }

  const isAllowed = projectedBytes <= MAX_STORAGE_BYTES;
  const availableBytes = Math.max(0, MAX_STORAGE_BYTES - projectedBytes);
  let message: string | undefined;

  if (!isAllowed) {
    const mbProjected = (projectedBytes / (1024 * 1024)).toFixed(1);
    message = `Supabase telemetry quota exceeded: ${mbProjected}MB projected vs 450MB limit. 14-day data eviction applies automatically.`;
  }

  return {
    isAllowed,
    currentUsageBytes: usage.totalBytes,
    maxBytes: MAX_STORAGE_BYTES,
    isPruned,
    availableBytes,
    message,
    pruningResult,
  };
}
