import React, { useState, useCallback } from "react";
import { Minus, Square, X, AlertTriangle, LogOut } from "lucide-react";
import { resolveBackendUrl } from "@/lib/data-source";
import { getAutomationAttrs } from "@/utils/automation-registry";

export function WindowControlButtons(): React.JSX.Element {
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const handleMinimize = useCallback(() => {
    try {
      const desktopApi = (window as unknown as { desktopApi?: { minimize?: () => void } }).desktopApi;

      if (desktopApi?.minimize) {
        desktopApi.minimize();

        return;
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      window.dispatchEvent(new CustomEvent("cat-vision:window-minimize"));
    } catch (err) {
      console.warn("[WindowControls] minimize error", err);
    }
  }, []);

  const handleToggleMaximize = useCallback(() => {
    try {
      const desktopApi = (window as unknown as { desktopApi?: { toggleMaximize?: () => void } }).desktopApi;

      if (desktopApi?.toggleMaximize) {
        desktopApi.toggleMaximize();

        return;
      }

      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch (err) {
      console.warn("[WindowControls] maximize error", err);
    }
  }, []);

  const handleConfirmExit = useCallback(async () => {
    setIsExiting(true);

    try {
      const shutdownUrl = resolveBackendUrl("/shutdown");
      await fetch(shutdownUrl, { method: "POST" }).catch(() => {});
    } catch {
      // Backend shutdown attempt finished
    }

    const desktopApi = (window as unknown as { desktopApi?: { close?: () => void } }).desktopApi;

    if (desktopApi?.close) {
      desktopApi.close();

      return;
    }

    try {
      window.close();
    } catch {
      // Browser prevented window.close
    }

    setIsExitDialogOpen(false);
    window.location.href = "/";
  }, []);

  const minAttrs = getAutomationAttrs({
    id: "btn-window-minimize",
    name: "Minimize Window",
    parentPath: "//div[@data-testid='window-controls-bar']",
  });

  const maxAttrs = getAutomationAttrs({
    id: "btn-window-maximize",
    name: "Window Layer or Maximize",
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
        className="flex items-center gap-0.5 border-l border-white/10 pl-2 ml-1"
      >
        <button
          type="button"
          title="Minimize to taskbar"
          aria-label="Minimize Window"
          onClick={handleMinimize}
          {...minAttrs}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-slate-100 active:scale-95"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          title="Window layer / Maximize"
          aria-label="Window Layer or Maximize"
          onClick={handleToggleMaximize}
          {...maxAttrs}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-400 transition hover:bg-white/10 hover:text-slate-100 active:scale-95"
        >
          <Square className="h-3 w-3" />
        </button>

        <button
          type="button"
          title="Exit application"
          aria-label="Close Application"
          onClick={() => setIsExitDialogOpen(true)}
          {...closeAttrs}
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
                <h3 className="text-sm font-bold text-white">Exit Application?</h3>
                <p className="text-xs text-slate-400">
                  Are you sure you want to close Cat Vision, Cat I Vision?
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                id="btn-dialog-exit-cancel"
                onClick={() => setIsExitDialogOpen(false)}
                className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>

              <button
                type="button"
                id="btn-dialog-exit-confirm"
                disabled={isExiting}
                onClick={handleConfirmExit}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{isExiting ? "Exiting..." : "Exit Now"}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
