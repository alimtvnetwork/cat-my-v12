import { FeatureNameType } from "@/lib/license";
import { TierType } from "@/lib/license";
import { LicenseStatusType } from "@/lib/license";
/**
 * License snapshot + activation server fns.
 *
 * The client asks the server whether a named feature is enabled instead of
 * inspecting a tier string (spec/21-app/60-licensing.md 60.4). Activation
 * verifies the pasted/uploaded LicenseRecord against the pinned Ed25519
 * public key, stores it in the isolate's license store, and returns a fresh
 * snapshot. Verification is fail-closed: an invalid record is rejected and
 * the caller stays on the previous policy.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServerLicenseVerifier, getServerLicensePolicy } from "./license-gate.server";
import { getStoredLicense, persistLicenseState } from "./license-store.server";
import {
  verifyLicense,
  type FeatureName,
  type LicenseRecord,
  type LicenseStatus,
  type Tier,
} from "./license";
import { HttpMethod } from "@/lib/constants";

export interface LicenseSnapshot {
  status: LicenseStatus;
  tier: Tier;
  features: FeatureName[];
  licenseId: string | null;
  serialNumber: string | null;
  expiresAt: string | null;
}

const ALL_FEATURES: FeatureName[] = [
  FeatureNameType.RunInspection,
  FeatureNameType.ConfigureRules,
  FeatureNameType.ExportResultsJson,
  FeatureNameType.MultiVendorCameraSelection,
  FeatureNameType.ExtendedOcrEngines,
  FeatureNameType.CloudRuleCatalogDownload,
  FeatureNameType.RuleBundleImport,
  FeatureNameType.RuleBundleExport,
  FeatureNameType.RemoteDiagnostics,
];

async function snapshot(): Promise<LicenseSnapshot> {
  const policy = await getServerLicensePolicy();
  const stored = await getStoredLicense();
  const features = ALL_FEATURES.filter((f) => policy.isFeatureEnabled(f));

  return {
    status: policy.licenseStatus(),
    tier: policy.currentTier(),
    features,
    licenseId: stored?.licenseId ?? null,
    serialNumber: stored?.serialNumber ?? null,
    expiresAt: stored?.expiresAt ?? null,
  };
}

export const getLicenseSnapshot = createServerFn({ method: HttpMethod.Get }).handler(snapshot);

function b64ToBytes(b64: string): Uint8Array {
  const bin =
    typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);

  return out;
}

function parseRecord(raw: string): LicenseRecord {
  const trimmed = raw.trim();

  if (!trimmed) throw new Error("empty license input");
  const obj = JSON.parse(trimmed) as LicenseRecord;

  if (!obj || typeof obj !== "object") throw new Error("license must be a JSON object");

  if (typeof obj.signature !== "string" || obj.signatureAlg !== "Ed25519") {
    throw new Error("license missing Ed25519 signature");
  }

  return obj;
}

export interface ActivateResult {
  ok: boolean;
  status: LicenseStatus;
  reason?: string;
  snapshot: LicenseSnapshot;
}

export const activateLicense = createServerFn({ method: HttpMethod.Post })
  .inputValidator((data: { record: string }) => {
    if (!data || typeof data.record !== "string") throw new Error("record required");

    if (data.record.length > 32_768) throw new Error("record too large");

    return data;
  })
  .handler(async ({ data }): Promise<ActivateResult> => {
    const serverResponseId = globalThis.crypto?.randomUUID?.() ?? `resp_${Date.now()}`;
    let record: LicenseRecord;
    try {
      record = parseRecord(data.record);
    } catch (err) {
      const snap = await snapshot();
      await persistLicenseState({
        record: null,
        status: LicenseStatusType.Invalid,
        tier: snap.tier,
        features: [],
        reason: err instanceof Error ? err.message : "parse failed",
        serverResponseId,
        actor: "activateLicense",
      }).catch(() => undefined);

      return {
        ok: false,
        status: LicenseStatusType.Invalid,
        reason: err instanceof Error ? err.message : "parse failed",
        snapshot: snap,
      };
    }

    const pub = process.env.LICENSE_PUBLIC_KEY_B64;
    const expectedSerial = process.env.PRODUCT_SERIAL_NUMBER ?? "";
    const expectedMachineHash = process.env.MACHINE_HASH ?? "";
    const pinned = pub ? b64ToBytes(pub) : new Uint8Array(0);

    const result = await verifyLicense({
      record,
      expectedSerialNumber: expectedSerial,
      expectedMachineHash,
      pinnedPublicKeyRaw: pinned,
    });

    if (result.status !== LicenseStatusType.Valid) {
      const snap = await snapshot();
      await persistLicenseState({
        record: null,
        status: result.status,
        tier: snap.tier,
        features: [],
        reason: result.reason ?? "verification failed",
        serverResponseId,
        actor: "activateLicense",
      }).catch(() => undefined);

      return {
        ok: false,
        status: result.status,
        reason: result.reason ?? "verification failed",
        snapshot: snap,
      };
    }

    getServerLicenseVerifier().invalidate();
    const policy = await getServerLicensePolicy();
    const features = ALL_FEATURES.filter((f) => policy.isFeatureEnabled(f));
    await persistLicenseState({
      record,
      status: LicenseStatusType.Valid,
      tier: policy.currentTier(),
      features,
      serverResponseId,
      actor: "activateLicense",
    });
    getServerLicenseVerifier().invalidate();

    return { ok: true, status: LicenseStatusType.Valid, snapshot: await snapshot() };
  });

export const deactivateLicense = createServerFn({ method: HttpMethod.Post }).handler(
  async (): Promise<LicenseSnapshot> => {
    const serverResponseId = globalThis.crypto?.randomUUID?.() ?? `resp_${Date.now()}`;
    await persistLicenseState({
      record: null,
      status: LicenseStatusType.Missing,
      tier: TierType.TierOne,
      features: [],
      reason: "deactivated",
      serverResponseId,
      actor: "deactivateLicense",
    });
    getServerLicenseVerifier().invalidate();

    return snapshot();
  },
);
