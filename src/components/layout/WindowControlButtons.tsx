import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { HttpMethod } from "@/lib/constants";
import { Minus, Square, Copy, X, AlertTriangle, LogOut } from "lucide-react";
import { toast } from "sonner";

import { useBackendMode } from "@/lib/backend/mode";
import { useRecorderStore } from "@/lib/recorder/recorder-store";
import { getRunLock, RunLockStateType } from "@/lib/rpc/guards";
import { useErrorStore } from "@/lib/stores/errorStore";
import { getAutomationAttrs } from "@/utils/automation-registry";

/**
 * Window controls for the desktop app (spec 54 section 8, spec 04 section 2).
 *
 * Honest browser behavior: this app runs as a browser --app window
 * (Edge/Chrome --app --start-fullscreen), or inside a desktop wrapper.
 *
 * - Minimize: When native bridge exists, minimizes. Otherwise informs user cleanly.
 * - Maximize: Fullscreen toggle with reactive synchronization.
 * - Close: Requests backend shutdown (POST /shutdown), informs user cleanly,
 *   never does window.location.href = "/" which reloads and read as crash.
 *
 * All controls are decorated with automation triad: Id, Name, and XPath.
 */
export const WINDOW_EXIT_REQUEST_EVENT = "cat-vision:request-exit";
export const WINDOW_EXITED_EVENT = "cat-vision:window-exited";

interface DesktopApi {
  minimize?: () => void;
  toggleMaximize?: () => void;
  close?: () => void;
}

function resolveDesktopBridge(): DesktopApi | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const direct = (window as unknown as { desktopApi?: DesktopApi }).desktopApi;

  if (direct) {
    return direct;
  }

  const tauriWindow = (
    window as unknown as {
      __TAURI__?: {
        window?: {
          getCurrent?: () => {
            minimize?: () => void;
            toggleMaximize?: () => void;
            close?: () => void;
          };
        };
      };
    }
  ).__TAURI__?.window?.getCurrent?.();

  if (tauriWindow) {
    return {
      minimize: () => tauriWindow.minimize?.(),
      toggleMaximize: () => tauriWindow.toggleMaximize?.(),
      close: () => tauriWindow.close?.(),
    };
  }

  const electronApi = (window as unknown as { electronAPI?: DesktopApi }).electronAPI;

  if (electronApi) {
    return electronApi;
  }

  return undefined;
}

function readRunningWorkLabel(): string {
  if (typeof document === "undefined") {
    return "";
  }

  const parts: string[] = [];
  const root = document.documentElement;
  const isSimulationActive =
    root.dataset.guidedSimulationRunning === "true" ||
    root.dataset.guidedSimulationLoading === "true";

  if (isSimulationActive) {
    parts.push("the guided simulation");
  }

  if (useRecorderStore.getState().isRecording) {
    parts.push("a bug recording");
  }

  if (RunLockStateType.isRunning(getRunLock())) {
    parts.push("an inspection run");
  }

  return parts.join(" and ");
}

function exitPrompt(runningWorkLabel: string): string {
  const lead = `${runningWorkLabel.charAt(0).toUpperCase()}${runningWorkLabel.slice(1)}`;
  const verb = runningWorkLabel.includes(" and ") ? "are" : "is";

  return `${lead} ${verb} still running. Close Cat Vision anyway?`;
}

