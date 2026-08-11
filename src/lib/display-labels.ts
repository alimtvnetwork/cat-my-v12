const STATUS_PREFIXES = new Set(["E", "I", "W"]);
const CODE_NAMESPACE_PREFIXES = new Set(["UI", "SEC", "CFG", "CAP", "LIC", "RPC"]);

const KNOWN_LABELS: Record<string, string> = {
  I_UI_RULES_REPLACED: "Rules Replaced",
  I_UI_SAVE_CLICKED: "Save Clicked",
  I_UI_PERSIST_WRITE: "Save Written",
  I_UI_PUBLISH_STUB: "Publish Requested",
  E_UI_LOG_STREAM_OVERFLOW: "Log Stream Overflow",
  I_SEC_AUDIT_PRUNED: "Audit Pruned",
  E_SEC_RETENTION_FAILED: "Retention Failed",
  E_SEC_DENIAL_BURST: "Denial Burst",
  I_SEC_ADMIN_WRITE: "Admin Write",
  E_SEC_ROLE_DENIED: "Role Denied",
  E_SEC_DENIED: "Access Denied",
  E_CFG_UNKNOWN_DEVICE: "Unknown Device",
  E_CFG_UNSUPPORTED_VENDOR: "Unsupported Vendor",
  E_CFG_BAD_INPUT: "Bad Input",
  E_CAP_SDK_ABSENT: "Camera SDK Absent",
  E_CAP_ENUM_FAILED: "Camera Enumeration Failed",
  E_SEC_AUDIT_FAILED: "Audit Failed",
  E_LIC_FEATURE_DENIED: "Feature Not Licensed",
  E_AUDIT_EXPORT_UNAUTHORIZED: "Audit Export Unauthorized",
  E_AUDIT_EXPORT_FEATURE_LOCKED: "Audit Export Feature Locked",
  E_AUDIT_EXPORT_WINDOW_TOO_WIDE: "Audit Export Window Too Wide",
  E_AUDIT_EXPORT_SIZE_CAP: "Audit Export Size Cap",
  E_AUDIT_EXPORT_EMPTY_WINDOW: "Audit Export Empty Window",
  E_AUDIT_EXPORT_DISABLED: "Audit Export Disabled",
  E_AUDIT_EXPORT_COUNT_MISMATCH: "Audit Export Count Mismatch",
  E_AUDIT_EXPORT_CHECKSUM_MISMATCH: "Audit Export Checksum Mismatch",
  E_AUDIT_EXPORT_SCHEMA_UNSUPPORTED: "Audit Export Schema Unsupported",
  E_AUDIT_EXPORT_STORAGE_FAILED: "Audit Export Storage Failed",
  E_AUDIT_EXPORT_BAD_PATH: "Audit Export Bad Path",
  E_AUDIT_EXPORT_SIGNED_URL_FAILED: "Audit Export Signed URL Failed",
  E_INTERNAL: "Internal Error",
  AuditBundleExportRequested: "Audit Bundle Export Requested",
  AuditBundleExported: "Audit Bundle Exported",
  AuditBundleExportDenied: "Audit Bundle Export Denied",
  AuditBundleExportFailed: "Audit Bundle Export Failed",
  AuditBundleDownloadUrlIssued: "Audit Bundle Download URL Issued",
  run_active: "Run Active",
  // Plan 66 step 22 (CX-02) slice 2: function-library (fn.*) and chain-event (ce.*) codes.
  "fn.id.empty": "Function ID Missing",
  "fn.name.empty": "Function Name Missing",
  "fn.source.empty": "Function Source Missing",
  "fn.source.tooLarge": "Function Source Too Large",
  "fn.timestamps.invalid": "Function Timestamps Invalid",
  "ce.id.empty": "Chain Event ID Missing",
  "ce.trigger.unknown": "Chain Event Trigger Unknown",
  "ce.functionId.empty": "Chain Event Function ID Missing",
  "ce.ruleId.missing": "Chain Event Rule ID Missing",
  "ce.ruleId.unexpected": "Chain Event Rule ID Not Allowed",
  "ce.order.invalid": "Chain Event Order Invalid",
  "ce.functionId.dangling": "Chain Event Function Not Found",
  "ce.run.threw": "Chain Event Threw",
  "ce.run.timeout": "Chain Event Timed Out",
  "persist.read.threw": "Storage Read Failed",
  "persist.write.threw": "Storage Write Failed",
  "persist.write.quota": "Storage Quota Exceeded",
  "persist.parse.failed": "Stored Data Unreadable",
  "persist.validation.failed": "Stored Data Invalid",
};

const ACRONYMS = new Set(["ID", "OK", "NG", "SDK", "URL", "OCR", "JSON", "CLI", "CID", "DB", "MB"]);

function splitIdentifier(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function titleWord(word: string): string {
  const upper = word.toUpperCase();

  if (ACRONYMS.has(upper)) return upper;

  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function formatIdentifierLabel(value: unknown): string {
  const raw = String(value ?? "").trim();

  if (!raw) return "";

  if (KNOWN_LABELS[raw]) return KNOWN_LABELS[raw];

  const originalParts = splitIdentifier(raw);
  let parts = originalParts;

  if (parts.length > 1 && STATUS_PREFIXES.has(parts[0].toUpperCase())) {
    parts = parts.slice(1);
  }

  if (parts.length > 1 && CODE_NAMESPACE_PREFIXES.has(parts[0].toUpperCase())) {
    parts = parts.slice(1);
  }

  return parts.map(titleWord).join(" ");
}

export function formatUiText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s*->\s*/g, " to ")
    .replace(
      /\b([A-Za-z][A-Za-z0-9]*(?:[_.][A-Za-z0-9]+)+|[A-Z][A-Za-z0-9]+[A-Z][A-Za-z0-9]+)\b/g,
      (match) => formatIdentifierLabel(match),
    )
    .replace(
      /\b([a-z]+)=([A-Za-z0-9_.-]+)\b/g,
      (_match, key: string, val: string) =>
        `${formatIdentifierLabel(key)} ${formatIdentifierLabel(val)}`,
    );
}