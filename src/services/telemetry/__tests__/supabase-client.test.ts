// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  MAX_SUPABASE_QUOTA_BYTES,
  SUPABASE_RETENTION_DAYS,
  purgeExpiredSupabaseData,
  checkSupabaseStorageQuota,
  uploadBugReportToSupabase,
  DEFAULT_SUPABASE_CONFIG,
} from "../supabase-client";
import { IssueCategoryType, type RecorderSession } from "@/lib/recorder/types";

const mockSession: RecorderSession = {
  id: "rec-quota-test",
  startedAt: "2026-10-31T12:00:00.000Z",
  durationMs: 15000,
  initialRoute: "/home",
  finalRoute: "/home",
  routeHistory: ["/home"],
  events: [],
  screenshots: [],
};

describe("Supabase Telemetry Client - Quota & 14-day Retention", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it("enforces 450MB quota cap and 14-day retention constants", () => {
    expect(MAX_SUPABASE_QUOTA_BYTES).toBe(450 * 1024 * 1024);
    expect(SUPABASE_RETENTION_DAYS).toBe(14);
  });

  it("purges offline records older than 14 days", async () => {
    const expiredTime = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const freshTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const initialQueue = [
      { ticketId: "CV-OLD-1", queuedAt: expiredTime, record: { title: "Old" } },
      { ticketId: "CV-NEW-1", queuedAt: freshTime, record: { title: "Fresh" } },
    ];
    localStorage.setItem("cat_vision_offline_supabase_queue", JSON.stringify(initialQueue));

    const config = { ...DEFAULT_SUPABASE_CONFIG, isEnabled: false };
    const purged = await purgeExpiredSupabaseData(config);

    expect(purged).toBe(1);

    const remaining = JSON.parse(localStorage.getItem("cat_vision_offline_supabase_queue") || "[]");
    expect(remaining).toHaveLength(1);
    expect(remaining[0].ticketId).toBe("CV-NEW-1");
  });

  it("detects when quota exceeds 450MB limit", async () => {
    const config = { ...DEFAULT_SUPABASE_CONFIG };
    // Simulate current storage usage of 449MB
    localStorage.setItem("cat_vision_supabase_usage_bytes", String(449 * 1024 * 1024));

    // Requesting 2MB will exceed 450MB limit
    const quotaCheck = await checkSupabaseStorageQuota(config, 2 * 1024 * 1024);

    expect(quotaCheck.isWithinQuota).toBe(false);
    expect(quotaCheck.message).toContain("quota exceeded");
    expect(quotaCheck.message).toContain("450MB limit");
    expect(quotaCheck.message).toContain("14-day data eviction");
  });

  it("allows upload within 450MB quota", async () => {
    const config = { ...DEFAULT_SUPABASE_CONFIG };
    localStorage.setItem("cat_vision_supabase_usage_bytes", String(10 * 1024 * 1024));

    const quotaCheck = await checkSupabaseStorageQuota(config, 1 * 1024 * 1024);

    expect(quotaCheck.isWithinQuota).toBe(true);
  });

  it("aborts upload and returns notice when 450MB quota is exceeded", async () => {
    localStorage.setItem("cat_vision_supabase_usage_bytes", String(455 * 1024 * 1024));

    const result = await uploadBugReportToSupabase({
      session: mockSession,
      summary: {
        title: "Test",
        category: IssueCategoryType.UiGlitch,
        description: "Test",
        expectedBehavior: "",
        actualBehavior: "",
      },
    });

    expect(result.isSuccess).toBe(false);
    expect(result.message).toContain("450MB");
  });
});
