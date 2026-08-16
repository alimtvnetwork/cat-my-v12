import { AuditRetentionPolicyType } from "@/lib/audit-retention.functions";
import { SettingsGroupIdType } from "@/lib/stores/ui-prefs-store";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  Zap,
  Sun,
  Keyboard,
  UserRound,
  Cpu,
  Archive,
  Wand2,
  Check,
  Search,
  X,
  Rows3,
  Cloud,
} from "lucide-react";
import { HmiShell } from "@/components/hmi";
import { DeviceDiscoveryPanel } from "@/components/hmi/DeviceDiscoveryPanel";
import { SettingsSidenav } from "@/components/settings/SettingsSidenav";
import { SettingsCard } from "@/components/settings/SettingsCard";
import { SettingsGroup } from "@/components/settings/SettingsGroup";
import { SettingsDisclosure } from "@/components/settings/SettingsDisclosure";
import { DataSourceToggle } from "@/components/data-source/DataSourceToggle";
import {
  setBackendBaseUrl,
  useBackendBaseUrl,
  useDataSource,
  setPersistRulesServerSide,
  usePersistRulesServerSide,
} from "@/lib/data-source";
import { apiFetch } from "@/lib/http/client";
import {
  RetentionStepper,
  RETENTION_DAY_PRESETS,
  RETENTION_MB_PRESETS,
} from "@/components/settings/RetentionStepper";
import { readFacadeJson, writeFacadeJson } from "@/lib/projects/facade-json";
import {
  getCaptureVendor,
  setCaptureVendor,
  SUPPORTED_VENDORS,
  type CaptureVendor,
} from "@/lib/capture.functions";
import { writeRetentionPolicy, type AuditRetentionPolicy } from "@/lib/audit-retention.functions";
import { formatIdentifierLabel, formatUiText } from "@/lib/display-labels";
import { ReferenceImageCard } from "@/components/settings/ReferenceImageCard";
import { useUiPrefsStore, type ToolTooltipMode, type HeaderDensity } from "@/lib/stores/ui-prefs-store";
import { FlavorToggle } from "@/components/theme/FlavorToggle";

// Spec 39 §10 + 27.Operator.Id (Q-07): single operator identity persisted as config.
// Keys include the historical `ca-hmi:` namespace (previously injected by
// `@/lib/persist`) so the SDK facade sees the same fully-qualified keys
// that legacy `localStorage` payloads used, keeping migration transparent.
const OPERATOR_KEY = "ca-hmi:settings.operatorId";
// Local mirror kept so the radiogroup renders instantly on nav; source of
// truth is the server via getCaptureVendor/setCaptureVendor (v1.39 bridge).
const VENDOR_KEY = "ca-hmi:settings.capture.vendor";
const VENDOR_DEFAULT: CaptureVendor = "pylon";

// Audit log retention + rotation (Rank 3 v2.0.9). UI-side persisted mirror; the
// scheduler consumes the same policy shape from `settings.audit.retention`.
type RetentionPolicy = { enabled: boolean; retentionDays: number; maxSizeMB: number };
const RETENTION_KEY = "ca-hmi:settings.audit.retention";
const RETENTION_DEFAULT: RetentionPolicy = { enabled: true, retentionDays: 30, maxSizeMB: 256 };
const RETENTION_MIN_DAYS = 1;
const RETENTION_MAX_DAYS = 3650;
const RETENTION_MIN_MB = 1;
const RETENTION_MAX_MB = 10240;

// Plan 81 step 2: session-scoped search filter for the Settings hub. Kept in
// sessionStorage rather than the persisted UI-prefs store so the filter does
// not survive a browser restart (per plan: "persisted per session").
const SEARCH_SESSION_KEY = "ca-hmi:settings.searchQuery";

function readSessionSearch(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(SEARCH_SESSION_KEY) ?? "";
  } catch {
    return "";
  }
}

// Roving-tabindex + arrow-key WAI-ARIA radiogroup for Capture vendor.
// Plan 81 step 19 a11y pass: previously all radios had implicit tabindex=0
// so keyboard users had to tab through every option, and there was no
// left/right/home/end selection - a genuine WAI-ARIA radiogroup gap.
interface VendorRadioGroupProps {
  vendor: CaptureVendor;
  vendors: readonly CaptureVendor[];
  onChange: (next: CaptureVendor) => void;
  describedBy?: string;
}

