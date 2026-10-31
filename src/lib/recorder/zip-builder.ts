import JSZip from "jszip";
import { useProjectStore } from "@/lib/projects/store";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { useValidationStore } from "@/lib/editor/validation-store";
import { generateAllMarkdownReports } from "./report-generator";
import type { BugReportSummary, CapturedScreenshot, RecorderSession } from "./types";

export interface ExportZipResult {
  isSuccess: boolean;
  filename: string;
  blobSize: number;
  downloadPath: string;
  extractionCommand: string;
  aiInstructions: string;
}

function getDiagnostics(): Record<string, unknown> {
  const isBrowser = typeof window !== "undefined";

  return {
    userAgent: isBrowser ? window.navigator.userAgent : "nodejs",
    screenResolution: isBrowser ? `${window.screen.width}x${window.screen.height}` : "unknown",
    viewportSize: isBrowser ? `${window.innerWidth}x${window.innerHeight}` : "unknown",
    language: isBrowser ? window.navigator.language : "en-US",
    timestamp: new Date().toISOString(),
  };
}

function getVisionContext(): Record<string, unknown> {
  const projectStore = useProjectStore.getState();
  const rulesStore = useRulesStore.getState();
  const validationStore = useValidationStore.getState();

  return {
    activeProjectId: Object.keys(projectStore.projects)[0] ?? null,
    projectsCount: Object.keys(projectStore.projects).length,
    activeRulesetId: validationStore.activeRulesetId,
    rulesCount: rulesStore.rules.length,
    validationRuns: validationStore.runs,
  };
}

function attachScreenshots(zip: JSZip, screenshots: readonly CapturedScreenshot[]): void {
  const folder = zip.folder("screenshots");

  if (!folder) {
    return;
  }

  for (const shot of screenshots) {
    const base64Data = shot.dataUrl.replace(/^data:image\/\w+;base64,/, "");
    folder.file(`${shot.id}.png`, base64Data, { base64: true });
  }
}

function buildFilename(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  return `cat-bug-report-${stamp}.zip`;
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export async function exportSessionToZip(
  session: RecorderSession,
  summary?: BugReportSummary,
): Promise<ExportZipResult> {
  const fullSession: RecorderSession = {
    ...session,
    summary: summary ?? session.summary,
  };

  const zip = new JSZip();
  const reports = generateAllMarkdownReports(fullSession);

  zip.file("AI_BUG_REPORT.md", reports.aiInstructions);
  zip.file("README.md", reports.readme);
  zip.file("timeline.md", reports.timeline);
  zip.file("session.json", JSON.stringify(fullSession, null, 2));
  zip.file("events.json", JSON.stringify(fullSession.events, null, 2));
  zip.file("diagnostics.json", JSON.stringify(getDiagnostics(), null, 2));
  zip.file("vision/inspection-context.json", JSON.stringify(getVisionContext(), null, 2));

  attachScreenshots(zip, fullSession.screenshots);

  const filename = buildFilename();
  const blob = await zip.generateAsync({ type: "blob" });

  triggerBrowserDownload(blob, filename);

  const downloadPath = `C:\\Users\\Administrator\\Downloads\\${filename}`;
  const extractionCommand = `Expand-Archive -Path "${downloadPath}" -DestinationPath ".logs/recorded-bugs/${session.id}/" -Force`;
  const aiInstructions = `Follow @[execute-parent-task-with-n-steps-v6] and review .logs/recorded-bugs/${session.id}/AI_BUG_REPORT.md to diagnose and resolve this defect.`;

  const clipboardPayload = [
    `# Bug Report Archive: ${filename}`,
    `Archive Path: ${downloadPath}`,
    "",
    "## PowerShell Extraction Command:",
    extractionCommand,
    "",
    "## AI Execution Directive:",
    aiInstructions,
  ].join("\n");

  if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      void navigator.clipboard.writeText(clipboardPayload);
    } catch {
      // Ignore clipboard restrictions in non-interactive/unfocused environments
    }
  }

  return {
    isSuccess: true,
    filename,
    blobSize: blob.size,
    downloadPath,
    extractionCommand,
    aiInstructions,
  };
}
