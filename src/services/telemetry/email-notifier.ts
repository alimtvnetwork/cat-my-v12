import type { BugReportSummary, RecorderSession } from "@/lib/recorder/types";
import { HttpMethod } from "@/lib/constants";

export interface EmailConfig {
  senderEmail: string;
  recipientEmail: string;
  webhookUrl: string;
  isEnabled: boolean;
  hasOfflineQueue: boolean;
}

export const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  senderEmail: "telemetry@catvision.ai",
  recipientEmail: "support@catvision.ai",
  webhookUrl: "/api/telemetry/email",
  isEnabled: true,
  hasOfflineQueue: true,
};

const STORAGE_KEY = "cat_vision_email_config";
const OFFLINE_QUEUE_KEY = "cat_vision_offline_email_queue";

export interface EmailNotificationPayload {
  session: RecorderSession;
  summary: BugReportSummary;
  splitDbErrors?: unknown[];
  activeRecipeEnvelope?: unknown;
  ticketId?: string;
}

export interface EmailNotificationResult {
  isSuccess: boolean;
  isOfflineQueued: boolean;
  message: string;
}

export interface FormattedEmail {
  subject: string;
  textBody: string;
  htmlBody: string;
}

export function loadEmailConfig(): EmailConfig {
  if (typeof window === "undefined") {
    return DEFAULT_EMAIL_CONFIG;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_EMAIL_CONFIG;
    }

    const parsed = JSON.parse(raw);
    return {
      senderEmail: String(parsed.senderEmail ?? DEFAULT_EMAIL_CONFIG.senderEmail).trim(),
      recipientEmail: String(parsed.recipientEmail ?? DEFAULT_EMAIL_CONFIG.recipientEmail).trim(),
      webhookUrl: String(parsed.webhookUrl ?? DEFAULT_EMAIL_CONFIG.webhookUrl).trim(),
      isEnabled: Boolean(parsed.isEnabled ?? true),
      hasOfflineQueue: Boolean(parsed.hasOfflineQueue ?? true),
    };
  } catch {
    return DEFAULT_EMAIL_CONFIG;
  }
}

export function saveEmailConfig(config: EmailConfig): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function getOfflineEmailQueueCount(): number {
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

function enqueueOfflineEmail(item: unknown): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY) ?? "[]";
    const queue = JSON.parse(raw);
    queue.push({ payload: item, queuedAt: new Date().toISOString() });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue.slice(-50)));
  } catch {
    // Local storage full or unavailable
  }
}

export function formatEmailNotification(payload: EmailNotificationPayload): FormattedEmail {
  const ticketRef = payload.ticketId ? ` [${payload.ticketId}]` : "";
  const subject = `[Cat Vision Bug Report]${ticketRef} ${payload.summary.title || "UI Issue"}`;

  const errorCount = Array.isArray(payload.splitDbErrors) ? payload.splitDbErrors.length : 0;
  const hasRecipe = Boolean(payload.activeRecipeEnvelope);

  const textBody = `Cat Vision Telemetry Bug Notification
======================================
Ticket: ${payload.ticketId || "Pending"}
Title: ${payload.summary.title || "Untitled Issue"}
Category: ${payload.summary.category}
Initial Route: ${payload.session.initialRoute}
Events Captured: ${payload.session.events.length}
Screenshots: ${payload.session.screenshots.length}
SplitDB Errors: ${errorCount}
Has Active Recipe: ${hasRecipe ? "Yes" : "No"}

Expected Behavior:
${payload.summary.expectedBehavior || "N/A"}

Actual Behavior:
${payload.summary.actualBehavior || "N/A"}

Description:
${payload.summary.description || "N/A"}

Timestamp: ${new Date().toISOString()}
`;

  const htmlBody = `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <h2 style="color: #0284c7; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
    Cat Vision Bug Report ${payload.ticketId ? `<small style="font-size: 14px; color: #64748b;">(${payload.ticketId})</small>` : ""}
  </h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding: 6px; font-weight: bold; width: 140px;">Title:</td><td>${payload.summary.title || "Untitled Issue"}</td></tr>
    <tr><td style="padding: 6px; font-weight: bold;">Category:</td><td>${payload.summary.category}</td></tr>
    <tr><td style="padding: 6px; font-weight: bold;">Route:</td><td><code>${payload.session.initialRoute}</code></td></tr>
    <tr><td style="padding: 6px; font-weight: bold;">Captured Events:</td><td>${payload.session.events.length}</td></tr>
    <tr><td style="padding: 6px; font-weight: bold;">Screenshots:</td><td>${payload.session.screenshots.length}</td></tr>
    <tr><td style="padding: 6px; font-weight: bold;">SplitDB Errors:</td><td>${errorCount}</td></tr>
  </table>
  <h3 style="color: #334155;">Expected:</h3>
  <p style="background: #f8fafc; padding: 10px; border-radius: 6px; border-left: 3px solid #10b981;">
    ${payload.summary.expectedBehavior || "N/A"}
  </p>
  <h3 style="color: #334155;">Actual:</h3>
  <p style="background: #f8fafc; padding: 10px; border-radius: 6px; border-left: 3px solid #ef4444;">
    ${payload.summary.actualBehavior || "N/A"}
  </p>
  <h3 style="color: #334155;">Description:</h3>
  <p style="background: #f8fafc; padding: 10px; border-radius: 6px;">
    ${payload.summary.description || "N/A"}
  </p>
</div>
  `.trim();

  return { subject, textBody, htmlBody };
}

export async function dispatchBugReportEmail(
  payload: EmailNotificationPayload,
): Promise<EmailNotificationResult> {
  const config = loadEmailConfig();
  const formatted = formatEmailNotification(payload);

  const emailData = {
    sender: config.senderEmail,
    recipient: config.recipientEmail,
    subject: formatted.subject,
    text: formatted.textBody,
    html: formatted.htmlBody,
    ticketId: payload.ticketId,
    createdAt: new Date().toISOString(),
  };

  if (!config.isEnabled) {
    if (config.hasOfflineQueue) {
      enqueueOfflineEmail(emailData);
    }
    return {
      isSuccess: true,
      isOfflineQueued: true,
      message: "Email notifications are disabled; message stored in offline queue.",
    };
  }

  try {
    const res = await fetch(config.webhookUrl, {
      method: HttpMethod.Post,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(emailData),
    });

    if (res.ok) {
      return {
        isSuccess: true,
        isOfflineQueued: false,
        message: "Email notification dispatched successfully!",
      };
    }

    if (config.hasOfflineQueue) {
      enqueueOfflineEmail(emailData);
    }
    return {
      isSuccess: true,
      isOfflineQueued: true,
      message: `Email endpoint unavailable (HTTP ${res.status}); queued for delivery.`,
    };
  } catch {
    if (config.hasOfflineQueue) {
      enqueueOfflineEmail(emailData);
    }
    return {
      isSuccess: true,
      isOfflineQueued: true,
      message: "Network offline: bug notification email queued in local database.",
    };
  }
}
