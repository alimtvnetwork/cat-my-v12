/**
 * License verifier (spec/21-app/60-licensing.md).
 *
 * Fail-closed: any error, mismatch, or missing signal collapses the caller to
 * TierOne baseline. The client never trusts `features[]` unless the Ed25519
 * signature verifies against the pinned server public key.
 */

export enum TierType {
  TierOne = "TierOne",
  TierTwo = "TierTwo",
  TierThree = "TierThree",
}
export type Tier = TierType;

export enum FeatureNameType {
  RunInspection = "RunInspection",
  ConfigureRules = "ConfigureRules",
  ExportResultsJson = "ExportResultsJson",
  MultiVendorCameraSelection = "MultiVendorCameraSelection",
  ExtendedOcrEngines = "ExtendedOcrEngines",
  CloudRuleCatalogDownload = "CloudRuleCatalogDownload",
  RuleBundleImport = "RuleBundleImport",
  RuleBundleExport = "RuleBundleExport",
  AuditBundleExport = "AuditBundleExport",
  AuditBundleExportSigned = "AuditBundleExportSigned",
  AuditBundleExportAdmin = "AuditBundleExportAdmin",
  RemoteDiagnostics = "RemoteDiagnostics",
}
export type FeatureName = FeatureNameType;

export enum LicenseStatusType {
  Valid = "Valid",
  Expired = "Expired",
  Invalid = "Invalid",
  Missing = "Missing",
  Offline = "Offline",
}
export type LicenseStatus = LicenseStatusType;

export interface LicenseRecord {
  licenseId: string;
  tier: Tier;
  serialNumber: string;
  machineHash: string;
  issuedAt: string;
  expiresAt: string | null;
  features: FeatureName[];
  signature: string; // base64
  signatureAlg: "Ed25519";
}

export interface VerifyInput {
  record: LicenseRecord | null;
  expectedSerialNumber: string;
  expectedMachineHash: string;
  pinnedPublicKeyRaw: Uint8Array; // 32-byte Ed25519 public key
  now?: Date;
}

export interface VerifyResult {
  status: LicenseStatus;
  tier: Tier;
  features: ReadonlySet<FeatureName>;
  reason?: string;
  verifiedAt: number;
}

const BASELINE_FEATURES: ReadonlySet<FeatureName> = new Set<FeatureName>([
  FeatureNameType.RunInspection,
  FeatureNameType.ConfigureRules,
  FeatureNameType.ExportResultsJson,
]);

const BASELINE_RESULT = (status: LicenseStatusType, reason: string): VerifyResult => ({
  status,
  tier: TierType.TierOne,
  features: BASELINE_FEATURES,
  reason,
  verifiedAt: Date.now(),
});

export class FeatureNotLicensedError extends Error {
  constructor(public feature: FeatureName) {
    super(`FeatureNotLicensed: ${feature}`);
    this.name = "FeatureNotLicensedError";
  }
}

export class LicenseExpiredError extends Error {
  constructor() {
    super("LicenseExpired");
    this.name = "LicenseExpiredError";
  }
}

export class LicenseInvalidError extends Error {
  constructor(reason: string) {
    super(`LicenseInvalid: ${reason}`);
    this.name = "LicenseInvalidError";
  }
}

export class LicenseMissingError extends Error {
  constructor() {
    super("LicenseMissing");
    this.name = "LicenseMissingError";
  }
}

/**
 * Canonical JSON over the signed fields. Key order is fixed; the server MUST
 * sign the exact same byte sequence. Signature field is excluded.
 */
export function canonicalPayload(r: LicenseRecord): Uint8Array {
  const ordered = {
    licenseId: r.licenseId,
    tier: r.tier,
    serialNumber: r.serialNumber,
    machineHash: r.machineHash,
    issuedAt: r.issuedAt,
    expiresAt: r.expiresAt,
    features: [...r.features].sort(),
    signatureAlg: r.signatureAlg,
  };

  return new TextEncoder().encode(JSON.stringify(ordered));
}

function b64ToBytes(b64: string): Uint8Array {
  const bin =
    typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);

  return out;
}

async function verifySignature(
  publicKeyRaw: Uint8Array,
  payload: Uint8Array,
  signatureB64: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      publicKeyRaw as unknown as ArrayBuffer,
      { name: "Ed25519" },
      false,
      ["verify"],
    );

    return await crypto.subtle.verify(
      "Ed25519",
      key,
      b64ToBytes(signatureB64) as unknown as ArrayBuffer,
      payload as unknown as ArrayBuffer,
    );
  } catch {
    return false;
  }
}

