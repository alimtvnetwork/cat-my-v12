import { TierType } from "@/lib/license";
import { LicenseStatusType } from "@/lib/license";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getLicenseSnapshot, type LicenseSnapshot } from "@/lib/license.functions";
import type { FeatureName } from "@/lib/license";

/**
 * Client-side companion to `requireServerFeature`. Renders / gates UI actions
 * on the same feature set the server enforces. Fail-closed while loading.
 */
export function useLicenseFeatures(): {
  snapshot: LicenseSnapshot | null;
  isFeatureEnabled: (f: FeatureName) => boolean;
} {
  const [snapshot, setSnapshot] = useState<LicenseSnapshot | null>(null);
  const load = useServerFn(getLicenseSnapshot);
  useEffect(() => {
    let isAlive = true;
    load()
      .then((s) => {
        if (isAlive) setSnapshot(s);
      })
      .catch(() => {
        if (isAlive)
          setSnapshot({
            status: LicenseStatusType.Missing,
            tier: TierType.TierOne,
            features: [],
            licenseId: null,
            serialNumber: null,
            expiresAt: null,
          });
      });

    return () => {
      isAlive = false;
    };
  }, [load]);

  return {
    snapshot,
    isFeatureEnabled: (f) => Boolean(snapshot?.features.includes(f)),
  };
}
