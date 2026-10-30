import React, { useState, useCallback, useEffect } from "react";
import { Minus, Square, X, AlertTriangle, LogOut } from "lucide-react";
import { toast } from "sonner";

import { useBackendMode } from "@/lib/backend/mode";
import { useErrorStore } from "@/lib/stores/errorStore";

/**
 * Window controls for the desktop app (spec 54 section 8).
 *
 * Honest browser behavior: this app runs as a browser --app window
 * (Edge/Chrome --app --start-fullscreen), NOT a native shell, and
 * window.desktopApi was never implemented. So:
 *
 * - Minimize: browsers cannot minimize a window from JS. When no native
 *   bridge exists, the button says so instead of silently doing nothing.
 * - Maximize: the browser-honest equivalent is the fullscreen toggle.
 * - Close: the confirm dialog asks the backend to shut down
 *   (POST /shutdown), then the dialog tells the user to close the
 *   browser window. The old code redirected to "/" here, which reloaded
 *   the whole SPA mid-flight and read as a crash. That redirect is gone.
 *
 * Every failure is routed into the error store (useErrorStore) instead
 * of a swallowed catch. The Exit menu item in StandardAppShell shares
 * this exact flow by dispatching WINDOW_EXIT_REQUEST_EVENT, which opens
 * the same confirm dialog; there is no second copy of the exit logic.
 *
 * A future native shell (Tauri/Electron) is a morning architecture
 * decision (spec 54 MBUD). If one ever provides window.desktopApi, these
 * handlers prefer it automatically.
 */
export const WINDOW_EXIT_REQUEST_EVENT = "cat-vision:request-exit";

interface DesktopApi {
  minimize?: () => void;
  toggleMaximize?: () => void;
  close?: () => void;
}

function readDesktopApi(): DesktopApi | undefined {
  return (window as unknown as { desktopApi?: DesktopApi }).desktopApi;
}

export function WindowControlButtons(): React.JSX.Element {
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const baseUrl = useBackendMode((s) => s.baseUrl);

  useEffect(() => {
    const openExitDialog = (): void => {
      setIsExitDialogOpen(true);
    };

    window.addEventListener(WINDOW_EXIT_REQUEST_EVENT, openExitDialog);

    return () => {
      window.removeEventListener(WINDOW_EXIT_REQUEST_EVENT, openExitDialog);
    };
  }, []);

  const handleMinimize = useCallback(() => {
    const desktopApi = readDesktopApi();

    if (desktopApi?.minimize) {
      desktopApi.minimize();

      return;
    }

    toast.info("Minimize is not available in browser mode. Use your operating system window controls to minimize this window.");
  }, []);

  const handleToggleMaximize = useCallback(() => {
    const desktopApi = readDesktopApi();

    if (desktopApi?.toggleMaximize) {
      desktopApi.toggleMaximize();

      return;
    }

    const fullscreenRequest = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();

    fullscreenRequest.catch((err: unknown) => {
      useErrorStore.getState().captureError(
        err,
        {
          triggerComponent: "WindowControlButtons",
          triggerAction: "toggleMaximize",
          source: "WindowControlButtons",
        },
        "E_WINDOW_FULLSCREEN",
      );
    });
  }, []);

  const handleConfirmExit = useCallback(() => {
    const desktopApi = readDesktopApi();

    if (desktopApi?.close) {
      desktopApi.close();

      return;
    }

    setIsShuttingDown(true);

    const shutdownController = new AbortController();
    const shutdownTimeout = window.setTimeout(() => shutdownController.abort(), 3000);

    fetch(`${baseUrl}/shutdown`, {
      method: "POST",
      signal: shutdownController.signal,
    })
      .catch((err: unknown) => {
        useErrorStore.getState().captureError(
          err,
          {
            endpoint: `${baseUrl}/shutdown`,
            method: "POST",
            triggerComponent: "WindowControlButtons",
            triggerAction: "confirmExit",
            source: "WindowControlButtons",
          },
          "E_WINDOW_SHUTDOWN",
        );
      })
      .finally(() => {
        window.clearTimeout(shutdownTimeout);

        try {
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
      });
  }, [baseUrl]);

  const handleDismissShutdown = useCallback(() => {
    setIsExitDialogOpen(false);
    setIsShuttingDown(false);
  }, []);

  return (
    <>
      <div
        data-testid="window-controls-bar"
        className="flex items-center gap-0.5 border-l border-white/10 pl-2 ml-1"
      >
        <button
          type="button"
          title="Minimize to taskbar"
          aria-label="Minimize Window"
          onClick={handleMinimize}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-slate-100 active:scale-95"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          title="Window layer / Maximize"
          aria-label="Window Layer or Maximize"
          onClick={handleToggleMaximize}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-slate-100 active:scale-95"
        >
          <Square className="h-3 w-3" />
        </button>

        <button
          type="button"
          title="Exit application"
          aria-label="Close Application"
          onClick={() => setIsExitDialogOpen(true)}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 transition hover:bg-rose-600 hover:text-white active:scale-95"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {isExitDialogOpen ? (
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
                  {isShuttingDown ? "Shutting Down…" : "Exit Application?"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isShuttingDown
                    ? "Cat Vision asked the backend to stop. Close this browser window now (Alt+F4) — the launcher stops the remaining services when the window closes."
                    : "Are you sure you want to close Cat Vision, Cat I Vision?"}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              {isShuttingDown ? (
                <button
                  type="button"
                  onClick={handleDismissShutdown}
                  className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                >
                  Dismiss
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsExitDialogOpen(false)}
                    className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
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
        </div>
      ) : null}
    </>
  );
}
