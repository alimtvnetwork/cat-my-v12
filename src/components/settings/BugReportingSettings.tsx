import { useCallback, useEffect, useState } from "react";
import { Bug, Mail, Database } from "lucide-react";
import { SettingsCard } from "./SettingsCard";

// Spec 54: Bug Reporting settings (email + Supabase delivery).
// Backend routes: BE/routes/bug_reports.py. The Supabase API key is
// stored reversibly in an app-data settings file (0600), same honesty
// caveat as AGM — never in git, never echoed back by GET /config.
// Dummy/inbuilt settings are placeholders only; no real credentials
// ship with this UI. Email credentials live in go-email-reader's own
// RSA-encrypted store; this UI only shows whether a sender and a
// notifier resolve, never a password.
const BACKEND_STORAGE_KEY = "app.backend.baseUrl";
const DEFAULT_BACKEND_URL = "http://127.0.0.1:8787";

interface SupabaseConfigView {
  is_configured: boolean;
  is_enabled: boolean;
  url: string | null;
  role: string | null;
  has_key: boolean;
}

interface BugReportConfigView {
  supabase: SupabaseConfigView;
  email_sender_resolves: boolean;
  email_notifier_resolves: boolean;
  go_email_reader_bin: string | null;
}

interface TestResultView {
  is_reachable: boolean;
  tables: Record<string, boolean>;
  is_verified: boolean;
}

function resolveBackendUrl(): string {
  try {
    const raw = globalThis.localStorage?.getItem(BACKEND_STORAGE_KEY);
    if (!raw) return DEFAULT_BACKEND_URL;
    const parsed = JSON.parse(raw) as unknown;
    const state = (parsed as { state?: unknown }).state as { baseUrl?: unknown } | undefined;
    const baseUrl = state?.baseUrl;
    return typeof baseUrl === "string" && baseUrl ? baseUrl : DEFAULT_BACKEND_URL;
  } catch {
    return DEFAULT_BACKEND_URL;
  }
}

function unwrapResults<T>(payload: unknown): T | null {
  const results = (payload as { Results?: unknown }).Results;
  if (Array.isArray(results) && results.length > 0) {
    return results[0] as T;
  }
  return null;
}

