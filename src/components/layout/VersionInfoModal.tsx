import React, { useEffect } from "react";
import { Info, X, ExternalLink, Calendar, GitCommit, Layers, ShieldCheck } from "lucide-react";
import { APP_VERSION_INFO } from "@/lib/version-info";

export interface VersionInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VersionInfoModal({ isOpen, onClose }: VersionInfoModalProps): React.JSX.Element | null {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-[10070] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#0b0f19] p-6 shadow-2xl text-slate-100 animate-in zoom-in-95">
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <Info className="h-5 w-5" />
            </div>

            <div>
              <h2 id="version-modal-title" className="text-base font-bold text-white tracking-wide">
                {APP_VERSION_INFO.name}
              </h2>

              <p className="font-mono text-xs text-cyan-300">
                Release {APP_VERSION_INFO.version}
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close version info"
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="my-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <span className="block text-[10px] uppercase font-semibold text-slate-400">Release Date</span>
                <span className="font-mono font-medium text-slate-200">{APP_VERSION_INFO.releaseDate}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <span className="block text-[10px] uppercase font-semibold text-slate-400">Commit</span>
                <span className="font-mono font-medium text-cyan-300">{APP_VERSION_INFO.commitHash}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-400 shrink-0" />
              <div>
                <span className="block text-[10px] uppercase font-semibold text-slate-400">Target</span>
                <span className="font-medium text-slate-200">{APP_VERSION_INFO.buildTarget}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <span className="block text-[10px] uppercase font-semibold text-slate-400">Integrity</span>
                <span className="font-medium text-emerald-300">100% Certified Pass</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Release Highlights & Fixed Items
            </h3>

            <ul className="space-y-1.5 rounded-xl border border-white/[0.08] bg-black/40 p-3 text-slate-300">
              {APP_VERSION_INFO.highlights.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <a
            href="https://github.com/alimtvnetwork/cat-my-v12/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 hover:underline"
          >
            <span>View GitHub Releases</span>
            <ExternalLink className="h-3 w-3" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="flex cursor-pointer items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/20 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
