import React, { useState, useEffect } from "react";
import { Send, X, CheckCircle2, AlertCircle, Loader2, Key, MessageSquare } from "lucide-react";
import {
  loadTelegramConfig,
  saveTelegramConfig,
  testTelegramConnection,
  type TelegramConfig,
} from "@/lib/recorder/telegram-service";

export interface TelegramSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TelegramSettingsModal({ isOpen, onClose }: TelegramSettingsModalProps): React.JSX.Element | null {
  const [config, setConfig] = useState<TelegramConfig>({ botToken: "", chatId: "", isEnabled: true });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ isSuccess: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(loadTelegramConfig());
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
      const result = await testTelegramConnection(config.botToken);
      setTestResult(result);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    saveTelegramConfig(config);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10075] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0f172a] p-6 shadow-2xl text-slate-100 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
              <Send className="h-4 w-4" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">Telegram Integration Settings</h3>
              <p className="text-[11px] text-slate-400">Directly dispatch bug reports to your Telegram chat</p>
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
              <Key className="h-3.5 w-3.5 text-sky-400" />
              <span>Bot API Token</span>
            </label>

            <input
              type="password"
              placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              value={config.botToken}
              onChange={(e) => setConfig((prev) => ({ ...prev, botToken: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white focus:border-sky-400 focus:outline-none"
            />

            <span className="mt-1 block text-[10px] text-slate-400">
              Obtain this token from @BotFather on Telegram.
            </span>
          </div>

          <div>
            <label className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1">
              <MessageSquare className="h-3.5 w-3.5 text-sky-400" />
              <span>Target Chat ID</span>
            </label>

            <input
              type="text"
              placeholder="e.g. -100123456789 or 987654321"
              value={config.chatId}
              onChange={(e) => setConfig((prev) => ({ ...prev, chatId: e.target.value }))}
              className="w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 font-mono text-xs text-white focus:border-sky-400 focus:outline-none"
            />

            <span className="mt-1 block text-[10px] text-slate-400">
              Personal or group chat ID to receive notifications.
            </span>
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
              <span className="leading-tight">{testResult.message}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <button
            type="button"
            disabled={isTesting || !config.botToken.trim()}
            onClick={handleTest}
            className="flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
          >
            {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            <span>Test Connection</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
