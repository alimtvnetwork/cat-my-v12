/**
 * Server-side license policy + Casbin-style feature gate.
 *
 * Fail-closed: if env is missing or verification fails, the process runs on
 * the TierOne baseline (spec/21-app/60-licensing.md 60.8). Every non-baseline
 * feature call throws `E_LIC_FEATURE_DENIED` so the capture error envelope
 * carries it back to the UI.
 */
import { CaptureError } from "./capture.shared";
import {
  createCachedVerifier,
  FeatureNotLicensedError,
  LicenseExpiredError,
  LicenseInvalidError,
  LicenseMissingError,
  type CachedVerifier,
  type FeatureName,
  type LicensePolicy,
  type LicenseRecord,
} from "./license";
import { getStoredLicense } from "./license-store.server";

function b64ToBytes(b64: string): Uint8Array {
  const bin =
    typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);

  return out;
}

let cached: CachedVerifier | null = null;

function messageOf(err: unknown): string {
  if (err instanceof Error) return err.message;

  return String(err);
}

async function loadStoredLicense(): Promise<LicenseRecord | null> {
  try {
    return await getStoredLicense();
  } catch (err) {
    console.error(
      "[license-gate] operation=loadStoredLicense fallback=env reason=store-load-failed",
      messageOf(err),
    );

    return null;
  }
}

function parseEnvLicense(recordJson: string | undefined): LicenseRecord | null {
  if (typeof recordJson === "string" && recordJson.length > 0) {
    try {
      return JSON.parse(recordJson) as LicenseRecord;
    } catch (err) {
      console.error(
        "[license-gate] operation=parseEnvLicense fallback=baseline reason=env-json-invalid",
        messageOf(err),
      );
    }
  }

  return null;
}

function buildVerifier(): CachedVerifier {
  const pub = process.env.LICENSE_PUBLIC_KEY_B64;
  const recordJson = process.env.LICENSE_RECORD_JSON;
  const expectedSerial = process.env.PRODUCT_SERIAL_NUMBER ?? "";
  const expectedMachineHash = process.env.MACHINE_HASH ?? "";
  const pinned = pub ? b64ToBytes(pub) : new Uint8Array(0);

  return createCachedVerifier({
    ttlMs: 5 * 60 * 1000,
    expectedSerialNumber: expectedSerial,
    expectedMachineHash,
    pinnedPublicKeyRaw: pinned,
    loadRecord: async (): Promise<LicenseRecord | null> => {
      const stored = await loadStoredLicense();

      if (stored) return stored;

      return parseEnvLicense(recordJson);
    },
  });
}

export function getServerLicenseVerifier(): CachedVerifier {
  if (!cached) cached = buildVerifier();

  return cached;
}

export async function getServerLicensePolicy(): Promise<LicensePolicy> {
  return getServerLicenseVerifier().policy();
}

/**
 * Casbin-style enforcement point: `requireServerFeature("Name")` at the top
 * of any gated server handler. Any denial becomes a CaptureError so the
 * client's parseCaptureErrorCode() can route it through the banner map.
 */
export async function requireServerFeature(feature: FeatureName): Promise<void> {
  const policy = await getServerLicensePolicy();
  try {
    policy.requireFeature(feature);
  } catch (err) {
    if (err instanceof FeatureNotLicensedError) {
      throw new CaptureError("E_LIC_FEATURE_DENIED", `feature=${feature}`);
    }

    if (err instanceof LicenseExpiredError) {
      throw new CaptureError("E_LIC_FEATURE_DENIED", `feature=${feature} reason=expired`);
    }

    if (err instanceof LicenseInvalidError || err instanceof LicenseMissingError) {
      throw new CaptureError("E_LIC_FEATURE_DENIED", `feature=${feature} reason=${err.name}`);
    }

    throw new CaptureError("E_LIC_FEATURE_DENIED", `feature=${feature} reason=unknown`);
  }
}

/** Test hook: drop the memoised verifier so the next call re-reads env. */
export function _resetServerLicensePolicyForTests(): void {
  cached = null;
}