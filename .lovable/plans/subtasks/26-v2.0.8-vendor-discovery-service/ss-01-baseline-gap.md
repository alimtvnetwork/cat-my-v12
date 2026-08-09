# SS-01 — Baseline + gap audit

Slug: baseline-gap
Parent: 26-v2.0.8-vendor-discovery-service
Status: pending
Created: 2026-07-14

## Purpose

Prove exactly what Plan 25 already ships for Rank 2 and what remains, so Plan 26 does not re-implement delivered work.

## Reads (with path:line citations required in output)

- `.lovable/memory/v2/01-ranked-backlog.md:33` — Rank 2 acceptance criteria.
- `app/capture/vendor_discovery.py` — aggregator, dedup, `W_DISCOVERY_PARTIAL`.
- `app/core/config/settings_store.py:233-311` — `write_capture_device` admin gate.
- `spec/21-app/66-v2-vendor-discovery.md`, `spec/21-app/67-v2-discovery-contract.md` — discovery contract.
- `spec/21-app/40-error-manage.md` — check whether `E_CFG_UNKNOWN_DEVICE` is registered.
- `src/components/hmi/DeviceDiscoveryPanel.tsx`, `src/routes/settings.camera.tsx` — current UI surface.
- `src/lib/capture.server.ts`, `src/lib/capture.shared.ts` — current server-function surface.
- `src/routes/ops.tsx` — current audit-row surface.
- `.lovable/issues/01-spec-21-blind-ai-readiness.md` — check if still open.

## Output

`.lovable/memory/v2/plan26/00-baseline-gap.md` with a table: Acceptance criterion | Status (SHIPPED / PARTIAL / MISSING) | Evidence path:line | Plan 26 step that closes it.

## Definition of done

- Every Rank 2 acceptance bullet has a row.
- No row is "SHIPPED" without a path:line citation.
- Every "PARTIAL" / "MISSING" row names the Plan 26 step (2-10) that closes it.
- Issue 01 status resolved (kept open with note, or closed with pointer to `spec/25-app-audit/99-signoff.md`).
