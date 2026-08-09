import { FeatureNameType } from "@/lib/license";
/**
 * Casbin-style gated feature server fns.
 *
 * One handler per non-baseline FeatureName from spec/21-app/60-licensing.md.
 * Every handler starts with `requireServerFeature(<Name>)`, so any call
 * without the corresponding license grant is rejected with the locked
 * `E_LIC_FEATURE_DENIED` envelope from spec/21-app/67-v2-discovery-contract.md.
 * Payloads are intentionally minimal stubs; the point is the gate, not the
 * business logic (which is tracked per feature in v2 plans).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireServerFeature } from "./license-gate.server";
import { toCaptureError } from "./capture.shared";
import { type FeatureName } from "./license";
import { HttpMethod } from "@/lib/constants";

async function guard<T>(feature: FeatureName, run: () => Promise<T>): Promise<T> {
  try {
    await requireServerFeature(feature);

    return await run();
  } catch (err) {
    const ce = toCaptureError(err);
    console.warn(`[feature.fn] feature=${feature} code=${ce.code} message=${ce.message}`);

    throw ce;
  }
}

export const runExtendedOcr = createServerFn({ method: HttpMethod.Post })
  .inputValidator((data: { imageRef: string }) => {
    if (!data || typeof data.imageRef !== "string" || data.imageRef.length === 0) {
      throw new Error("imageRef required");
    }

    if (data.imageRef.length > 512) throw new Error("imageRef too long");

    return data;
  })
  .handler(async ({ data }) =>
    guard(FeatureNameType.ExtendedOcrEngines, async () => ({
      engine: "PaddleOCR",
      imageRef: data.imageRef,
      queued: true,
    })),
  );

export const downloadCloudRuleCatalog = createServerFn({ method: HttpMethod.Get }).handler(
  async () =>
    guard(FeatureNameType.CloudRuleCatalogDownload, async () => ({
      catalogVersion: "stub",
      entries: [] as string[],
    })),
);

export const importRuleBundle = createServerFn({ method: HttpMethod.Post })
  .inputValidator((data: { bundle: string }) => {
    if (!data || typeof data.bundle !== "string") throw new Error("bundle required");

    if (data.bundle.length > 1_048_576) throw new Error("bundle too large");

    return data;
  })
  .handler(async ({ data }) =>
    guard(FeatureNameType.RuleBundleImport, async () => ({
      imported: true,
      bytes: data.bundle.length,
    })),
  );

export const exportRuleBundle = createServerFn({ method: HttpMethod.Get }).handler(async () =>
  guard(FeatureNameType.RuleBundleExport, async () => ({ bundle: "{}", format: "json" as const })),
);

export const openRemoteDiagnostics = createServerFn({ method: HttpMethod.Post }).handler(async () =>
  guard(FeatureNameType.RemoteDiagnostics, async () => ({
    sessionId: crypto.randomUUID(),
    openedAt: new Date().toISOString(),
  })),
);
