import type { ReactNode } from "react";
import { useLicenseFeatures } from "@/hooks/useLicenseFeatures";
import type { FeatureName } from "@/lib/license";

/**
 * Client-side Casbin-style gate. Mirrors `requireServerFeature` so gated UI
 * actions are visibly locked (aria-disabled, title, data-feature-gated) when
 * the license does not include the feature. The server still enforces the
 * gate: this component is a UX affordance, not a security boundary.
 */
export function FeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: FeatureName;
  children: (state: {
    enabled: boolean;
    disabledProps:
      | { disabled: true; "aria-disabled": true; title: string; "data-feature-gated": FeatureName }
      | Record<string, never>;
  }) => ReactNode;
  fallback?: ReactNode;
}): React.JSX.Element | null {
  const { snapshot, isFeatureEnabled } = useLicenseFeatures();
  const loaded = snapshot !== null;
  const enabled = loaded && isFeatureEnabled(feature);

  if (loaded && !enabled && fallback !== undefined) return <>{fallback}</>;
  const disabledProps = enabled
    ? ({} as Record<string, never>)
    : {
        disabled: true as const,
        "aria-disabled": true as const,
        title: `License required: ${feature}`,
        "data-feature-gated": feature,
      };

  return <>{children({ enabled, disabledProps })}</>;
}
