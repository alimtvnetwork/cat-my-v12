# SS-02: Fix duplicate section 7 in spec 42-observability

Slug: observability-anchor-fix
Status: pending
Created: 2026-07-14
Parent: 23-blind-ai-remediation

## Scope

`spec/25-app-audit/10-issues/42-42-observability.md` flagged `E_SPEC_ANCHOR_DRIFT`: two `## 7.` headings collide, breaking anchor links from spec index and memory 09.

## Actions

1. Read `spec/21-app/42-observability.md` end-to-end.
2. Identify the two `## 7.` headings; renumber the second to `## 8.` and cascade subsequent headings.
3. Update any inbound anchor references (`grep -rn "42-observability.md#" spec/ .lovable/`).
4. Rerun `scripts/audit_consolidate.py`.

## Verification

- `grep -c "^## 7\." spec/21-app/42-observability.md` returns 1.
- Rescore of issue 42 removes `E_SPEC_ANCHOR_DRIFT` and lifts score above 80.