function VendorRadioGroup({ vendor, vendors, onChange, describedBy }: VendorRadioGroupProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(
    0,
    vendors.findIndex((v) => v === vendor),
  );
  const focus = (idx: number, commit: boolean) => {
    const clamped = ((idx % vendors.length) + vendors.length) % vendors.length;
    const el = refs.current[clamped];

    if (el) el.focus();

    if (commit) onChange(vendors[clamped]);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focus(idx + 1, true);

        return;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focus(idx - 1, true);

        return;
      case "Home":
        e.preventDefault();
        focus(0, true);

        return;
      case "End":
        e.preventDefault();
        focus(vendors.length - 1, true);

        return;
      default:
        return;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Capture vendor"
      aria-describedby={describedBy}
      className="flex gap-hmi-2 flex-wrap"
    >
      {vendors.map((v, i) => {
        const active = vendor === v;

        return (
          <button
            key={v}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={i === activeIndex ? 0 : -1}
            onClick={() => onChange(v)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={
              active
                ? "inline-flex items-center rounded-md min-h-9 px-hmi-3 py-hmi-2 bg-ca-select text-ca-bg text-hmi-body font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-select focus-visible:ring-offset-2 focus-visible:ring-offset-ca-panel"
                : "inline-flex items-center rounded-md min-h-9 px-hmi-3 py-hmi-2 border border-ca-border bg-ca-panel-2 text-hmi-body text-ca-ink hover:border-ca-select focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-select focus-visible:ring-offset-2 focus-visible:ring-offset-ca-panel"
            }
          >
            {formatIdentifierLabel(v)}
          </button>
        );
      })}
    </div>
  );
}

function writeSessionSearch(value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value) window.sessionStorage.setItem(SEARCH_SESSION_KEY, value);
    else window.sessionStorage.removeItem(SEARCH_SESSION_KEY);
  } catch (err) {
    // Non-fatal: log but never surface. Storage may be disabled in privacy modes.
    console.warn("[settings] search sessionStorage write failed", err);
  }
}

function matchesQuery(query: string, ...haystacks: Array<string | null | undefined>): boolean {
  const q = query.trim().toLowerCase();

  if (!q) return true;

  return haystacks.some((h) => typeof h === "string" && h.toLowerCase().includes(q));
}

export const Route = createFileRoute("/settings/")({
  head: () => ({
    meta: [
      { title: "Settings - Control Automation" },
      {
        name: "description",
        content: "Configure camera, trigger, lighting, and operator identity.",
      },
    ],
  }),
  component: SettingsIndex,
});

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);

  if (Number.isFinite(n) === false) return fallback;
  const i = Math.trunc(n);

  if (i < min) return min;

  if (i > max) return max;

  return i;
}

