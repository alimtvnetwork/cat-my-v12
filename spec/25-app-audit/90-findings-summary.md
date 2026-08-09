# Findings Summary - Blind-AI Rescore

Version: v2.76.0
Date: 2026-07-14
Scope: `spec/21-app/` (61 files)
Rubric: see `.lovable/memory/v2/plan23/13-paths-and-rescore.md` (5 checks, 20 pts each).

## Headline

| Metric                                | Plan 22 baseline | Plan 23 rescore | Delta |
| ------------------------------------- | ---------------- | --------------- | ----- |
| Files audited                         | 61               | 61              | 0     |
| Mean score                            | 66.6 / 100       | **98.0 / 100**  | +31.4 |
| Blockers (< 80)                       | 46               | **0**           | -46   |
| Threshold (mean >= 80, blockers == 0) | FAIL             | **PASS**        | -     |

Verdict: **GO** (threshold met; signoff at `99-signoff.md`).

## Blocker classes cleared

| Class                         | Plan 22 count | Cleared by                                                   | Evidence memory |
| ----------------------------- | ------------- | ------------------------------------------------------------ | --------------- |
| `E_SPEC_CHECKLIST_MISSING`    | 30            | Steps 5-8 (checklists appended to specs 01-99)               | 04, 05, 06, 07  |
| `E_FACADE_BINDING_MISSING`    | 8             | Steps 13-16 (facade sections added to 50-51, verified 63-72) | 08, 09          |
| `E_CONTRACT_BACKLINK_MISSING` | 4             | Steps 17-18 (back-link tables in 63-72)                      | 10              |
| `E_SPEC_ANCHOR_DUPLICATE`     | 1             | Step 19 (renumber `42-observability.md` §7)                  | 11              |
| `E_ENUM_CASE_DRIFT`           | 1 (sweep)     | Step 20 (0 type-name leaks; SCREAMING_SNAKE classified)      | 11              |
| `E_ERROR_CODE_UNREGISTERED`   | 213 refs      | Step 21 (Appendix A.15 bulk register)                        | 12              |
| `E_AUDIT_PATH_DRIFT`          | -             | Step 23 (`audit_paths_check.py` OK)                          | 13              |

## Sub-threshold notes (non-blocker)

Four files score 80/100 due to family-prefix templates read as unregistered codes by the regex (`E_AI_`, `I_AUDIT_`, `E_AUDIT_EXPORT_`, `E_AUDIT_RETENTION_`, `E_CODE`):

- `43-ai-validation-stub.md`
- `44-security-privacy.md`
- `71-audit-retention.md`
- `99-consistency-report.md`

Concrete codes in these families are registered in `spec/21-app/40-error-manage.md` Appendix A per Step 21. Waived: prefix templates are documentation, not emitted codes.

Waived on facade check:

- `52-sdk-facade-pattern.md` (is the pattern itself).
- `60-licensing.md` (no vendor SDK).

## Plan 25 SS-09 delta (vendor + capture specs subset)

Scoped rescore of 7 specs (`50, 51, 63-67`) after Plan 25 code deltas (SS-02..SS-08):

| Metric                                | SS-09 baseline                            | SS-09 final      | Delta |
| ------------------------------------- | ----------------------------------------- | ---------------- | ----- |
| Files audited                         | 7                                         | 7                | 0     |
| Mean score                            | 94.29 / 100                               | **100.00 / 100** | +5.71 |
| Blockers (< 80)                       | 1 (`67-v2-discovery-contract.md`, 60/100) | **0**            | -1    |
| Threshold (mean >= 90, blockers == 0) | FAIL                                      | **PASS**         |       |

Cleared: 67 gained `## Facade Binding` (binds `selectCaptureDevice` / `getDiscoveredDevices` / `SettingsStore.write_capture_device` to `VendorDeviceIO` per spec 52) and `## Contract back-links` (50 / 52 / 63-66 / 40 / 72). Full artifact: `spec/25-app-audit/latest/plan25-ss09/00-rescore.md` + `rescore.json`. Rerun: `python3 scripts/rescore_plan25_ss09.py`.

## Source

- Rescore script + transcript: `.lovable/memory/v2/plan23/13-paths-and-rescore.md`.
- Consolidated bundle: `spec/25-app-audit/latest/99-consolidated.md`.
- Remediation trace: `spec/25-app-audit/93-remediation-evidence.md`.
- Plan 25 SS-09 subset: `spec/25-app-audit/latest/plan25-ss09/`.
