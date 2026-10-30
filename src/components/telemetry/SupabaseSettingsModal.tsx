import React, { useState, useEffect } from "react";
import { Cloud, X, CheckCircle2, AlertCircle, Loader2, Key, Database, RefreshCw, Folder } from "lucide-react";
import {
  loadSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  DEFAULT_SUPABASE_CONFIG,
  type SupabaseConfig,
  type SupabaseTestResult,
} from "@/services/telemetry/supabase-client";

export interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupabaseSettingsModal({
  isOpen,
  onClose,
}: SupabaseSettingsModalProps): React.JSX.Element | null {
  const [config, setConfig] = useState<SupabaseConfig>(DEFAULT_SUPABASE_CONFIG);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SupabaseTestResult | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(loadSupabaseConfig());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testSupabaseConnection(config);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetPresets = () => {
    setConfig(DEFAULT_SUPABASE_CONFIG);
    setTestResult(null);
  };

  const handleSave = () => {
    saveSupabaseConfig(config);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10075] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-white/15 bg-[#0f172a] p-6 shadow-2xl text-slate-100 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Cloud className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">Supabase Cloud Telemetry Settings</h3>
              <p className="text-[11px] text-slate-400">
                Synchronize diagnostic bug reports and canvas artifacts to Supabase
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="my-4 space-y-3.5 text-xs">
          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1">
              <Database className="h-3.5 w-3.5 text-emerald-400" />
              <span>Supabase REST URL</span>
            </label>

            <input
              type="text"
              placeholder="https://xyzcompany.supabase.co"
              value={config.supabaseUrl}
              onChange={(e) => setConfig((prev) => ({ ...prev, supabaseUrl: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1">
              <Key className="h-3.5 w-3.5 text-emerald-400" />
              <span>Publishable / Anon API Key</span>
            </label>

            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={config.publishableKey}
              onChange={(e) => setConfig((prev) => ({ ...prev, publishableKey: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1">
              <Folder className="h-3.5 w-3.5 text-emerald-400" />
              <span>Storage Bucket Name</span>
            </label>

            <input
              type="text"
              placeholder="cat-vision-telemetry"
              value={config.bucketName}
              onChange={(e) => setConfig((prev) => ({ ...prev, bucketName: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.isEnabled}
                onChange={(e) => setConfig((prev) => ({ ...prev, isEnabled: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-0"
              />
              <span className="font-semibold text-slate-200">Enable Supabase Cloud Synchronization</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.hasAutoSync}
                onChange={(e) => setConfig((prev) => ({ ...prev, hasAutoSync: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-0"
              />
              <span className="font-semibold text-slate-200">Automatically upload on bug export</span>
            </label>
          </div>

          {testResult ? (
            <div
              className={`flex items-center gap-2 rounded-lg p-2.5 text-xs ${
                testResult.isSuccess
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
              }`}
            >
              {testResult.isSuccess ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={handleResetPresets}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Reset Inbuilt Presets</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTesting}
              onClick={handleTest}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              <span>Test Connection</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