function SettingsIndex() {
  const [operatorId, setOperatorId] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [vendor, setVendor] = useState<CaptureVendor>(VENDOR_DEFAULT);
  const [vendorSavedAt, setVendorSavedAt] = useState<number | null>(null);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [retention, setRetention] = useState<RetentionPolicy>(RETENTION_DEFAULT);
  const [retentionSavedAt, setRetentionSavedAt] = useState<number | null>(null);
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const fetchVendor = useServerFn(getCaptureVendor);
  const writeVendor = useServerFn(setCaptureVendor);
  const writeRetention = useServerFn(writeRetentionPolicy);
  const toolTooltipMode = useUiPrefsStore((s) => s.toolTooltipMode);
  const setToolTooltipMode = useUiPrefsStore((s) => s.setToolTooltipMode);
  const headerDensity = useUiPrefsStore((s) => s.headerDensity);
  const setHeaderDensity = useUiPrefsStore((s) => s.setHeaderDensity);
  const [query, setQueryState] = useState<string>("");
  useEffect(() => {
    setQueryState(readSessionSearch());
  }, []);
  const setQuery = (next: string) => {
    setQueryState(next);
    writeSessionSearch(next);
  };

  const tiles = useMemo(
    () =>
      (
        [
          {
            to: "/settings/camera",
            label: "Camera",
            Icon: Camera,
            description: "Exposure, gain, capture tuning, live preview.",
          },
          {
            to: "/settings/trigger",
            label: "Trigger",
            Icon: Zap,
            description: "Trigger source, debounce, timing preview.",
          },
          {
            to: "/settings/lighting",
            label: "Lighting",
            Icon: Sun,
            description: "Per-channel intensity, color temperature, flash test.",
          },
          {
            to: "/settings/shortcuts",
            label: "Shortcuts",
            Icon: Keyboard,
            description: "Keybindings, conflicts, reset to default.",
          },
        ] as const
      ).filter((t) => matchesQuery(query, t.label, t.description)),
    [query],
  );

  const showOperator = matchesQuery(
    query,
    "Operator identity",
    "operator id log record result row spec 27",
  );
  const showVendor = matchesQuery(
    query,
    "Capture vendor",
    "vendor sdk adapter boot pylon capture backend",
  );
  const showRetention = matchesQuery(
    query,
    "Audit log retention",
    "retention worker prune rotation days size audit",
  );
  const showDiscovery = matchesQuery(
    query,
    "Device discovery",
    "scan cameras vendor detected connected",
  );
  const showTooltips = matchesQuery(
    query,
    "Tools palette tooltips",
    "editor hint hover on demand focus keyboard",
  );
  const showDensity = matchesQuery(
    query,
    "UI density",
    "compact comfortable spacing rows layers rules list preview",
  );
  const showFlavor = matchesQuery(query, "UI Flavor", "modern standard layout theme classic");
  const showReference = matchesQuery(query, "Reference image", "sample seed calibration");
  const showDataSource = matchesQuery(
    query,
    "Data source",
    "backend seed api url prefix mode connection",
  );
  const anyMatch =
    tiles.length > 0 ||
    showOperator ||
    showVendor ||
    showRetention ||
    showDiscovery ||
    showTooltips ||
    showDensity ||
    showFlavor ||
    showReference ||
    showDataSource;

  useEffect(() => {
    let isCancelled = false;
    (async () => {
      const stored = await readFacadeJson<string>(OPERATOR_KEY);

      if (!isCancelled && stored) setOperatorId(stored);
      const storedVendor = await readFacadeJson<string>(VENDOR_KEY);

      if (
        !isCancelled &&
        storedVendor &&
        (SUPPORTED_VENDORS as readonly string[]).includes(storedVendor)
      ) {
        setVendor(storedVendor as CaptureVendor);
      }

      const storedRetention = await readFacadeJson<Partial<RetentionPolicy>>(RETENTION_KEY);

      if (!isCancelled && storedRetention && typeof storedRetention === "object") {
        setRetention({
          enabled:
            typeof storedRetention.enabled === "boolean"
              ? storedRetention.enabled
              : RETENTION_DEFAULT.enabled,
          retentionDays: clampInt(
            storedRetention.retentionDays,
            RETENTION_MIN_DAYS,
            RETENTION_MAX_DAYS,
            RETENTION_DEFAULT.retentionDays,
          ),
          maxSizeMB: clampInt(
            storedRetention.maxSizeMB,
            RETENTION_MIN_MB,
            RETENTION_MAX_MB,
            RETENTION_DEFAULT.maxSizeMB,
          ),
        });
      }
      // Hydrate from server (source of truth).
      try {
        const res = await fetchVendor();

        if (isCancelled) return;
        setVendor(res.vendor);
        writeFacadeJson(VENDOR_KEY, res.vendor);
      } catch (err) {
        console.error("[settings] getCaptureVendor failed", err);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [fetchVendor]);

  const save = () => {
    const trimmed = operatorId.trim();
    writeFacadeJson(OPERATOR_KEY, trimmed);
    setSavedAt(Date.now());
  };

  const saveVendor = (next: CaptureVendor) => {
    if ((SUPPORTED_VENDORS as readonly string[]).includes(next) === false) return;
    setVendor(next);
    writeFacadeJson(VENDOR_KEY, next);
    setVendorError(null);
    writeVendor({ data: { vendor: next } })
      .then(() => setVendorSavedAt(Date.now()))
      .catch((err) => {
        console.error("[settings] setCaptureVendor failed", err);
        setVendorError(String(err?.message ?? err));
      });
  };

  const syncVendorFromDiscovery = (next: CaptureVendor) => {
    setVendor(next);
    writeFacadeJson(VENDOR_KEY, next);
    setVendorSavedAt(Date.now());
  };

  const saveRetention = (next: RetentionPolicy) => {
    const days = clampInt(
      next.retentionDays,
      RETENTION_MIN_DAYS,
      RETENTION_MAX_DAYS,
      RETENTION_DEFAULT.retentionDays,
    );
    const size = clampInt(
      next.maxSizeMB,
      RETENTION_MIN_MB,
      RETENTION_MAX_MB,
      RETENTION_DEFAULT.maxSizeMB,
    );

    if (next.retentionDays !== days || next.maxSizeMB !== size) {
      setRetentionError(
        `Clamped to ${RETENTION_MIN_DAYS}-${RETENTION_MAX_DAYS} days / ${RETENTION_MIN_MB}-${RETENTION_MAX_MB} MB.`,
      );
    } else {
      setRetentionError(null);
    }

    const normalized: RetentionPolicy = {
      enabled: next.enabled,
      retentionDays: days,
      maxSizeMB: size,
    };
    setRetention(normalized);
    writeFacadeJson(RETENTION_KEY, normalized);
    setRetentionSavedAt(Date.now());
    console.info("[settings] audit retention updated", normalized);
    // Map UI shape → server policy enum (nearest window).
    const policy: AuditRetentionPolicy =
      days <= 90
        ? AuditRetentionPolicyType.RetentionShort
        : days <= 270
          ? AuditRetentionPolicyType.RetentionStandard
          : days <= 600
            ? AuditRetentionPolicyType.RetentionLong
            : AuditRetentionPolicyType.RetentionForensic;
    writeRetention({ data: { enabled: normalized.enabled, policy, cadenceHours: 6 } })
      .then(() => console.info("[settings] retention policy persisted server-side", policy))
      .catch((err) => {
        console.error("[settings] writeRetentionPolicy failed", err);
        setRetentionError(String(err?.message ?? err));
      });
  };

  return (
    <HmiShell
      program="Program 01"
      title="Settings"
      actionBarLeft={
        <Link
          to="/"
          className="inline-flex items-center min-h-10 px-hmi-4 py-hmi-2 border border-ca-border text-hmi-body text-ca-ink"
        >
          Home
        </Link>
      }
    >
      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl p-hmi-6">
          <header className="mb-hmi-4 flex flex-wrap items-center justify-between gap-hmi-3 border-b border-ca-border pb-hmi-3">
            <div className="min-w-0">
              <h1 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
                Settings
              </h1>
              <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
                Device, capture, operator and retention configuration.
              </p>
            </div>
            <label className="relative flex w-full items-center gap-hmi-2 sm:w-80">
              <span className="sr-only">Filter settings</span>
              <Search size={14} aria-hidden className="absolute left-hmi-3 text-ca-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter settings..."
                aria-label="Filter settings"
                data-testid="settings-search"
                className="w-full min-h-9 rounded-md bg-ca-panel-2 border border-ca-border pl-8 pr-8 py-hmi-2 text-hmi-body text-ca-ink hmi-tabular placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear filter"
                  className="absolute right-hmi-2 grid h-6 w-6 place-items-center rounded-sm text-ca-ink-muted hover:text-ca-ink"
                >
                  <X size={12} aria-hidden />
                </button>
              ) : null}
            </label>
          </header>

          <div className="grid grid-cols-1 gap-hmi-5 lg:grid-cols-[minmax(200px,220px)_minmax(0,1fr)]">
            <aside className="lg:sticky lg:top-hmi-4 lg:self-start">
              <SettingsSidenav />
            </aside>

            <div className="space-y-hmi-5">
              {tiles.length > 0 ? (
                <nav aria-label="Settings subsections">
                  <ul className="grid grid-cols-2 gap-hmi-2 sm:grid-cols-4">
                    {tiles.map(({ to, label, Icon }) => (
                      <li key={to}>
                        <Link
                          to={to}
                          className="group flex items-center gap-hmi-3 rounded-md border border-ca-border bg-ca-panel px-hmi-3 py-hmi-3 text-hmi-body text-ca-ink transition hover:-translate-y-px hover:border-ca-select hover:shadow-[0_10px_30px_-14px_color-mix(in_oklab,var(--color-ca-select)_60%,transparent)]"
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-ca-border bg-ca-panel-2 text-ca-select transition group-hover:bg-ca-select/10">
                            <Icon size={16} aria-hidden />
                          </span>
                          <span className="font-medium">{label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ) : null}

              <div className="space-y-hmi-5">
                {showDataSource ? (
                  <SettingsGroup
                    id={SettingsGroupIdType.Datasource}
                    title="Data source"
                    description="Switch between bundled seed data and a live backend, and set the backend base URL."
                  >
                    <div className="lg:col-span-2">
                      <DataSourceCard />
                    </div>
                  </SettingsGroup>
                ) : null}
                {showVendor || showDiscovery || showReference ? (
                  <SettingsGroup
                    id={SettingsGroupIdType.Devicecapture}
                    title="Device and capture"
                    description="Vendor SDK, discovered devices, and reference imagery."
                  >
                    {showReference ? (
                      <div className="lg:col-span-2">
                        <ReferenceImageCard />
                      </div>
                    ) : null}
                    {showVendor ? (
                      <SettingsCard
                        Icon={Cpu}
                        title="Capture vendor"
                        description="Vendor SDK adapter used at boot. Mirrors the backend Capture Vendor setting; admin-gated and validated server-side."
                        savedAt={vendorSavedAt}
                      >
                        <VendorRadioGroup
                          vendor={vendor}
                          vendors={SUPPORTED_VENDORS}
                          onChange={saveVendor}
                          describedBy="capture-vendor-active"
                        />
                        <div className="mt-hmi-3 text-hmi-caption text-ca-ink-muted hmi-tabular">
                          <span id="capture-vendor-active">
                            Active:{" "}
                            <span className="text-ca-ink">{formatIdentifierLabel(vendor)}</span>
                          </span>
                        </div>
                        {vendorError && (
                          <div
                            className="mt-hmi-2 rounded-md border border-ca-ng/40 bg-ca-ng/10 px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ng"
                            role="alert"
                          >
                            {formatUiText(vendorError)}
                          </div>
                        )}
                      </SettingsCard>
                    ) : null}
                    {showDiscovery ? (
                      <div className="lg:col-span-2">
                        <SettingsDisclosure
                          title="Device discovery"
                          description="Probe attached cameras and pick the vendor SDK that matches. Auto-opens when the vendor changes."
                          openTrigger={vendor}
                        >
                          <DeviceDiscoveryPanel
                            activeVendor={vendor}
                            onVendorSelected={syncVendorFromDiscovery}
                          />
                        </SettingsDisclosure>
                      </div>
                    ) : null}
                  </SettingsGroup>
                ) : null}

                {showOperator || showRetention || showTooltips || showDensity || showFlavor ? (
                  <SettingsGroup
                    id={SettingsGroupIdType.Operatorretention}
                    title="Operator, retention and UI"
                    description="Operator identity, audit log retention, tool tooltip preferences, UI density, and UI layout flavor."
                  >
                    {showOperator ? (
                      <SettingsCard
                        Icon={UserRound}
                        title="Operator identity"
                        description="Single operator identity stamped on every log record and result row (spec 27.Operator.Id, Q-07)."
                        savedAt={savedAt}
                      >
                        <p className="sr-only">
                          Single operator identity stamped on every log record and result row (spec
                          27.Operator.Id, Q-07).
                        </p>
                        <label className="block text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
                          Operator ID
                          <input
                            type="text"
                            value={operatorId}
                            onChange={(e) => setOperatorId(e.target.value)}
                            placeholder="e.g. op-alice"
                            maxLength={64}
                            className="mt-hmi-1 block w-full min-h-10 rounded-md bg-ca-panel-2 border border-ca-border px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink hmi-tabular focus:border-ca-select focus:outline-none"
                          />
                        </label>
                        <div className="mt-hmi-3 flex items-center gap-hmi-3">
                          <button
                            type="button"
                            onClick={save}
                            className="inline-flex items-center gap-hmi-2 rounded-md bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110"
                          >
                            <Check size={14} aria-hidden />
                            Save operator ID
                          </button>
                        </div>
                      </SettingsCard>
                    ) : null}

                    {showRetention ? (
                      <SettingsCard
                        Icon={Archive}
                        title="Audit log retention"
                        description="Policy consumed by the retention worker. Rows older than the window, or beyond max on-disk size, are pruned and the action is itself audited."
                        savedAt={retentionSavedAt}
                      >
                        <label className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink">
                          <input
                            type="checkbox"
                            checked={retention.enabled}
                            onChange={(e) =>
                              saveRetention({ ...retention, enabled: e.target.checked })
                            }
                            className="h-4 w-4 accent-ca-select"
                          />
                          Enable scheduled rotation
                        </label>
                        <div className="mt-hmi-3 grid grid-cols-1 gap-hmi-3 sm:grid-cols-2">
                          <RetentionStepper
                            label="Retention window (days)"
                            value={retention.retentionDays}
                            min={RETENTION_MIN_DAYS}
                            max={RETENTION_MAX_DAYS}
                            step={1}
                            presets={RETENTION_DAY_PRESETS}
                            onChange={(next) =>
                              saveRetention({ ...retention, retentionDays: next })
                            }
                            helpText={`Range ${RETENTION_MIN_DAYS}-${RETENTION_MAX_DAYS} days.`}
                          />
                          <RetentionStepper
                            label="Max on-disk size (MB)"
                            value={retention.maxSizeMB}
                            min={RETENTION_MIN_MB}
                            max={RETENTION_MAX_MB}
                            step={1}
                            presets={RETENTION_MB_PRESETS}
                            onChange={(next) => saveRetention({ ...retention, maxSizeMB: next })}
                            helpText={`Range ${RETENTION_MIN_MB}-${RETENTION_MAX_MB} MB.`}
                          />
                        </div>
                        <div className="mt-hmi-3 flex flex-wrap items-center gap-hmi-2 text-hmi-caption text-ca-ink-muted hmi-tabular">
                          <span
                            className={
                              "inline-flex items-center gap-1 rounded-sm border px-hmi-2 py-[2px] " +
                              (retention.enabled
                                ? "border-ca-select/50 text-ca-select"
                                : "border-ca-border")
                            }
                          >
                            <span
                              className={
                                "h-1.5 w-1.5 rounded-full " +
                                (retention.enabled ? "bg-ca-select" : "bg-ca-ink-muted")
                              }
                            />
                            {retention.enabled ? "on" : "off"}
                          </span>
                          <span>{retention.retentionDays}d</span>
                          <span>/</span>
                          {retention.maxSizeMB}MB
                        </div>
                        {retentionError && (
                          <div
                            className="mt-hmi-2 rounded-md border border-ca-ng/40 bg-ca-ng/10 px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ng"
                            role="alert"
                            aria-live="polite"
                            aria-atomic="true"
                          >
                            {formatUiText(retentionError)}
                          </div>
                        )}
                      </SettingsCard>
                    ) : null}

                    {showTooltips ? (
                      <SettingsCard
                        Icon={Wand2}
                        title="Tools palette tooltips"
                        description="How tool hints appear on the editor left rail. Persisted per browser. Keyboard focus always reveals the tooltip."
                      >
                        <div
                          role="radiogroup"
                          aria-label="Tools palette tooltips"
                          className="flex gap-hmi-2 flex-wrap"
                        >
                          {(
                            [
                              { id: "hover", label: "Always on hover" },
                              { id: "on-demand", label: "On demand (focus only)" },
                            ] as ReadonlyArray<{ id: ToolTooltipMode; label: string }>
                          ).map((opt) => {
                            const active = toolTooltipMode === opt.id;

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                data-testid={`tool-tooltip-mode-${opt.id}`}
                                onClick={() => setToolTooltipMode(opt.id)}
                                className={
                                  active
                                    ? "inline-flex items-center rounded-md min-h-9 px-hmi-3 py-hmi-2 bg-ca-select text-ca-bg text-hmi-body font-semibold"
                                    : "inline-flex items-center rounded-md min-h-9 px-hmi-3 py-hmi-2 border border-ca-border bg-ca-panel-2 text-hmi-body text-ca-ink hover:border-ca-select"
                                }
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <div className="mt-hmi-3 text-hmi-caption text-ca-ink-muted hmi-tabular">
                          Active:{" "}
                          <span className="text-ca-ink">
                            {toolTooltipMode === "hover"
                              ? "Always on hover"
                              : "On demand (focus only)"}
                          </span>
                        </div>
                      </SettingsCard>
                    ) : null}

                    {showDensity ? (
                      <SettingsCard
                        Icon={Rows3}
                        title="UI density"
                        description="Unified padding, header height, and icon size for Layers, Rules, and every right-rail panel (Inspector tabs, Properties sub-panels, Layers toolbar). Comfortable keeps the default 40px hit target; Compact tightens rows, chevrons, and header buttons to fit more on smaller displays. Persisted per browser."
                      >
                        <div
                          role="radiogroup"
                          aria-label="UI density"
                          className="flex gap-hmi-2 flex-wrap"
                        >
                          {(
                            [
                              { id: "comfortable", label: "Comfortable" },
                              { id: "compact", label: "Compact" },
                            ] as ReadonlyArray<{ id: HeaderDensity; label: string }>
                          ).map((opt) => {
                            const active = headerDensity === opt.id;

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                data-testid={`ui-density-${opt.id}`}
                                onClick={() => setHeaderDensity(opt.id)}
                                className={
                                  active
                                    ? "inline-flex items-center rounded-md min-h-9 px-hmi-3 py-hmi-2 bg-ca-select text-ca-bg text-hmi-body font-semibold"
                                    : "inline-flex items-center rounded-md min-h-9 px-hmi-3 py-hmi-2 border border-ca-border bg-ca-panel-2 text-hmi-body text-ca-ink hover:border-ca-select"
                                }
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                        <div
                          className="mt-hmi-3 rounded-md border border-ca-border bg-ca-panel-2 overflow-hidden"
                          data-testid="ui-density-preview"
                          aria-label="UI density live preview"
                        >
                          <div className="px-hmi-3 py-hmi-1 text-hmi-caption uppercase tracking-wide text-ca-ink-muted border-b border-ca-border">
                            Preview
                          </div>
                          <ul className="divide-y divide-ca-border">
                            {["Presence check", "Barcode read", "OCR: serial"].map((label, i) => (
                              <li
                                key={label}
                                className={
                                  "flex items-center gap-hmi-2 px-hmi-3 hmi-tabular text-hmi-body text-ca-ink " +
                                  (headerDensity === "compact" ? "py-1" : "py-hmi-2")
                                }
                              >
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-ca-select/15 text-ca-select text-hmi-caption">
                                  {i + 1}
                                </span>
                                <span className="flex-1">{label}</span>
                                <span className="text-hmi-caption text-ca-ink-muted">roi</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-hmi-2 text-hmi-caption text-ca-ink-muted hmi-tabular">
                          Active:{" "}
                          <span className="text-ca-ink">
                            {headerDensity === "compact" ? "Compact" : "Comfortable"}
                          </span>
                        </div>
                      </SettingsCard>
                    ) : null}

                    {showFlavor ? (
                      <SettingsCard
                        Icon={Sun}
                        title="UI Layout Flavor"
                        description="Switch between the Modern dynamic UI and the classic Standard UI layout. Both flavors support Light and Dark themes natively."
                      >
                        <div className="flex items-center gap-hmi-3">
                          <FlavorToggle />
                          <div className="text-hmi-caption text-ca-ink-muted hmi-tabular">
                            Click to toggle layout structure.
                          </div>
                        </div>
                      </SettingsCard>
                    ) : null}
                  </SettingsGroup>
                ) : null}
              </div>
              {!anyMatch ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-lg border border-dashed border-ca-border bg-ca-panel-2 p-hmi-5 text-center text-hmi-body text-ca-ink-muted"
                >
                  No settings match "{query}".
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="ml-hmi-2 underline decoration-dotted text-ca-select"
                  >
                    Clear filter
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </HmiShell>
  );
}

function DataSourceCard() {
  const source = useDataSource();
  const baseUrl = useBackendBaseUrl();
  const [draft, setDraft] = useState<string>(baseUrl);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const persistRules = usePersistRulesServerSide();
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<null | { ok: boolean; message: string }>(null);

  useEffect(() => {
    setDraft(baseUrl);
  }, [baseUrl]);

  const saveBaseUrl = () => {
    const trimmed = draft.trim();

    if (trimmed && /^https?:\/\//i.test(trimmed) === false && trimmed.startsWith("/") === false) {
      setError("Enter a full URL starting with http://, https://, or /");

      return;
    }

    const stored = setBackendBaseUrl(trimmed, { reason: "settings" });
    setDraft(stored);
    setError(null);
    setSavedAt(Date.now());
  };

  const probe = async () => {
    setProbing(true);
    setProbeResult(null);
    try {
      const res = await apiFetch("/api/health", { method: "GET" });
      setProbeResult({
        ok: res.ok,
        message: res.ok
          ? `Backend responded ${res.status}`
          : `HTTP ${res.status} ${res.statusText}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setProbeResult({ ok: false, message: msg });
    } finally {
      setProbing(false);
    }
  };

  return (
    <SettingsCard
      Icon={Cloud}
      title="Data source"
      description="Seed uses bundled sample data (safe for demos). Backend routes every read and write through the configured API host. Base URL empty means same-origin."
      savedAt={savedAt}
    >
      <div className="flex flex-wrap items-center gap-hmi-3">
        <DataSourceToggle />
        <span className="text-hmi-caption text-ca-ink-muted hmi-tabular">
          Active: <span className="text-ca-ink">{source}</span>
        </span>
      </div>
      <label className="mt-hmi-3 block text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
        Backend base URL
        <input
          type="url"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="http://localhost:8787"
          spellCheck={false}
          className="mt-hmi-1 block w-full min-h-10 rounded-md bg-ca-panel-2 border border-ca-border px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink hmi-tabular focus:border-ca-select focus:outline-none"
        />
      </label>
      <div className="mt-hmi-3 flex flex-wrap items-center gap-hmi-2">
        <button
          type="button"
          onClick={saveBaseUrl}
          className="inline-flex items-center gap-hmi-2 rounded-md bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110"
        >
          <Check size={14} aria-hidden />
          Save base URL
        </button>
        <button
          type="button"
          onClick={probe}
          disabled={probing}
          className="inline-flex items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2 px-hmi-3 py-hmi-2 text-hmi-body text-ca-ink transition hover:border-ca-select disabled:opacity-60"
        >
          {probing ? "Testing..." : "Test connection"}
        </button>
        {probeResult ? (
          <span
            className={
              "text-hmi-caption hmi-tabular " + (probeResult.ok ? "text-ca-select" : "text-ca-ng")
            }
            role="status"
          >
            {probeResult.message}
          </span>
        ) : null}
      </div>
      {error ? (
        <div
          className="mt-hmi-2 rounded-md border border-ca-ng/40 bg-ca-ng/10 px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ng"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <p className="mt-hmi-2 text-hmi-caption text-ca-ink-muted">
        Stored per-browser under <code>ca.data-source.baseUrl</code>. Switching to Backend probes{" "}
        <code>/api/health</code> against this URL before enabling live mode.
      </p>
      <div className="mt-hmi-4 border-t border-ca-border pt-hmi-4">
        <label className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink">
          <input
            type="checkbox"
            checked={persistRules}
            onChange={(e) => setPersistRulesServerSide(e.target.checked, { reason: "settings" })}
            className="h-4 w-4 accent-ca-select"
          />
          Persist rules server-side
        </label>
        <p className="mt-hmi-1 text-hmi-caption text-ca-ink-muted">
          Defaults to ON in Backend mode. When disabled, rule mutations only update local IndexedDB.
        </p>
      </div>
    </SettingsCard>
  );
}
