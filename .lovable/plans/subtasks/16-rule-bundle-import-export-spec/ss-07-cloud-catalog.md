# SS-07 Cloud Rule Catalog (Forward-Looking)

Backs `spec/21-app/70-rule-bundle-import-export.md` §70.12. TierThree only.

## Locked shape

- Read-only client for standard TierThree; owner-side uploads only.
- All traffic gated by `CloudRuleCatalogDownload`.
- Downloads land in `config/catalog-cache/<bundleId>/` then flow through §70.8. Cache never bypasses signature verification.

## Endpoints sketch (shapes `[TBD]`)

- `GET /v1/catalog` list.
- `GET /v1/bundles/{bundleId}` fetch `.catrules`.
- `POST /v1/bundles` owner upload (not exposed to readers).

## Open Questions (all Step 12)

- Cross-bundle image dedup.
- Independent Tolerances version stamp.
- Catalog auth model + signing key rotation cadence.
- Owner-side review workflow (approval, rejection, withdrawal propagation).
- Offline cache eviction policy.
- Sneakernet offline import path.

## Cross-links

- `spec/21-app/60-licensing.md` §60.9.
- `spec/21-app/46-open-questions.md` (mirrored at Plan 16 close-out).
