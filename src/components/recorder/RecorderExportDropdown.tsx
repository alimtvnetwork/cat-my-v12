import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Download,
  FileCode,
  Bot,
  Mail,
  HardDrive,
  CloudUpload,
  Terminal,
  FolderCode,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { HttpMethod } from "@/lib/constants";
import { resolveBackendBaseUrl } from "@/lib/errors/history-facade";
import { useErrorStore } from "@/lib/stores/errorStore";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { exportSessionToZip } from "@/lib/recorder/zip-builder";
import {
  generateV6LetterlyPrompt,
  generateV7LetterlyPrompt,
} from "@/lib/recorder/prompt-v6-v7-builder";
import {
  checkSupabaseStorageQuota,
  loadSupabaseConfig,
  purgeExpiredSupabaseData,
  uploadBugReportToSupabase,
} from "@/services/telemetry/supabase-client";
import type { BugReportSummary, RecorderSession } from "@/lib/recorder/types";

export interface RecorderExportDropdownProps {
  session: RecorderSession;
  summary: BugReportSummary;
  onOpenEmailModal: () => void;
  onPrimaryClick?: () => void;
  className?: string;
  isCompact?: boolean;
  placement?: "top" | "bottom";
}

interface DropdownItem {
  id: string;
  label: string;
  sublabel: string;
  shortcut: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  action: () => Promise<void> | void;
  isLoading: boolean;
}

