import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, ListChecks } from "lucide-react";
import {
  activateLicense,
  deactivateLicense,
  getLicenseSnapshot,
  type LicenseSnapshot,
} from "@/lib/license.functions";
import { FeatureNameType, type FeatureName } from "@/lib/license";
import { formatIdentifierLabel, formatUiText } from "@/lib/display-labels";
import { SettingsCard } from "@/components/settings/SettingsCard";

export const Route = createFileRoute("/settings/license")({
  head: () => ({
    meta: [
      { title: "License Activation - Control Automation" },
      {
        name: "description",
        content: "Activate a signed LicenseRecord and review enabled features.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LicenseActivationPage,
});

const ALL_FEATURES: FeatureName[] = [
  FeatureNameType.RunInspection,
  FeatureNameType.ConfigureRules,
  FeatureNameType.ExportResultsJson,
  FeatureNameType.MultiVendorCameraSelection,
  FeatureNameType.ExtendedOcrEngines,
  FeatureNameType.CloudRuleCatalogDownload,
  FeatureNameType.RuleBundleImport,
  FeatureNameType.RuleBundleExport,
  FeatureNameType.AuditBundleExport,
  FeatureNameType.AuditBundleExportSigned,
  FeatureNameType.AuditBundleExportAdmin,
  FeatureNameType.RemoteDiagnostics,
];

function LicenseActivationPage() {
  const load = useServerFn(getLicenseSnapshot);
  const activate = useServerFn(activateLicense);
  const deactivate = useServerFn(deactivateLicense);

  const [snapshot, setSnapshot] = useState<LicenseSnapshot | null>(null);
  const [record, setRecord] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await load());
    } catch {
      /* keep last */
    }
  }, [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onFile = async (file: File | null) => {
    if (!file) return;

    if (file.size > 32_768) {
      setMessage({ kind: "err", text: "License file too large (32KB max)." });

      return;
    }

    setRecord(await file.text());
    setMessage(null);
  };

  const onActivate = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await activate({ data: { record } });
      setSnapshot(res.snapshot);
      setMessage(
        res.ok
          ? { kind: "ok", text: `License activated (${formatIdentifierLabel(res.snapshot.tier)}).` }
          : {
              kind: "err",
              text: `Activation failed: ${formatIdentifierLabel(res.reason ?? res.status)}`,
            },
      );
    } catch (err) {
      setMessage({ kind: "err", text: err instanceof Error ? err.message : "Activation failed." });
    } finally {
      setBusy(false);
    }
  };

  const onDeactivate = async () => {
    setBusy(true);
    try {
      setSnapshot(await deactivate());
      setRecord("");

      if (fileRef.current) fileRef.current.value = "";
      setMessage({ kind: "ok", text: "License cleared. Running on Tier One baseline." });
    } finally {
      setBusy(false);
    }
  };

  const active = snapshot?.status === "Valid";

  return (
    <main className="p-hmi-3 flex flex-col gap-hmi-3 text-ca-ink">
      <header className="flex items-baseline justify-between border-b border-ca-border pb-hmi-2">
        <h1 className="text-hmi-title">License Activation</h1>
        <span
          data-license-status={snapshot?.status ?? "Unknown"}
          className="text-hmi-body inline-flex items-center min-h-10 px-hmi-3 py-hmi-2 border border-ca-border"
        >
          {snapshot
            ? `${formatIdentifierLabel(snapshot.status)} / ${formatIdentifierLabel(snapshot.tier)}`
            : "Loading..."}
        </span>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-hmi-3">
        <SettingsCard
          Icon={KeyRound}
          title="Enter or upload LicenseRecord"
          description="Signed JSON is verified against the pinned Ed25519 public key server-side before it takes effect."
        >
          <div className="flex flex-col gap-hmi-2">
            <label className="text-hmi-body">
              Upload .json
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
                className="block mt-hmi-1 text-hmi-body"
              />
            </label>
            <label className="text-hmi-body">
              Or paste JSON
              <textarea
                value={record}
                onChange={(e) => setRecord(e.target.value)}
                rows={10}
                spellCheck={false}
                className="block mt-hmi-1 w-full font-mono text-hmi-body border border-ca-border p-hmi-1 bg-ca-panel"
                placeholder='{"licenseId":"...","tier":"TierTwo","serialNumber":"...","machineHash":"...","issuedAt":"...","expiresAt":null,"features":[...],"signature":"...","signatureAlg":"Ed25519"}'
              />
            </label>
            <div className="flex gap-hmi-2">
              <button
                type="button"
                onClick={() => void onActivate()}
                disabled={busy || record.trim().length === 0}
                className="inline-flex items-center min-h-10 px-hmi-3 py-hmi-2 border border-ca-border bg-ca-primary text-ca-bg disabled:opacity-50"
              >
                {busy ? "Verifying..." : "Verify & Activate"}
              </button>
              <button
                type="button"
                onClick={() => void onDeactivate()}
                disabled={busy || !active}
                className="inline-flex items-center min-h-10 px-hmi-3 py-hmi-2 border border-ca-border disabled:opacity-50"
              >
                Deactivate
              </button>
            </div>
            {message && (
              <div
                role={message.kind === "err" ? "alert" : "status"}
                data-message-kind={message.kind}
                className="text-hmi-body p-hmi-1 border border-ca-border"
              >
                {formatUiText(message.text)}
              </div>
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          Icon={ListChecks}
          title="Enabled features"
          description="Feature toggles are derived from the active LicenseRecord."
        >
          <dl className="grid grid-cols-2 gap-hmi-1 text-hmi-body">
            <dt className="opacity-70">License ID</dt>
            <dd className="font-mono">{snapshot?.licenseId ?? "-"}</dd>
            <dt className="opacity-70">Serial</dt>
            <dd className="font-mono">{snapshot?.serialNumber ?? "-"}</dd>
            <dt className="opacity-70">Expires</dt>
            <dd className="font-mono">{snapshot?.expiresAt ?? "never"}</dd>
          </dl>
          <ul className="mt-hmi-2 flex flex-col gap-hmi-1">
            {ALL_FEATURES.map((f) => {
              const on = snapshot?.features.includes(f) ?? false;

              return (
                <li
                  key={f}
                  data-feature={f}
                  data-enabled={on}
                  className="flex items-center justify-between min-h-10 px-hmi-3 py-hmi-2 border border-ca-border"
                >
                  <span className="text-hmi-body">{formatIdentifierLabel(f)}</span>
                  <span className={on ? "text-ca-ok" : "opacity-60"}>
                    {on ? "Enabled" : "Locked"}
                  </span>
                </li>
              );
            })}
          </ul>
        </SettingsCard>
      </section>
    </main>
  );
}
