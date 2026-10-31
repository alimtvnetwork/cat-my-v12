import type { BugReportSummary, RecorderSession } from "@/lib/recorder/types";
import { HttpMethod } from "@/lib/constants";
import {
  MAX_STORAGE_BYTES,
  MAX_SUPABASE_QUOTA_BYTES,
  DEFAULT_RETENTION_DAYS,
  RETENTION_WINDOW_MS,
  STORAGE_KEY,
  OFFLINE_QUEUE_KEY,
  USAGE_TRACKER_KEY,
  getTrackedUsageBytes,
  recordUsageBytesDelta,
  fetchSupabaseStorageUsage,
  pruneExpiredSupabaseRecords,
  checkSupabaseQuota,
  type SupabaseStorageStatus,
  type SupabasePruningResult,
  type SupabaseQuotaCheckResult,
} from "./supabase-retention";

export {
  MAX_STORAGE_BYTES,
  MAX_SUPABASE_QUOTA_BYTES,
  DEFAULT_RETENTION_DAYS,
  RETENTION_WINDOW_MS,
  fetchSupabaseStorageUsage,
  pruneExpiredSupabaseRecords,
  checkSupabaseQuota,
  type SupabaseStorageStatus,
  type SupabasePruningResult,
  type SupabaseQuotaCheckResult,
};

export const SUPABASE_RETENTION_DAYS = DEFAULT_RETENTION_DAYS;

export interface SupabaseConfig {
  supabaseUrl: string;
  publishableKey: string;
  bucketName: string;
  isEnabled: boolean;
  hasAutoSync: boolean;
}

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  supabaseUrl: "https://cat-vision-telemetry.supabase.co",
  publishableKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-cat-vision-publishable-key",
  bucketName: "cat-vision-telemetry",
  isEnabled: true,
  hasAutoSync: true,
};

export interface SupabaseBugReportPayload {
  session: RecorderSession;
  summary: BugReportSummary;
  splitDbErrors?: unknown[];
  activeRecipeEnvelope?: unknown;
  canvasScreenshot?: string;
  interactionTimeline?: unknown[];
}

export interface SupabaseUploadResult {
  isSuccess: boolean;
  isOfflineQueued: boolean;
  ticketId?: string;
  message: string;
}

export interface SupabaseTestResult {
  isSuccess: boolean;
  message: string;
}

export interface QuotaCheckResult {
  isWithinQuota: boolean;
  currentBytes: number;
  maxBytes: number;
  message?: string;
}

export function loadSupabaseConfig(): SupabaseConfig {
  if (typeof window === "undefined") {
    return DEFAULT_SUPABASE_CONFIG;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_SUPABASE_CONFIG;
    }

    const parsed = JSON.parse(raw);

    return {
      supabaseUrl: String(parsed.supabaseUrl ?? DEFAULT_SUPABASE_CONFIG.supabaseUrl).trim(),
      publishableKey: String(
        parsed.publishableKey ?? DEFAULT_SUPABASE_CONFIG.publishableKey,
      ).trim(),
      bucketName: String(parsed.bucketName ?? DEFAULT_SUPABASE_CONFIG.bucketName).trim(),
      isEnabled: Boolean(parsed.isEnabled ?? true),
      hasAutoSync: Boolean(parsed.hasAutoSync ?? true),
    };
  } catch {
    return DEFAULT_SUPABASE_CONFIG;
  }
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getOfflineSupabaseQueueCount(): number {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);

    if (!raw) {
      return 0;
    }

    const list = JSON.parse(raw);

    return Array.isArray(list) ? list.length : 0;
  } catch {
    return 0;
  }
}

function enqueueOfflineReport(ticketId: string, record: unknown): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY) ?? "[]";
    const queue = JSON.parse(raw);
    queue.push({ ticketId, record, queuedAt: new Date().toISOString() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-50)));
  } catch {
    // Local storage full or unavailable; safe ignore.
  }
}

export async function purgeExpiredSupabaseData(config: SupabaseConfig): Promise<number> {
  const result = await pruneExpiredSupabaseRecords({
    retentionDays: DEFAULT_RETENTION_DAYS,
    config,
  });

  return result.deletedReportsCount + result.deletedAttachmentsCount;
}

export async function checkSupabaseStorageQuota(
  config: SupabaseConfig,
  additionalBytes: number,
): Promise<QuotaCheckResult> {
  const quota = await checkSupabaseQuota(additionalBytes, {
    config,
    hasAutoPrune: false,
  });

  return {
    isWithinQuota: quota.isAllowed,
    currentBytes: quota.currentUsageBytes,
    maxBytes: quota.maxBytes,
    message: quota.message,
  };
}

