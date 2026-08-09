import { describe, it, expect } from "vitest";
import { generateKeyPairSync, sign as edSign } from "node:crypto";
import {
  verifyLicense,
  canonicalPayload,
  createCachedVerifier,
  FeatureNotLicensedError,
  LicenseExpiredError,
  type LicenseRecord,
} from "@/lib/license";

function makeKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  return { rawPublic: new Uint8Array(raw), privateKey };
}

function signRecord(
  rec: Omit<LicenseRecord, "signature">,
  privateKey: import("node:crypto").KeyObject,
): LicenseRecord {
  const payload = canonicalPayload({ ...rec, signature: "" } as LicenseRecord);
  const sig = edSign(null, Buffer.from(payload), privateKey);
  return { ...rec, signature: sig.toString("base64") };
}

const baseRecord = (overrides: Partial<LicenseRecord> = {}): Omit<LicenseRecord, "signature"> => ({
  licenseId: "11111111-1111-1111-1111-111111111111",
  tier: "TierTwo",
  serialNumber: "SN-1",
  machineHash: "MH-1",
  issuedAt: "2026-01-01T00:00:00Z",
  expiresAt: "2099-01-01T00:00:00Z",
  features: ["RunInspection", "ConfigureRules", "ExportResultsJson", "MultiVendorCameraSelection"],
  signatureAlg: "Ed25519",
  ...overrides,
});

describe("verifyLicense (fail-closed)", () => {
  it("returns Missing baseline when record is null", async () => {
    const { rawPublic } = makeKeypair();
    const r = await verifyLicense({
      record: null,
      expectedSerialNumber: "SN-1",
      expectedMachineHash: "MH-1",
      pinnedPublicKeyRaw: rawPublic,
    });
    expect(r.status).toBe("Missing");
    expect(r.tier).toBe("TierOne");
    expect(r.features.has("MultiVendorCameraSelection")).toBe(false);
  });

  it("verifies a valid signed record", async () => {
    const { rawPublic, privateKey } = makeKeypair();
    const rec = signRecord(baseRecord(), privateKey);
    const r = await verifyLicense({
      record: rec,
      expectedSerialNumber: "SN-1",
      expectedMachineHash: "MH-1",
      pinnedPublicKeyRaw: rawPublic,
    });
    expect(r.status).toBe("Valid");
    expect(r.tier).toBe("TierTwo");
    expect(r.features.has("MultiVendorCameraSelection")).toBe(true);
  });

  it("rejects tampered features (signature mismatch)", async () => {
    const { rawPublic, privateKey } = makeKeypair();
    const rec = signRecord(baseRecord(), privateKey);
    rec.features = [...rec.features, "CloudRuleCatalogDownload"];
    const r = await verifyLicense({
      record: rec,
      expectedSerialNumber: "SN-1",
      expectedMachineHash: "MH-1",
      pinnedPublicKeyRaw: rawPublic,
    });
    expect(r.status).toBe("Invalid");
    expect(r.tier).toBe("TierOne");
  });

  it("rejects serialNumber and machineHash mismatch", async () => {
    const { rawPublic, privateKey } = makeKeypair();
    const rec = signRecord(baseRecord(), privateKey);
    const r1 = await verifyLicense({
      record: rec,
      expectedSerialNumber: "OTHER",
      expectedMachineHash: "MH-1",
      pinnedPublicKeyRaw: rawPublic,
    });
    const r2 = await verifyLicense({
      record: rec,
      expectedSerialNumber: "SN-1",
      expectedMachineHash: "OTHER",
      pinnedPublicKeyRaw: rawPublic,
    });
    expect(r1.status).toBe("Invalid");
    expect(r2.status).toBe("Invalid");
  });

  it("returns Expired when past expiresAt", async () => {
    const { rawPublic, privateKey } = makeKeypair();
    const rec = signRecord(baseRecord({ expiresAt: "2020-01-01T00:00:00Z" }), privateKey);
    const r = await verifyLicense({
      record: rec,
      expectedSerialNumber: "SN-1",
      expectedMachineHash: "MH-1",
      pinnedPublicKeyRaw: rawPublic,
    });
    expect(r.status).toBe("Expired");
  });
});

describe("createCachedVerifier", () => {
  it("caches result and enforces requireFeature", async () => {
    const { rawPublic, privateKey } = makeKeypair();
    const rec = signRecord(baseRecord(), privateKey);
    let calls = 0;
    const v = createCachedVerifier({
      loadRecord: async () => {
        calls++;
        return rec;
      },
      expectedSerialNumber: "SN-1",
      expectedMachineHash: "MH-1",
      pinnedPublicKeyRaw: rawPublic,
    });
    const p1 = await v.policy();
    const p2 = await v.policy();
    expect(calls).toBe(1);
    expect(p1.isFeatureEnabled("MultiVendorCameraSelection")).toBe(true);
    expect(p2.currentTier()).toBe("TierTwo");
    expect(() => p1.requireFeature("CloudRuleCatalogDownload")).toThrow(FeatureNotLicensedError);
  });

  it("fails closed on loader error", async () => {
    const { rawPublic } = makeKeypair();
    const v = createCachedVerifier({
      loadRecord: async () => {
        throw new Error("io");
      },
      expectedSerialNumber: "SN-1",
      expectedMachineHash: "MH-1",
      pinnedPublicKeyRaw: rawPublic,
    });
    const p = await v.policy();
    expect(p.licenseStatus()).toBe("Missing");
    expect(p.currentTier()).toBe("TierOne");
    expect(p.isFeatureEnabled("MultiVendorCameraSelection")).toBe(false);
  });

  it("throws LicenseExpiredError from requireFeature for a non-baseline feature when expired", async () => {
    const { rawPublic, privateKey } = makeKeypair();
    const rec = signRecord(baseRecord({ expiresAt: "2020-01-01T00:00:00Z" }), privateKey);
    const v = createCachedVerifier({
      loadRecord: async () => rec,
      expectedSerialNumber: "SN-1",
      expectedMachineHash: "MH-1",
      pinnedPublicKeyRaw: rawPublic,
    });
    const p = await v.policy();
    // Baseline features stay usable even when expired (spec 60.8).
    expect(() => p.requireFeature("RunInspection")).not.toThrow();
    expect(() => p.requireFeature("MultiVendorCameraSelection")).toThrow(LicenseExpiredError);
  });
});
