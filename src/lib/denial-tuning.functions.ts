import { createServerFn } from "@tanstack/react-start";
import { HttpMethod } from "@/lib/constants";

/**
 * Plan 19 Step 8: read-only denial-tuning surface for `/ops`.
 *
 * The Python `DenialRateLimiter` is out-of-band in this study clone (see
 * app/core/security/remediation.py). This bridge mirrors the shipped
 * `SECURITY_DEFAULTS` and the last derivation timestamp so operators can
 * see the current threshold + window without a process restart.
 *
 * Admin controls are intentionally NOT exposed here in v2.0.3 (CLI /
 * server-fn only, per `.lovable/plans/pending/19-*.md` step 8 deferral).
 */

export type DenialTuning = {
  threshold: number;
  windowSeconds: number;
  derivedAt: string | null;
  derivation: string;
};

// Mirrors SECURITY_DEFAULTS at app/core/config/settings_store.py:45 and the
// derivation memo committed with Plan 19 step 3.
const DEFAULT_TUNING: DenialTuning = {
  threshold: 5,
  windowSeconds: 60,
  derivedAt: "2026-07-13T00:00:00Z",
  derivation: "24h /ops telemetry, sample_size=0 -> SECURITY_DEFAULTS",
};

export const getDenialTuning = createServerFn({ method: HttpMethod.Get }).handler(
  async (): Promise<DenialTuning> => DEFAULT_TUNING,
);
