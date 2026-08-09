# Feature flags

Status: Draft (Plan 28)

## Sources of truth

1. **License-derived flags** — from `src/hooks/useLicenseFeatures.ts` via
   `settings.license.verify`; scoped by seat/tier.
2. **Config-derived flags** — from `app/core/config/resolver.py`; operator overrides.
3. **Kill switches** — from updater manifest `flags` block; can force-disable a
   feature across the fleet without a release.

Precedence: kill switch > config > license.

## Surface to renderer

Method `feature.flags.read` returns:

```json
{ "flags": { "capture.vendor.pylon": true, "ai.gate.strict": false, ... },
  "source": { "capture.vendor.pylon": "license", "ai.gate.strict": "config" } }
```

Streamed via WS on change (`feature.flags.stream`) → `<FeatureGate>` reruns.

## Codes

- `I_FEATURES_READ` — successful load.
- `E_FEATURES_FAILED` — resolver error.
- `W_FEATURE_KILLED` — kill switch flipped since last read.
