export enum DeviceDiscoveryPanelCallerType {
  GetDiscoveredDevices = "getDiscoveredDevices",
  SelectCaptureDevice = "selectCaptureDevice",
  ClientGate = "client-gate",
}
import { ErrorSourceType } from "@/lib/errors/error-record";
import { FeatureNameType } from "@/lib/license";
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { showToastError } from "@/lib/errors/notify";

import { getDiscoveredDevices, selectCaptureDevice } from "@/lib/capture.functions";
import type {
  CaptureErrorCode,
  CaptureVendor,
  DiscoveredCaptureDevice,
} from "@/lib/capture.shared";
import { parseCaptureErrorCode, parseCorrelationId } from "@/lib/capture.shared";
import { useLicenseFeatures } from "@/hooks/useLicenseFeatures";
import { formatIdentifierLabel } from "@/lib/display-labels";
import { reportError } from "@/lib/errors";
import { useHardwareMockToggle } from "@/hooks/use-hardware-mock";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type Props = {
  activeVendor: CaptureVendor;
  onVendorSelected: (vendor: CaptureVendor) => void;
};

type CaptureFailure = {
  code: CaptureErrorCode;
  message: string;
  correlationId: string | null;
};

// Human-facing copy for each locked E_* code (spec/21-app/67-v2-discovery-contract.md).
const CAPTURE_ERROR_COPY: Record<CaptureErrorCode, string> = {
  E_SEC_UNAUTH: "Sign in required to change the active camera.",
  E_SEC_DENIED: "Admin role required to change the active camera.",
  E_LIC_FEATURE_DENIED: "This action is not covered by the active license.",
  E_CFG_BAD_INPUT: "Selection payload rejected: vendor or serial is invalid.",
  E_CFG_UNSUPPORTED_VENDOR: "Vendor is not supported by this build.",
  E_CFG_UNKNOWN_DEVICE: "That camera is no longer reported by discovery. Rescan and retry.",
  E_CAP_SDK_ABSENT: "Vendor SDK is not installed on the host. Contact operations.",
  E_CAP_ENUM_FAILED: "Vendor enumeration failed. Check camera link and rescan.",
  E_SEC_AUDIT_FAILED: "Selection was rolled back: audit sink refused the event.",
  E_AUDIT_EXPORT_UNAUTHORIZED: "Audit export requires the admin role.",
  E_AUDIT_EXPORT_FEATURE_LOCKED: "Audit export is not covered by the active license tier.",
  E_AUDIT_EXPORT_WINDOW_TOO_WIDE: "Audit export window exceeds the 90-day cap.",
  E_AUDIT_EXPORT_SIZE_CAP: "Audit export bundle exceeds the 256 MiB cap.",
  E_AUDIT_EXPORT_EMPTY_WINDOW: "No audit events matched that window.",
  E_AUDIT_EXPORT_DISABLED: "Audit export is disabled by configuration.",
  E_AUDIT_EXPORT_COUNT_MISMATCH: "Audit export failed: event count did not match the manifest.",
  E_AUDIT_EXPORT_CHECKSUM_MISMATCH:
    "Audit export failed: payload checksum did not match the manifest.",
  E_AUDIT_EXPORT_SCHEMA_UNSUPPORTED: "Audit export bundle uses an unsupported schema version.",
  E_AUDIT_EXPORT_STORAGE_FAILED: "Audit export storage upload failed.",
  E_AUDIT_EXPORT_BAD_PATH: "Audit export download path was rejected.",
  E_AUDIT_EXPORT_SIGNED_URL_FAILED: "Audit export download link could not be created.",

  E_INTERNAL: "Unexpected error. Check /ops for the matching audit row.",
};

function toFailure(err: unknown): CaptureFailure {
  const raw = err instanceof Error ? err.message : String(err);
  const code = parseCaptureErrorCode(raw);
  const correlationId = parseCorrelationId(raw);

  return { code, message: CAPTURE_ERROR_COPY[code], correlationId };
}