export function WindowControlButtons(): React.JSX.Element {
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [runningWorkLabel, setRunningWorkLabel] = useState("");
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [isCloseNoop, setIsCloseNoop] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const baseUrl = useBackendMode((s) => s.baseUrl);

  useEffect(() => {
    const handleFullscreenChange = (): void => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleMinimize = useCallback(() => {
    const desktopApi = resolveDesktopBridge();

    if (desktopApi?.minimize) {
      desktopApi.minimize();

      return;
    }

    fetch(`${baseUrl}/window/minimize`, {
      method: HttpMethod.Post,
    }).catch(() => {});

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});

      return;
    }

    window.dispatchEvent(new CustomEvent("cat-vision:window-minimize"));
  }, [baseUrl]);

  const handleToggleMaximize = useCallback(() => {
    const desktopApi = resolveDesktopBridge();

    if (desktopApi?.toggleMaximize) {
      desktopApi.toggleMaximize();

      return;
    }

    fetch(`${baseUrl}/window/maximize`, {
      method: HttpMethod.Post,
    }).catch(() => {});

    const fullscreenRequest = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();

    fullscreenRequest.catch(() => {
      // Handled by native backend loopback toggle
    });
  }, [baseUrl]);

  const handleConfirmExit = useCallback(() => {
    const desktopApi = resolveDesktopBridge();

    if (desktopApi?.close) {
      desktopApi.close();
      window.dispatchEvent(new CustomEvent(WINDOW_EXITED_EVENT));

      return;
    }

    setIsShuttingDown(true);

    const shutdownController = new AbortController();
    const shutdownTimeout = window.setTimeout(() => shutdownController.abort(), 3000);

    fetch(`${baseUrl}/window/close`, {
      method: HttpMethod.Post,
      signal: shutdownController.signal,
    })
      .catch(() => {
        fetch(`${baseUrl}/shutdown`, {
          method: HttpMethod.Post,
          signal: shutdownController.signal,
        }).catch((err: unknown) => {
          useErrorStore.getState().captureError(
            err,
            {
              endpoint: `${baseUrl}/shutdown`,
              method: HttpMethod.Post,
              triggerComponent: "WindowControlButtons",
              triggerAction: "confirmExit",
              source: "WindowControlButtons",
            },
            "E_WINDOW_SHUTDOWN",
          );
        });
      })
      .finally(() => {
        window.clearTimeout(shutdownTimeout);
        window.dispatchEvent(new CustomEvent(WINDOW_EXITED_EVENT));

        try {
          window.opener = null;
          window.open("", "_self");
          window.close();
        } catch (err: unknown) {
          useErrorStore.getState().captureError(
            err,
            {
              triggerComponent: "WindowControlButtons",
              triggerAction: "confirmExit",
              source: "WindowControlButtons",
            },
            "E_WINDOW_CLOSE",
          );
        }

        window.setTimeout(() => {
          setIsCloseNoop(true);
        }, 500);
      });
  }, [baseUrl]);

  const requestExit = useCallback(() => {
    const runningLabel = readRunningWorkLabel();

    if (runningLabel.length === 0) {
      handleConfirmExit();

      return;
    }

    setRunningWorkLabel(runningLabel);
    setIsExitDialogOpen(true);
  }, [handleConfirmExit]);

  useEffect(() => {
    window.addEventListener(WINDOW_EXIT_REQUEST_EVENT, requestExit);

    return () => {
      window.removeEventListener(WINDOW_EXIT_REQUEST_EVENT, requestExit);
    };
  }, [requestExit]);

  useEffect(() => {
    if (isCloseNoop) {
      toast.info("Cat Vision has stopped background services and is closing.");
    }
  }, [isCloseNoop]);

  const handleDismissShutdown = useCallback(() => {
    setIsExitDialogOpen(false);
    setIsShuttingDown(false);
    setIsCloseNoop(false);
  }, []);

  useEffect(() => {
    if (!isExitDialogOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isShuttingDown) {
          setIsExitDialogOpen(false);
        } else {
          handleDismissShutdown();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExitDialogOpen, isShuttingDown, handleDismissShutdown]);

  const minAttrs = getAutomationAttrs({
    id: "btn-window-minimize",
    name: "Minimize Window",
    parentPath: "//div[@data-testid='window-controls-bar']",
  });

  const maxAttrs = getAutomationAttrs({
    id: "btn-window-maximize",
    name: isFullscreen ? "Restore Window" : "Window Layer or Maximize",
    parentPath: "//div[@data-testid='window-controls-bar']",
  });

  const closeAttrs = getAutomationAttrs({
    id: "btn-window-close",
    name: "Close Application",
    parentPath: "//div[@data-testid='window-controls-bar']",
  });

  return (
    <>
      <div
        data-testid="window-controls-bar"
        className="flex items-center gap-1 border-l border-white/10 pl-2.5 ml-1.5"
      >
        <button
          type="button"
          title="Minimize to taskbar"
          aria-label="Minimize Window"
          onClick={handleMinimize}
          {...minAttrs}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors duration-150 hover:border-white/10 hover:bg-white/10 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
        >
          <Minus className="h-3.5 w-3.5 stroke-[2.2]" />
        </button>

        <button
          type="button"
          title={isFullscreen ? "Restore Window" : "Window layer / Maximize"}
          aria-label={isFullscreen ? "Restore Window" : "Window Layer or Maximize"}
          onClick={handleToggleMaximize}
          {...maxAttrs}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors duration-150 hover:border-white/10 hover:bg-white/10 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400"
        >
          {isFullscreen ? (
            <Copy className="h-3.5 w-3.5 stroke-[1.8]" />
          ) : (
            <Square className="h-3.5 w-3.5 stroke-[1.8]" />
          )}
        </button>

        <button
          type="button"
          title="Exit application"
          aria-label="Close Application"
          onClick={requestExit}
          {...closeAttrs}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-transparent text-slate-400 transition-colors duration-150 hover:border-rose-500/40 hover:bg-rose-600 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
        >
          <X className="h-3.5 w-3.5 stroke-[2.2]" />
        </button>
      </div>

      {isExitDialogOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              className="fixed inset-0 z-[10080] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in"
            >
              <div className="w-full max-w-sm rounded-xl border border-white/15 bg-[#0f172a] p-5 shadow-2xl text-slate-100 animate-in zoom-in-95">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {isShuttingDown ? "Closing Cat Vision…" : "Exit Application?"}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isShuttingDown
                        ? "Shutting down inspection workers and closing application window..."
                        : exitPrompt(runningWorkLabel)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2.5">
                  {isShuttingDown ? (
                    <button
                      type="button"
                      id="btn-dialog-exit-dismiss"
                      data-automation-id="btn-dialog-exit-dismiss"
                      data-automation-name="Dismiss Shutdown"
                      data-automation-xpath="//button[@id='btn-dialog-exit-dismiss']"
                      onClick={handleDismissShutdown}
                      className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                    >
                      Dismiss
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        id="btn-dialog-exit-cancel"
                        data-automation-id="btn-dialog-exit-cancel"
                        data-automation-name="Cancel Exit"
                        data-automation-xpath="//button[@id='btn-dialog-exit-cancel']"
                        onClick={() => setIsExitDialogOpen(false)}
                        className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        id="btn-dialog-exit-confirm"
                        data-automation-id="btn-dialog-exit-confirm"
                        data-automation-name="Confirm Exit Now"
                        data-automation-xpath="//button[@id='btn-dialog-exit-confirm']"
                        onClick={handleConfirmExit}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Exit Now</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
