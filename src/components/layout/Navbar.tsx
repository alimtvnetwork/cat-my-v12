import React from "react";
import { AlertOctagon } from "lucide-react";
import { useErrorStore } from "@/lib/stores/errorStore";
import { GlobalNav } from "@/components/hmi/GlobalNav";

export function NavbarErrorsButton(): React.JSX.Element {
  const errorCount = useErrorStore((s) => s.history.length);
  const openErrorModal = useErrorStore((s) => s.openErrorModal);
  const hasErrors = errorCount > 0;

  return (
    <button
      type="button"
      data-testid="navbar-errors-button"
      onClick={() => openErrorModal()}
      title={
        hasErrors
          ? `View Error Management Modal (${errorCount} active Split-DB errors with stack traces)`
          : "View Error Management Modal (No active Split-DB errors)"
      }
      className={`group relative flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
        hasErrors
          ? "border border-rose-500/60 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 hover:border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.35)]"
          : "border border-slate-700/60 bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200"
      }`}
    >
      <AlertOctagon
        className={`h-3.5 w-3.5 transition-transform group-hover:scale-110 ${
          hasErrors ? "text-rose-400 animate-pulse" : "text-slate-400"
        }`}
      />
      <span>Errors</span>
      <span
        className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold tabular-nums ${
          hasErrors
            ? "bg-rose-600 text-white shadow-sm"
            : "bg-slate-700/80 text-slate-300"
        }`}
      >
        {errorCount}
      </span>
    </button>
  );
}

export function Navbar(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-border bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-4">
        <GlobalNav />
      </div>

      <div className="flex items-center gap-3">
        <NavbarErrorsButton />
      </div>
    </header>
  );
}

export default Navbar;