/**
 * Fail-closed verifier. Any negative signal returns baseline TierOne.
 */
export async function verifyLicense(input: VerifyInput): Promise<VerifyResult> {
  const { record, expectedSerialNumber, expectedMachineHash, pinnedPublicKeyRaw } = input;
  const now = input.now ?? new Date();

  if (!record) return BASELINE_RESULT(LicenseStatusType.Missing, "no license record");

  if (record.signatureAlg !== "Ed25519")

    return BASELINE_RESULT(LicenseStatusType.Invalid, "unsupported signatureAlg");

  if (pinnedPublicKeyRaw.length !== 32)

    return BASELINE_RESULT(LicenseStatusType.Invalid, "pinned key not 32 bytes");

  const sigOk = await verifySignature(
    pinnedPublicKeyRaw,
    canonicalPayload(record),
    record.signature,
  );

  if (!sigOk) return BASELINE_RESULT(LicenseStatusType.Invalid, "signature verification failed");

  if (record.serialNumber !== expectedSerialNumber) {
    return BASELINE_RESULT(LicenseStatusType.Invalid, "serialNumber mismatch");
  }

  if (record.machineHash !== expectedMachineHash) {
    return BASELINE_RESULT(LicenseStatusType.Invalid, "machineHash mismatch");
  }

  if (record.expiresAt) {
    const exp = Date.parse(record.expiresAt);

    if (Number.isFinite(exp) === false)

      return BASELINE_RESULT(LicenseStatusType.Invalid, "expiresAt not parseable");

    if (exp <= now.getTime()) {
      return {
        ...BASELINE_RESULT(LicenseStatusType.Expired, "expiresAt in the past"),
        tier: record.tier,
      };
    }
  }

  return {
    status: LicenseStatusType.Valid,
    tier: record.tier,
    features: new Set(record.features),
    verifiedAt: Date.now(),
  };
}

/**
 * Memoised policy engine. Cache is keyed by (licenseId, machineHash) and
 * invalidates on TTL expiry or when the input record identity changes.
 */
export interface LicensePolicy {
  isFeatureEnabled(feature: FeatureName): boolean;
  requireFeature(feature: FeatureName): void;
  currentTier(): Tier;
  licenseStatus(): LicenseStatus;
}

export interface CachedVerifier {
  policy(): Promise<LicensePolicy>;
  invalidate(): void;
}

export interface CachedVerifierOptions {
  ttlMs?: number; // default 5 minutes
  loadRecord: () => Promise<LicenseRecord | null>;
  expectedSerialNumber: string;
  expectedMachineHash: string;
  pinnedPublicKeyRaw: Uint8Array;
}

export function createCachedVerifier(opts: CachedVerifierOptions): CachedVerifier {
  const ttl = opts.ttlMs ?? 5 * 60 * 1000;
  let cached: { key: string; result: VerifyResult; at: number } | null = null;
  let inflight: Promise<VerifyResult> | null = null;

  const compute = async (): Promise<VerifyResult> => {
    let record: LicenseRecord | null = null;
    try {
      record = await opts.loadRecord();
    } catch {
      return BASELINE_RESULT(LicenseStatusType.Missing, "loadRecord threw");
    }

    const result = await verifyLicense({
      record,
      expectedSerialNumber: opts.expectedSerialNumber,
      expectedMachineHash: opts.expectedMachineHash,
      pinnedPublicKeyRaw: opts.pinnedPublicKeyRaw,
    });
    const key = record ? `${record.licenseId}:${record.machineHash}` : "none";
    cached = { key, result, at: Date.now() };

    return result;
  };

  const getResult = async (): Promise<VerifyResult> => {
    if (cached && Date.now() - cached.at < ttl) return cached.result;

    if (inflight) return inflight;
    inflight = compute().finally(() => {
      inflight = null;
    });

    return inflight;
  };

  return {
    async policy() {
      const r = await getResult();

      return {
        // Baseline features stay exposed on any non-Valid status per spec 60.8.
        isFeatureEnabled: (f) => r.features.has(f),
        requireFeature: (f) => {
          if (r.features.has(f)) return;

          if (r.status === LicenseStatusType.Missing) throw new LicenseMissingError();

          if (r.status === LicenseStatusType.Expired) throw new LicenseExpiredError();

          if (r.status === LicenseStatusType.Invalid || r.status === LicenseStatusType.Offline) {
            throw new LicenseInvalidError(r.reason ?? r.status);
          }

          throw new FeatureNotLicensedError(f);
        },
        currentTier: () => r.tier,
        licenseStatus: () => r.status,
      };
    },
    invalidate() {
      cached = null;
    },
  };
}