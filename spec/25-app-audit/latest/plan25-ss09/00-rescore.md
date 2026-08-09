# Plan 25 SS-09 — Blind-AI rescore of vendor + capture specs

**Version:** v2.87.0 · 2026-07-14
**Rubric:** `scripts/rescore_plan25_ss09.py` (5 checks × 20 pts, mirrors Plan 23 Step 24).

## Scope

7 specs under `spec/21-app/`:

- `50-capture-modules.md`
- `51-security-and-config-modules.md`
- `63-v2-vendor-pylon.md`
- `64-v2-vendor-spinnaker.md`
- `65-v2-vendor-vimba.md`
- `66-v2-vendor-discovery.md`
- `67-v2-discovery-contract.md`

## Headline

| Metric                               | Baseline (initial run)                    | After remediation | Delta |
| ------------------------------------ | ----------------------------------------- | ----------------- | ----- |
| Files audited                        | 7                                         | 7                 | 0     |
| Mean score                           | 94.29 / 100                               | **100.00 / 100**  | +5.71 |
| Blockers (< 80)                      | 1 (`67-v2-discovery-contract.md`, 60/100) | **0**             | -1    |
| Threshold (mean ≥ 90, blockers == 0) | FAIL                                      | **PASS**          |       |

Verdict: **GO**.

## Per-file scores (final)

| File                              | Score | Facade | Backlinks | Codes | Checklist | Enum drift |
| --------------------------------- | ----- | ------ | --------- | ----- | --------- | ---------- |
| 50-capture-modules.md             | 100   | ✓      | waived    | ✓     | ✓         | none       |
| 51-security-and-config-modules.md | 100   | waived | waived    | ✓     | ✓         | none       |
| 63-v2-vendor-pylon.md             | 100   | ✓      | ✓         | ✓     | ✓         | none       |
| 64-v2-vendor-spinnaker.md         | 100   | ✓      | ✓         | ✓     | ✓         | none       |
| 65-v2-vendor-vimba.md             | 100   | ✓      | ✓         | ✓     | ✓         | none       |
| 66-v2-vendor-discovery.md         | 100   | ✓      | ✓         | ✓     | ✓         | none       |
| 67-v2-discovery-contract.md       | 100   | ✓      | ✓         | ✓     | ✓         | none       |

## Blocker cleared

`67-v2-discovery-contract.md` initially scored 60/100 (missing `## Facade Binding` and `## Contract back-links` sections). Remediated by appending both sections that bind `selectCaptureDevice` / `getDiscoveredDevices` / `SettingsStore.write_capture_device` to `VendorDeviceIO` per spec 52, and by cross-linking specs 50 / 52 / 63-66 / 40 / 72. Facade section explicitly names Plan 25 SS-08 (`I_SEC_ADMIN_WRITE` on `settings.capture.device`) so the audit trail lives with the discovery contract, not just spec 72.

## Registered code source

`spec/21-app/40-error-manage.md` (313 codes at time of run). All code references across the 7 audited specs resolve.

## Rerun

```
python3 scripts/rescore_plan25_ss09.py
```

Exit 0 == PASS.

## Full JSON output

See `spec/25-app-audit/latest/plan25-ss09/rescore.json`.
