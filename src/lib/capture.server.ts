import { ClientLogger } from "@/lib/observability/client-logger";
import type {
  CaptureDiscoverySnapshot,
  CaptureVendor,
  DiscoveredCaptureDevice,
  SelectedCaptureDevice,
  VendorStatus,
} from "./capture.shared";
import { SUPPORTED_VENDORS } from "./capture.shared";

// Mirrors app/capture/vendor_device_io.py::list_devices semantics for the
// Worker runtime (child_process banned per server-runtime rules). Vendors
// listed in CAPTURE_DISABLED_VENDORS env are reported as SDK-absent, matching
// the Python WARN path at app/capture/vendor_device_io.py:73.

let currentVendor: CaptureVendor = "pylon";
let selectedDeviceId: string | null = "pylon:24477108";

type SelectionState = { currentVendor: CaptureVendor; selectedDeviceId: string | null };
type AuditResult = { id: number; ts: string };
type AuditEmit = (evt: AuditPayload) => AuditResult | Promise<AuditResult>;

export type AuditPayload = {
  actor: string;
  prior: SelectedCaptureDevice | null;
  next: SelectedCaptureDevice;
};

const DEVICE_CATALOG: readonly Omit<DiscoveredCaptureDevice, "selected">[] = [
  {
    id: "pylon:24477108",
    vendor: "pylon",
    label: "Pylon Line Camera 01",
    model: "Basler ace2",
    serial: "24477108",
    transport: "GigE",
    status: "online",
  },
  {
    id: "spinnaker:18461209",
    vendor: "spinnaker",
    label: "Spinnaker Line Camera 01",
    model: "FLIR Blackfly S",
    serial: "18461209",
    transport: "USB3",
    status: "online",
  },
  {
    id: "vimba:DEV-0042",
    vendor: "vimba",
    label: "Vimba Line Camera 01",
    model: "Allied Vision Alvium",
    serial: "DEV-0042",
    transport: "GigE",
    status: "online",
  },
];

function readDisabledVendors(): ReadonlySet<CaptureVendor> {
  const raw = (typeof process !== "undefined" ? process.env.CAPTURE_DISABLED_VENDORS : "") || "";
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as CaptureVendor[];

  return new Set(parts.filter((v) => (SUPPORTED_VENDORS as readonly string[]).includes(v)));
}

function computeVendorStatus(
  disabled: ReadonlySet<CaptureVendor>,
): Record<CaptureVendor, VendorStatus> {
  const status = {} as Record<CaptureVendor, VendorStatus>;
  for (const vendor of SUPPORTED_VENDORS) {
    const isDisabled = disabled.has(vendor);

    if (isDisabled) {
      ClientLogger.warn(
        `[capture.discover] vendor=${vendor} available=false error_code=E_CAP_SDK_ABSENT`,
      );
      status[vendor] = { available: false, count: 0, errorCode: "E_CAP_SDK_ABSENT" };
      continue;
    }

    const count = DEVICE_CATALOG.filter((d) => d.vendor === vendor).length;
    status[vendor] = { available: true, count };
  }

  return status;
}

export function readCurrentVendor(): { vendor: CaptureVendor; supported: readonly string[] } {
  return { vendor: currentVendor, supported: SUPPORTED_VENDORS };
}

export function writeCurrentVendor(vendor: CaptureVendor): CaptureVendor {
  currentVendor = vendor;

  return currentVendor;
}

export function selectedDeviceRef(): SelectedCaptureDevice | null {
  const device = DEVICE_CATALOG.find((row) => row.id === selectedDeviceId);

  return device ? { vendor: device.vendor, serial: device.serial } : null;
}

export function readDiscoverySnapshot(): CaptureDiscoverySnapshot {
  const disabled = readDisabledVendors();
  const vendorStatus = computeVendorStatus(disabled);
  const devices = DEVICE_CATALOG.filter((d) => vendorStatus[d.vendor].available).map((device) => ({
    ...device,
    selected: device.id === selectedDeviceId,
  }));

  return { devices, selectedDeviceId, scannedAt: new Date().toISOString(), vendorStatus };
}

export function writeSelectedDevice(
  vendor: CaptureVendor,
  serial: string,
  actor = "system",
): DiscoveredCaptureDevice {
  const device = readDiscoverySnapshot().devices.find(
    (row) => row.vendor === vendor && row.serial === serial,
  );

  if (device) {
    selectedDeviceId = device.id;
    currentVendor = device.vendor;
    ClientLogger.info(`[capture.select] vendor=${vendor} serial=${serial} actor=${actor} result=ok`);

    return { ...device, selected: true };
  }

  ClientLogger.warn(
    `[capture.select] vendor=${vendor} serial=${serial} actor=${actor} result=E_CFG_UNKNOWN_DEVICE`,
  );

  throw new Error(`E_CFG_UNKNOWN_DEVICE: ${vendor}:${serial}`);
}

export function deviceRefText(device: SelectedCaptureDevice | null): string {
  return device ? `${device.vendor}:${device.serial}` : "none";
}

export async function selectDeviceWithAudit(
  vendor: CaptureVendor,
  serial: string,
  actor: string,
  emit: AuditEmit,
) {
  const state: SelectionState = { currentVendor, selectedDeviceId };
  const prior = selectedDeviceRef();
  const device = writeSelectedDevice(vendor, serial, actor);
  const next = { vendor: device.vendor, serial: device.serial };
  try {
    const audit = await emit({ actor, prior, next });

    return { audit, device, next, prior };
  } catch (error) {
    currentVendor = state.currentVendor;
    selectedDeviceId = state.selectedDeviceId;
    ClientLogger.error(`[capture.select] actor=${actor} result=E_SEC_AUDIT_FAILED`, error);

    throw new Error("E_SEC_AUDIT_FAILED: selection rolled back");
  }
}
