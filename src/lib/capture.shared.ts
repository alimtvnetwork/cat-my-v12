export const SUPPORTED_VENDORS = ["pylon", "spinnaker", "vimba"] as const;

export type CaptureVendor = (typeof SUPPORTED_VENDORS)[number];

export type DiscoveredCaptureDevice = {
  id: string;
  vendor: CaptureVendor;
  label: string;
  model: string;
  serial: string;
  transport: string;
  status: "online" | "busy" | "unavailable";
  selected: boolean;
};

export type VendorStatus = {
  available: boolean;
  count: number;
  errorCode?: "E_CAP_SDK_ABSENT" | "E_CAP_ENUM_FAILED";
};

export type SelectedCaptureDevice = {
  vendor: CaptureVendor;
  serial: string;
};

export type CaptureDiscoverySnapshot = {
  devices: DiscoveredCaptureDevice[];
  selectedDeviceId: string | null;
  scannedAt: string;
  vendorStatus: Record<CaptureVendor, VendorStatus>;
};

export function isCaptureVendor(value: string): value is CaptureVendor {
  return (SUPPORTED_VENDORS as readonly string[]).includes(value);
}

export function parseVendorRequest(input: unknown): { vendor: CaptureVendor } {
  const vendor = (input as { vendor?: unknown } | null)?.vendor;

  if (typeof vendor === "string" && isCaptureVendor(vendor)) return { vendor };

  throw new Error(`E_CFG_UNSUPPORTED_VENDOR: ${String(vendor)}`);
}

const SERIAL_RE = /^[A-Za-z0-9._:-]+$/;

export function parseDeviceSelection(input: unknown): { vendor: CaptureVendor; serial: string } {
  const raw = (input ?? {}) as Record<string, unknown>;
  const allowed = new Set(["vendor", "serial"]);
  for (const k of Object.keys(raw))
    if (allowed.has(k) === false) throw new Error(`E_CFG_BAD_INPUT: unknown key ${k}`);
  const vendor = raw.vendor;

  if (typeof vendor !== "string" || isCaptureVendor(vendor) === false)

    throw new Error("E_CFG_BAD_INPUT: vendor");
  const serial = typeof raw.serial === "string" ? raw.serial.trim() : "";
  const hasValidSerial = serial.length >= 1 && serial.length <= 128 && SERIAL_RE.test(serial);

  if (hasValidSerial) return { vendor, serial };

  throw new Error("E_CFG_BAD_INPUT: serial");
}
// ---- Capture error envelope (Plan 15 Step 10) --------------------------
// Locked codes from spec/21-app/67-v2-discovery-contract.md Failure Taxonomy.
export const CAPTURE_ERROR_CODES = [
  "E_SEC_UNAUTH",
  "E_SEC_DENIED",
  "E_LIC_FEATURE_DENIED",
  "E_CFG_BAD_INPUT",
  "E_CFG_UNSUPPORTED_VENDOR",
  "E_CFG_UNKNOWN_DEVICE",
  "E_CAP_SDK_ABSENT",
  "E_CAP_ENUM_FAILED",
  "E_SEC_AUDIT_FAILED",
  "E_AUDIT_EXPORT_UNAUTHORIZED",
  "E_AUDIT_EXPORT_FEATURE_LOCKED",
  "E_AUDIT_EXPORT_WINDOW_TOO_WIDE",
  "E_AUDIT_EXPORT_SIZE_CAP",
  "E_AUDIT_EXPORT_EMPTY_WINDOW",
  "E_AUDIT_EXPORT_DISABLED",
  "E_AUDIT_EXPORT_COUNT_MISMATCH",
  "E_AUDIT_EXPORT_CHECKSUM_MISMATCH",
  "E_AUDIT_EXPORT_SCHEMA_UNSUPPORTED",
  "E_AUDIT_EXPORT_STORAGE_FAILED",
  "E_AUDIT_EXPORT_BAD_PATH",
  "E_AUDIT_EXPORT_SIGNED_URL_FAILED",

  "E_INTERNAL",
] as const;
export type CaptureErrorCode = (typeof CAPTURE_ERROR_CODES)[number];

const CID_RE = /\s*\[cid=([A-Za-z0-9_-]{4,64})\]\s*$/;

export function newCorrelationId(): string {
  const raw =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

  return raw.replace(/-/g, "").slice(0, 12);
}

export class CaptureError extends Error {
  readonly code: CaptureErrorCode;
  readonly correlationId: string;
  constructor(code: CaptureErrorCode, message: string, correlationId?: string) {
    const cid = correlationId ?? newCorrelationId();
    super(`${code}: ${message} [cid=${cid}]`);
    this.name = "CaptureError";
    this.code = code;
    this.correlationId = cid;
  }
}

function extractCid(raw: string): { message: string; cid?: string } {
  const m = raw.match(CID_RE);

  if (!m) return { message: raw };

  return { message: raw.replace(CID_RE, ""), cid: m[1] };
}

/** Normalize any thrown value into a CaptureError with a known code + cid. */
export function toCaptureError(err: unknown, correlationId?: string): CaptureError {
  if (err instanceof CaptureError) return err;
  const raw = err instanceof Error ? err.message : String(err);
  const { message, cid } = extractCid(raw);
  const useCid = correlationId ?? cid;
  for (const code of CAPTURE_ERROR_CODES) {
    if (message.startsWith(`${code}:`) || message === code) {
      return new CaptureError(code, message.slice(code.length + 1).trim() || code, useCid);
    }
  }

  return new CaptureError("E_INTERNAL", message || "unknown", useCid);
}

/** Parse an error message emitted by a capture server fn back into its code. */
export function parseCaptureErrorCode(message: string | undefined | null): CaptureErrorCode {
  const raw = String(message ?? "");
  for (const code of CAPTURE_ERROR_CODES) if (raw.startsWith(code)) return code;

  return "E_INTERNAL";
}

/** Extract the [cid=...] suffix from a serialized CaptureError message. */
export function parseCorrelationId(message: string | undefined | null): string | null {
  const m = String(message ?? "").match(CID_RE);

  return m ? m[1] : null;
}