export function DeviceDiscoveryPanel({
  activeVendor,
  onVendorSelected,
}: Props): React.JSX.Element | null {
  const [devices, setDevices] = useState<DiscoveredCaptureDevice[]>([]);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [lastFailure, setLastFailure] = useState<CaptureFailure | null>(null);
  const discover = useServerFn(getDiscoveredDevices);
  const selectDeviceFn = useServerFn(selectCaptureDevice);
  const { isFeatureEnabled } = useLicenseFeatures();
  const multiVendorAllowed = isFeatureEnabled(FeatureNameType.MultiVendorCameraSelection);
  const lastToastRef = useRef<string | number | null>(null);
  const { mock, hydrated, setMock } = useHardwareMockToggle();

  // Surface every capture failure through the shared error-toasts pattern:
  // (1) sonner toast for the operator, (2) reportError so error-bus logs +
  // any subscribed dialog / prod-toast provider fires, (3) retain the last
  // failure so tests and screen readers still get a live alert region.
  const surfaceFailure = useCallback(
    (caller: DeviceDiscoveryPanelCallerType, failure: CaptureFailure, raw?: unknown) => {
      setLastFailure(failure);

      if (lastToastRef.current != null) toast.dismiss(lastToastRef.current);
      const description = failure.correlationId
        ? `${failure.message} (cid=${failure.correlationId})`
        : failure.message;
      lastToastRef.current = showToastError(
        formatIdentifierLabel(failure.code),
        raw ?? new Error(description),
        { source: `hmi/DeviceDiscovery.${caller}` },
      );
      reportError(
        caller === DeviceDiscoveryPanelCallerType.ClientGate
          ? ErrorSourceType.Manual
          : ErrorSourceType.ServerFn,
        raw ?? new Error(failure.message),
        {
          caller,
          captureCode: failure.code,
          correlationId: failure.correlationId,
        },
      );
    },
    [],
  );

  const refresh = useCallback(() => {
    setLastFailure(null);
    discover()
      .then((res) => {
        setDevices(res.devices);
        setScannedAt(new Date(res.scannedAt).toLocaleTimeString());
      })
      .catch((err) =>
        surfaceFailure(DeviceDiscoveryPanelCallerType.GetDiscoveredDevices, toFailure(err), err),
      );
  }, [discover, surfaceFailure]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSelectDevice = (device: DiscoveredCaptureDevice) => {
    setLastFailure(null);
    // Client-side Casbin-style gate mirrors the server's requireServerFeature.
    if (device.vendor !== activeVendor && !multiVendorAllowed) {
      surfaceFailure(DeviceDiscoveryPanelCallerType.ClientGate, {
        code: "E_LIC_FEATURE_DENIED",
        message: CAPTURE_ERROR_COPY.E_LIC_FEATURE_DENIED,
        correlationId: null,
      });

      return;
    }

    selectDeviceFn({ data: { vendor: device.vendor, serial: device.serial } })
      .then((res) => {
        setDevices(res.devices);
        onVendorSelected(res.vendor);
      })
      .catch((err) =>
        surfaceFailure(DeviceDiscoveryPanelCallerType.SelectCaptureDevice, toFailure(err), err),
      );
  };

  return (
    <section className="space-y-hmi-2 max-w-3xl">
      <div className="flex items-center justify-between gap-hmi-2">
        <h2 className="text-hmi-title uppercase tracking-wide text-ca-ink">Camera discovery</h2>
        <div className="flex items-center gap-hmi-4">
          {hydrated && (
            <div className="flex items-center gap-hmi-2 min-h-[40px]">
              <Switch id="mock-camera-toggle" checked={mock} onCheckedChange={setMock} />
              <Label
                htmlFor="mock-camera-toggle"
                className="text-hmi-body text-ca-ink cursor-pointer"
              >
                Mock Device (Seed Mode)
              </Label>
            </div>
          )}
          <button
            type="button"
            onClick={refresh}
            className="min-h-[40px] px-hmi-3 py-hmi-1 border border-ca-border text-hmi-body text-ca-ink hover:bg-ca-panel-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ca-primary"
          >
            Rescan
          </button>
        </div>
      </div>
      <div className="grid gap-hmi-2 md:grid-cols-3">
        {devices.map((device) => {
          const gated = device.vendor !== activeVendor && !multiVendorAllowed;

          return (
            <button
              key={device.id}
              type="button"
              onClick={() => handleSelectDevice(device)}
              disabled={gated}
              data-feature-gated={gated ? FeatureNameType.MultiVendorCameraSelection : undefined}
              className={
                device.selected
                  ? "border border-ca-primary bg-ca-panel-2 p-hmi-3 text-left min-h-[40px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ca-primary"
                  : gated
                    ? "border border-ca-border bg-ca-panel p-hmi-3 text-left opacity-50 cursor-not-allowed min-h-[40px]"
                    : "border border-ca-border bg-ca-panel p-hmi-3 text-left min-h-[40px] hover:bg-ca-panel-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ca-primary"
              }
              title={gated ? "License required: Multi Vendor Camera Selection" : undefined}
            >
              <div className="flex items-center justify-between gap-hmi-2">
                <span className="text-hmi-body font-medium text-ca-ink">{device.label}</span>
                <span className="text-hmi-caption text-ca-ok">
                  {formatIdentifierLabel(device.status)}
                </span>
              </div>
              <div className="mt-hmi-2 space-y-hmi-1 text-hmi-caption text-ca-ink-muted hmi-tabular">
                <div>
                  {device.vendor === activeVendor
                    ? "Active Vendor"
                    : formatIdentifierLabel(device.vendor)}
                </div>
                <div>{device.model}</div>
                <div>
                  {device.transport} / {device.serial}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-hmi-caption text-ca-ink-muted hmi-tabular">
        {scannedAt ? `Scanned at ${scannedAt}` : "Scanning"}
      </div>
      {/*
        Screen-reader only live region. The visible surface is the sonner
        toast raised by `surfaceFailure`; this element keeps the a11y
        contract and the `data-error-code` / `data-cid` hooks used by
        e2e tests without doubling the UI as a banner.
      */}
      <div
        className="sr-only"
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        data-testid="device-discovery-error-live"
        data-error-code={lastFailure?.code ?? undefined}
        data-cid={lastFailure?.correlationId ?? undefined}
      >
        {lastFailure
          ? `${formatIdentifierLabel(lastFailure.code)} ${lastFailure.message}${lastFailure.correlationId ? ` cid=${lastFailure.correlationId}` : ""}`
          : ""}
      </div>
    </section>
  );
}
