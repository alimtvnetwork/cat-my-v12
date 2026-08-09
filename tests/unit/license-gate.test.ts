import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import { canonicalPayload, type LicenseRecord } from "@/lib/license";
import { requireServerFeature, _resetServerLicensePolicyForTests } from "@/lib/license-gate.server";
import { CaptureError } from "@/lib/capture.shared";

function keypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  return { pubB64: Buffer.from(raw).toString("base64"), privateKey };
}

function sign(
  rec: Omit<LicenseRecord, "signature">,
  privateKey: import("node:crypto").KeyObject,
): LicenseRecord {
  const sig = edSign(
    null,
    Buffer.from(canonicalPayload({ ...rec, signature: "" } as LicenseRecord)),
    privateKey,
  );
  return { ...rec, signature: sig.toString("base64") };
}

const ORIGINAL = {
  pub: process.env.LICENSE_PUBLIC_KEY_B64,
  rec: process.env.LICENSE_RECORD_JSON,
  ser: process.env.PRODUCT_SERIAL_NUMBER,
  mh: process.env.MACHINE_HASH,
};

const ENV_KEYS = [
  "LICENSE_PUBLIC_KEY_B64",
  "LICENSE_RECORD_JSON",
  "PRODUCT_SERIAL_NUMBER",
  "MACHINE_HASH",
] as const;
beforeEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  _resetServerLicensePolicyForTests();
});
afterEach(() => {
  for (const k of ENV_KEYS) delete process.env[k];
  _resetServerLicensePolicyForTests();
});

describe("requireServerFeature (Casbin-style gate)", () => {
  it("throws E_LIC_FEATURE_DENIED when no license env is present (baseline)", async () => {
    delete process.env.LICENSE_PUBLIC_KEY_B64;
    delete process.env.LICENSE_RECORD_JSON;
    await expect(requireServerFeature("MultiVendorCameraSelection")).rejects.toMatchObject({
      name: "CaptureError",
      code: "E_LIC_FEATURE_DENIED",
    });
  });

  it("allows baseline features under fail-closed state", async () => {
    delete process.env.LICENSE_RECORD_JSON;
    await expect(requireServerFeature("RunInspection")).resolves.toBeUndefined();
  });

  it("allows a gated feature when the signed license grants it", async () => {
    const { pubB64, privateKey } = keypair();
    const rec = sign(
      {
        licenseId: "22222222-2222-2222-2222-222222222222",
        tier: "TierTwo",
        serialNumber: "SN-X",
        machineHash: "MH-X",
        issuedAt: "2026-01-01T00:00:00Z",
        expiresAt: "2099-01-01T00:00:00Z",
        features: [
          "RunInspection",
          "ConfigureRules",
          "ExportResultsJson",
          "MultiVendorCameraSelection",
        ],
        signatureAlg: "Ed25519",
      },
      privateKey,
    );
    process.env.LICENSE_PUBLIC_KEY_B64 = pubB64;
    process.env.LICENSE_RECORD_JSON = JSON.stringify(rec);
    process.env.PRODUCT_SERIAL_NUMBER = "SN-X";
    process.env.MACHINE_HASH = "MH-X";
    await expect(requireServerFeature("MultiVendorCameraSelection")).resolves.toBeUndefined();
    await expect(requireServerFeature("CloudRuleCatalogDownload")).rejects.toBeInstanceOf(
      CaptureError,
    );
  });
});