export async function testSupabaseConnection(config: SupabaseConfig): Promise<SupabaseTestResult> {
  const url = config.supabaseUrl.trim().replace(/\/+$/, "");
  const key = config.publishableKey.trim();

  if (!url) {
    return { isSuccess: false, message: "Supabase URL is required." };
  }

  if (!key) {
    return { isSuccess: false, message: "Publishable Key is required." };
  }

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: HttpMethod.Get,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (res.status === 401) {
      return { isSuccess: false, message: "Unauthorized: Invalid Supabase Publishable Key." };
    }

    return {
      isSuccess: true,
      message: `Connected successfully to Supabase (HTTP ${res.status}).`,
    };
  } catch (err) {
    return {
      isSuccess: false,
      message: err instanceof Error ? err.message : "Network error contacting Supabase endpoint.",
    };
  }
}

function generateTicketId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();

  return `CV-${stamp}-${rand}`;
}

async function uploadArtifactFile(
  config: SupabaseConfig,
  ticketId: string,
  base64DataUrl: string,
): Promise<{ isUploaded: boolean; byteLength: number }> {
  try {
    const base64Content = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/png" });

    const uploadUrl = `${config.supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/${config.bucketName}/${ticketId}/canvas.png`;
    const res = await fetch(uploadUrl, {
      method: HttpMethod.Post,
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
        "Content-Type": "image/png",
        "x-upsert": "true",
      },
      body: blob,
    });

    return { isUploaded: res.ok, byteLength: byteArray.byteLength };
  } catch {
    return { isUploaded: false, byteLength: 0 };
  }
}

export async function uploadBugReportToSupabase(
  payload: SupabaseBugReportPayload,
): Promise<SupabaseUploadResult> {
  const config = loadSupabaseConfig();
  const ticketId = generateTicketId();
  const hasScreenshot = Boolean(payload.canvasScreenshot || payload.session.screenshots.length > 0);

  // 1. Estimate upload payload size (screenshot binary + metadata)
  const estimatedScreenshotBytes = payload.canvasScreenshot
    ? Math.round(payload.canvasScreenshot.length * 0.75)
    : 0;
  const estimatedReportBytes = estimatedScreenshotBytes + 4096;

  // 2. Pre-flight 14-day retention eviction and 450MB quota check
  const quota = await checkSupabaseQuota(estimatedReportBytes, {
    config,
    hasAutoPrune: true,
    retentionDays: SUPABASE_RETENTION_DAYS,
  });

  const reportRecord = {
    ticket_id: ticketId,
    title: payload.summary.title || "Untitled Bug Report",
    category: payload.summary.category,
    expected_behavior: payload.summary.expectedBehavior || "N/A",
    actual_behavior: payload.summary.actualBehavior || "N/A",
    description: payload.summary.description || "N/A",
    initial_route: payload.session.initialRoute,
    events_count: payload.session.events.length,
    split_db_errors: payload.splitDbErrors ?? [],
    active_recipe: payload.activeRecipeEnvelope ?? null,
    has_screenshot: hasScreenshot,
    is_synced: true,
    created_at: new Date().toISOString(),
  };

  // 3. Fallback to offline queue if quota exceeded after pruning
  if (!quota.isAllowed) {
    enqueueOfflineReport(ticketId, reportRecord);

    return {
      isSuccess: false,
      isOfflineQueued: true,
      ticketId,
      message:
        quota.message ||
        "Supabase quota cap (450MB) reached. Older entries will be evicted via 14-day rolling cycle.",
    };
  }

  // 4. Fallback to offline queue if Supabase is disabled in settings
  if (!config.isEnabled) {
    enqueueOfflineReport(ticketId, reportRecord);

    return {
      isSuccess: true,
      isOfflineQueued: true,
      ticketId,
      message: `Supabase sync is disabled. Ticket ${ticketId} saved to offline queue.`,
    };
  }

  // 5. Cloud upload of binary screenshots and PostgREST metadata row
  try {
    let uploadedBytes = 0;

    if (payload.canvasScreenshot) {
      const artifactResult = await uploadArtifactFile(
        config,
        ticketId,
        payload.canvasScreenshot,
      );

      if (artifactResult.isUploaded) {
        uploadedBytes += artifactResult.byteLength;
      }
    }

    const restUrl = `${config.supabaseUrl.replace(/\/+$/, "")}/rest/v1/bug_reports`;
    const res = await fetch(restUrl, {
      method: HttpMethod.Post,
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(reportRecord),
    });

    if (res.ok) {
      recordUsageBytesDelta(uploadedBytes + 2048);

      return {
        isSuccess: true,
        isOfflineQueued: false,
        ticketId,
        message: `Ticket ${ticketId} successfully submitted to Supabase (Quota: <=450MB, 14-day rolling retention active).`,
      };
    }

    // Network responded with non-2xx; queue for offline retry
    enqueueOfflineReport(ticketId, reportRecord);

    return {
      isSuccess: true,
      isOfflineQueued: true,
      ticketId,
      message: `Ticket ${ticketId} queued locally (Supabase responded with HTTP ${res.status}).`,
    };
  } catch {
    enqueueOfflineReport(ticketId, reportRecord);

    return {
      isSuccess: true,
      isOfflineQueued: true,
      ticketId,
      message: `Offline mode active: Ticket ${ticketId} stored in local queue.`,
    };
  }
}