export function BugReportingSettings(): React.JSX.Element | null {
  const [backendUrl] = useState<string>(() => resolveBackendUrl());
  const [config, setConfig] = useState<BugReportConfigView | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");
  const [supabaseRole, setSupabaseRole] = useState("secondary");
  const [isEnabled, setIsEnabled] = useState(true);
  const [testResult, setTestResult] = useState<TestResultView | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [testTitle, setTestTitle] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(`${backendUrl}/bug-reports/config`);
      if (!res.ok) {
        setNotice(`Could not load bug-report config (HTTP ${res.status}). Is the backend running?`);
        return;
      }
      const view = unwrapResults<BugReportConfigView>(await res.json());
      if (view) {
        setConfig(view);
        if (view.supabase.url) setSupabaseUrl(view.supabase.url);
        if (view.supabase.role) setSupabaseRole(view.supabase.role);
        setIsEnabled(view.supabase.is_enabled);
      }
    } catch (err) {
      setNotice(`Could not reach backend at ${backendUrl}: ${String(err)}`);
    }
  }, [backendUrl]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setNotice(null);
    try {
      const res = await fetch(`${backendUrl}/bug-reports/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: supabaseUrl.trim(),
          api_key: supabaseKey,
          role: supabaseRole,
          is_enabled: isEnabled,
        }),
      });
      if (!res.ok) {
        setNotice(`Save failed (HTTP ${res.status}). The key is stored only on this machine.`);
        return;
      }
      setSupabaseKey("");
      setNotice("Supabase settings saved (key stored 0600 in app-data, never in git).");
      await loadConfig();
    } catch (err) {
      setNotice(`Save failed: ${String(err)}`);
    } finally {
      setIsSaving(false);
    }
  }, [backendUrl, supabaseUrl, supabaseKey, supabaseRole, isEnabled, loadConfig]);

  const handleTest = useCallback(async () => {
    setIsTesting(true);
    setNotice(null);
    try {
      const res = await fetch(`${backendUrl}/bug-reports/test`, { method: "POST" });
      const view = unwrapResults<TestResultView>(await res.json());
      if (!res.ok || !view) {
        setNotice(`Endpoint test failed (HTTP ${res.status}). Check the URL and key.`);
        return;
      }
      setTestResult(view);
      if (!view.is_verified) {
        setNotice(
          "Tables missing: run BE/bug_reports/schema.sql in the Supabase dashboard SQL editor, then test again.",
        );
      }
    } catch (err) {
      setNotice(`Endpoint test failed: ${String(err)}`);
    } finally {
      setIsTesting(false);
    }
  }, [backendUrl]);

  const handleSendTest = useCallback(async () => {
    setIsSendingTest(true);
    setNotice(null);
    try {
      const res = await fetch(`${backendUrl}/bug-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: testTitle.trim() || "Test bug report",
          message: testMessage.trim() || "Test report from Bug Reporting settings.",
          channels: ["email", "supabase"],
        }),
      });
      if (!res.ok) {
        setNotice(`Test report failed (HTTP ${res.status}). Check email + Supabase setup above.`);
        return;
      }
      setNotice("Test report delivered via email + Supabase (see delivery audit on the backend).");
    } catch (err) {
      setNotice(`Test report failed: ${String(err)}`);
    } finally {
      setIsSendingTest(false);
    }
  }, [backendUrl, testTitle, testMessage]);

  return (
    <div className="flex flex-col gap-hmi-4">
      <SettingsCard
        Icon={Database}
        title="Bug Reports — Supabase"
        description="Where bug reports go for developers to download. Paste the project URL + key, save, then test. Tables must exist first (schema.sql)."
        statusLabel={config?.supabase.is_configured ? "Configured" : "Not configured"}
      >
        <div className="flex flex-col gap-hmi-3">
          <label className="flex flex-col gap-hmi-1 text-hmi-caption text-ca-ink">
            Supabase project URL
            <input
              data-ui-id="bug-report-supabase-url"
              className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink"
              placeholder="https://xyzcompany.supabase.co"
              value={supabaseUrl}
              onChange={(event) => setSupabaseUrl(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-hmi-1 text-hmi-caption text-ca-ink">
            API key (never shown back, stored 0600 on this machine)
            <input
              data-ui-id="bug-report-supabase-key"
              type="password"
              className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink"
              placeholder={
                config?.supabase.has_key
                  ? "Key already stored — leave blank to keep it"
                  : "Paste anon or service key"
              }
              value={supabaseKey}
              onChange={(event) => setSupabaseKey(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-hmi-3">
            <label className="flex items-center gap-hmi-2 text-hmi-caption text-ca-ink">
              Role
              <select
                data-ui-id="bug-report-supabase-role"
                className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-2 py-hmi-2 text-hmi-body text-ca-ink"
                value={supabaseRole}
                onChange={(event) => setSupabaseRole(event.target.value)}
              >
                <option value="secondary">secondary</option>
                <option value="root">root</option>
              </select>
            </label>
            <label className="flex items-center gap-hmi-2 text-hmi-caption text-ca-ink">
              <input
                data-ui-id="bug-report-supabase-enabled"
                type="checkbox"
                checked={isEnabled}
                onChange={(event) => setIsEnabled(event.target.checked)}
              />
              Enabled
            </label>
            <button
              data-ui-id="bug-report-supabase-save"
              type="button"
              disabled={isSaving || !supabaseUrl.trim()}
              className="rounded-md border border-ca-border bg-ca-select px-hmi-3 py-hmi-2 text-hmi-body text-white disabled:opacity-50"
              onClick={() => void handleSave()}
            >
              {isSaving ? "Saving…" : "Save Supabase settings"}
            </button>
            <button
              data-ui-id="bug-report-supabase-test"
              type="button"
              disabled={isTesting || !config?.supabase.is_configured}
              className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink disabled:opacity-50"
              onClick={() => void handleTest()}
            >
              {isTesting ? "Testing…" : "Test endpoint + verify tables"}
            </button>
          </div>
          {testResult ? (
            <p className="text-hmi-caption text-ca-ink-muted">
              Reachable: {testResult.is_reachable ? "yes" : "no"} · bug_reports:{" "}
              {testResult.tables.bug_reports ? "found" : "missing"} · bug_attachments:{" "}
              {testResult.tables.bug_attachments ? "found" : "missing"}
            </p>
          ) : null}
        </div>
      </SettingsCard>

      <SettingsCard
        Icon={Mail}
        title="Bug Reports — Email"
        description="Reports go to the notifier address via go-email-reader, which owns the credentials. Nothing secret is stored in this app."
        statusLabel={
          config?.email_sender_resolves && config?.email_notifier_resolves ? "Ready" : "Needs setup"
        }
      >
        <div className="flex flex-col gap-hmi-2 text-hmi-caption text-ca-ink-muted">
          <p>
            Sender resolves: {config?.email_sender_resolves ? "yes" : "no"} · Notifier resolves:{" "}
            {config?.email_notifier_resolves ? "yes" : "no"} · go-email-reader:{" "}
            {config?.go_email_reader_bin ?? "not found"}
          </p>
          <p>
            Setup: install go-email-reader, add an account (`go-email-reader add`), then set the
            notifier (`go-email-reader notifier set --email ops@example.com`). Sender/recipient
            defaults also resolve from repo-secrets 11-go-email-reader/ (non-secret fields only).
          </p>
        </div>
      </SettingsCard>

      <SettingsCard
        Icon={Bug}
        title="Send a test bug report"
        description="Delivers a freeform report via email + Supabase so both channels can be proven end to end."
      >
        <div className="flex flex-col gap-hmi-3">
          <input
            data-ui-id="bug-report-test-title"
            className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink"
            placeholder="Test report title"
            value={testTitle}
            onChange={(event) => setTestTitle(event.target.value)}
          />
          <textarea
            data-ui-id="bug-report-test-message"
            className="rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink"
            placeholder="Test report message"
            value={testMessage}
            onChange={(event) => setTestMessage(event.target.value)}
          />
          <button
            data-ui-id="bug-report-test-send"
            type="button"
            disabled={isSendingTest}
            className="w-fit rounded-md border border-ca-border bg-ca-select px-hmi-3 py-hmi-2 text-hmi-body text-white disabled:opacity-50"
            onClick={() => void handleSendTest()}
          >
            {isSendingTest ? "Sending…" : "Send test report"}
          </button>
        </div>
      </SettingsCard>

      {notice ? <p className="text-hmi-caption text-ca-ink">{notice}</p> : null}
    </div>
  );
}