export function RecorderExportDropdown({
  session,
  summary,
  onOpenEmailModal,
  onPrimaryClick,
  className = "",
  isCompact = false,
  placement = "top",
}: RecorderExportDropdownProps): React.JSX.Element {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false);
  const [isUploadingSupabase, setIsUploadingSupabase] = useState(false);
  const [isCopyingPrompt, setIsCopyingPrompt] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }

      setIsDropdownOpen(false);
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const executeItemAction = async (item: DropdownItem): Promise<void> => {
    try {
      await item.action();
    } finally {
      setIsDropdownOpen(false);
    }
  };

  const handleExportZip = async (): Promise<void> => {
    setIsExportingZip(true);

    try {
      toast.info("Generating ZIP bundle with snapshots and telemetry...");
      const result = await exportSessionToZip(session, summary);

      const clipboardPayload = [
        `# Bug Report Archive: ${result.filename}`,
        `Archive Path: ${result.downloadPath}`,
        "",
        "## PowerShell Extraction Command:",
        result.extractionCommand,
        "",
        "## AI Execution Directive:",
        result.aiInstructions,
      ].join("\n");

      try {
        await navigator.clipboard.writeText(clipboardPayload);
        toast.success("ZIP exported! Download path & extraction command copied to clipboard.");
      } catch {
        toast.success(`ZIP exported to ${result.filename}!`);
      }
    } catch (err) {
      toast.error(`ZIP export failed: ${String(err)}`);
    } finally {
      setIsExportingZip(false);
      setIsDropdownOpen(false);
    }
  };

  const handleSaveLocal = async (): Promise<boolean> => {
    setIsSavingLocal(true);
    const effectiveUrl = resolveBackendBaseUrl() || "http://127.0.0.1:8787";

    try {
      const payload = {
        session_id: session.id,
        initialRoute: session.initialRoute,
        summary,
        screenshots: session.screenshots,
        events: session.events,
      };

      let res = await fetch(`${effectiveUrl}/bug-reports/local`, {
        method: HttpMethod.Post,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch("/bug-reports/local", {
          method: HttpMethod.Post,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => null);
      }

      if (!res || !res.ok) {
        res = await fetch(`${effectiveUrl}/bug-reports/save-local`, {
          method: HttpMethod.Post,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        const savedDir = data?.Results?.[0]?.savedDir || `.logs/recorded-bugs/${session.id}`;
        toast.success(`Saved bug report and ${session.screenshots.length} snapshots to ${savedDir}!`);

        return true;
      }

      toast.error("Failed to persist bug report to local machine directory");
    } catch (err) {
      toast.error(`Local persistence error: ${String(err)}`);
    } finally {
      setIsSavingLocal(false);
      setIsDropdownOpen(false);
    }

    return false;
  };

  const handleCopyPromptV6 = async (): Promise<void> => {
    setIsCopyingPrompt(true);

    try {
      void handleSaveLocal();

      const splitDbErrors = useErrorStore.getState().history;
      const promptText = generateV6LetterlyPrompt(session, {
        summary,
        splitDbErrors,
      });

      await navigator.clipboard.writeText(promptText);
      toast.success("Copied GitMap Letterly V6 Prompt to clipboard!");
    } catch {
      toast.info("V6 Prompt generated (clipboard write restricted)");
    } finally {
      setIsCopyingPrompt(false);
      setIsDropdownOpen(false);
    }
  };

  const handleCopyPromptV7 = async (): Promise<void> => {
    setIsCopyingPrompt(true);

    try {
      void handleSaveLocal();

      const splitDbErrors = useErrorStore.getState().history;
      const promptText = generateV7LetterlyPrompt(session, {
        summary,
        splitDbErrors,
      });

      await navigator.clipboard.writeText(promptText);
      toast.success("Copied GitMap Letterly V7 Prompt to clipboard!");
    } catch {
      toast.info("V7 Prompt generated (clipboard write restricted)");
    } finally {
      setIsCopyingPrompt(false);
      setIsDropdownOpen(false);
    }
  };

  const handleOpenEmail = (): void => {
    setIsDropdownOpen(false);
    onOpenEmailModal();
  };

  const handleUploadSupabase = async (): Promise<void> => {
    setIsUploadingSupabase(true);

    try {
      const config = loadSupabaseConfig();
      const estimatedBytes = session.screenshots.length * 500 * 1024;
      const quotaCheck = await checkSupabaseStorageQuota(config, estimatedBytes);

      if (!quotaCheck.isWithinQuota) {
        toast.error(
          `Supabase storage quota limit reached (${Math.round(quotaCheck.currentBytes / (1024 * 1024))}MB / 450MB). Auto-retention pruning will purge records older than 14 days.`,
        );
        void purgeExpiredSupabaseData(config);
        setIsUploadingSupabase(false);
        setIsDropdownOpen(false);

        return;
      }

      const splitDbErrors = useErrorStore.getState().history;
      const activeRules = useRulesStore.getState().rules;
      const canvasScreenshot =
        session.screenshots.find((s) => s.source === "canvas")?.dataUrl ||
        session.screenshots[0]?.dataUrl;

      const result = await uploadBugReportToSupabase({
        session,
        summary,
        splitDbErrors,
        activeRecipeEnvelope: { rules: activeRules, rulesCount: activeRules.length },
        canvasScreenshot,
        interactionTimeline: session.events,
      });

      if (result.isSuccess) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(`Supabase upload failed: ${String(err)}`);
    } finally {
      setIsUploadingSupabase(false);
      setIsDropdownOpen(false);
    }
  };

  const handleCopyLocalFolderPath = async (): Promise<void> => {
    const relPath = `.logs/recorded-bugs/${session.id}/`;
    const instruction = [
      `# Local Session Directory: ${relPath}`,
      `Inspect telemetry in \`${relPath}session.json\` and screenshots in \`${relPath}screenshots/\`.`,
      `Execute diagnosis using @[execute-parent-task-with-n-steps-v6](file;.agents/skills/execute-parent-task-with-n-steps-v6).`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(instruction);
      toast.success(`Copied local session path (${relPath}) to clipboard!`);
    } catch {
      toast.info(relPath);
    } finally {
      setIsDropdownOpen(false);
    }
  };

  const handleCopyCliCommand = async (): Promise<void> => {
    const cmd = `python -m BE.cli.processing.main errors list --session-id ${session.id} --trace`;

    try {
      await navigator.clipboard.writeText(cmd);
      toast.success(`Copied CLI inspection command: ${cmd}`);
    } catch {
      toast.info(cmd);
    } finally {
      setIsDropdownOpen(false);
    }
  };

  const items: DropdownItem[] = [
    {
      id: "zip",
      label: "Export ZIP Bundle",
      sublabel: "Download archive with snapshots & JSON",
      shortcut: "Ctrl+Z",
      icon: Download,
      iconColor: "text-emerald-400",
      action: handleExportZip,
      isLoading: isExportingZip,
    },
    {
      id: "v6",
      label: "Copy as Prompt (V6)",
      sublabel: "Tree Swarm (A=3, H=2, Cap=6) + Brain roadmap",
      shortcut: "Ctrl+6",
      icon: FileCode,
      iconColor: "text-cyan-400",
      action: handleCopyPromptV6,
      isLoading: isCopyingPrompt,
    },
    {
      id: "v7",
      label: "Copy as Prompt (V7)",
      sublabel: "Dual modes + GitMap telemetry + AI Bot identity",
      shortcut: "Ctrl+7",
      icon: Bot,
      iconColor: "text-purple-400",
      action: handleCopyPromptV7,
      isLoading: isCopyingPrompt,
    },
    {
      id: "email",
      label: "Direct Email",
      sublabel: "Dispatch bug report directly to engineering",
      shortcut: "Ctrl+E",
      icon: Mail,
      iconColor: "text-sky-400",
      action: handleOpenEmail,
      isLoading: false,
    },
    {
      id: "supabase",
      label: "Save to Supabase",
      sublabel: "450MB quota cap · 14-day rolling retention",
      shortcut: "Ctrl+U",
      icon: CloudUpload,
      iconColor: "text-teal-400",
      action: handleUploadSupabase,
      isLoading: isUploadingSupabase,
    },
    {
      id: "local",
      label: "Save to Local Machine",
      sublabel: "Persist to .logs/recorded-bugs/ on disk",
      shortcut: "Ctrl+S",
      icon: HardDrive,
      iconColor: "text-blue-400",
      action: async () => {
        await handleSaveLocal();
      },
      isLoading: isSavingLocal,
    },
    {
      id: "folder",
      label: "Copy Session Folder Path",
      sublabel: "Directory for local AI agents (.logs/recorded-bugs/...)",
      shortcut: "Ctrl+L",
      icon: FolderCode,
      iconColor: "text-amber-400",
      action: handleCopyLocalFolderPath,
      isLoading: false,
    },
    {
      id: "cli",
      label: "Copy CLI Command",
      sublabel: "Query errors in SQLite via terminal",
      shortcut: "Ctrl+C",
      icon: Terminal,
      iconColor: "text-yellow-400",
      action: handleCopyCliCommand,
      isLoading: false,
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (!isDropdownOpen) {
      if (KeyboardKeyType.isEnterOrSpace(e.key) || KeyboardKeyType.isArrowDown(e.key)) {
        e.preventDefault();
        setIsDropdownOpen(true);
        setActiveIndex(0);
      }

      return;
    }

    if (KeyboardKeyType.isEscape(e.key)) {
      e.preventDefault();
      setIsDropdownOpen(false);

      return;
    }

    if (KeyboardKeyType.isArrowDown(e.key)) {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % items.length);

      return;
    }

    if (KeyboardKeyType.isArrowUp(e.key)) {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + items.length) % items.length);

      return;
    }

    if (KeyboardKeyType.isEnterOrSpace(e.key)) {
      e.preventDefault();
      const currentItem = items[activeIndex];

      if (currentItem) {
        void executeItemAction(currentItem);
      }
    }
  };

  const placementClasses = placement === "bottom"
    ? "top-full mt-2"
    : "bottom-full mb-2";

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex items-center ${className}`}
    >
      <div className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 shadow-sm">
        <button
          type="button"
          onClick={onPrimaryClick || handleExportZip}
          disabled={isExportingZip}
          title="Quick Export: ZIP Archive"
          className={`flex items-center gap-1.5 font-medium text-slate-100 hover:bg-slate-700/80 rounded-l-lg transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none disabled:opacity-50 ${
            isCompact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-xs"
          }`}
        >
          {isExportingZip ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
          ) : (
            <Download className="h-3.5 w-3.5 text-emerald-400" />
          )}
          <span>{isExportingZip ? "Exporting..." : "Export ZIP"}</span>
        </button>

        <button
          type="button"
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          title="Choose Export Format"
          className={`border-l border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700/80 rounded-r-lg transition-colors focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none ${
            isCompact ? "p-1" : "p-1.5"
          }`}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              isDropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {isDropdownOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          className={`absolute right-0 ${placementClasses} w-[360px] rounded-xl border border-slate-700 bg-[#0e131f] p-1.5 shadow-2xl backdrop-blur-xl z-[10070] animate-in fade-in zoom-in-95`}
        >
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1 flex items-center justify-between">
            <span>Unified Export Suite</span>
            <span className="text-[9px] text-slate-500 font-mono">{items.length} options</span>
          </div>

          <div className="flex flex-col gap-0.5">
            {items.map((item, index) => {
              const Icon = item.icon;
              const isSelected = activeIndex === index;

              return (
                <button
                  key={item.id}
                  role="menuitem"
                  type="button"
                  onClick={() => void executeItemAction(item)}
                  onMouseEnter={() => setActiveIndex(index)}
                  disabled={item.isLoading}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors disabled:opacity-50 ${
                    isSelected
                      ? "bg-slate-800/90 text-white"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-cyan-400 shrink-0" />
                    ) : (
                      <Icon className={`h-4 w-4 ${item.iconColor} shrink-0`} />
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="font-medium text-slate-100 truncate">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate">
                        {item.sublabel}
                      </span>
                    </div>
                  </div>

                  <span className="shrink-0 text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 bg-slate-900/60">
                    {item.shortcut}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
