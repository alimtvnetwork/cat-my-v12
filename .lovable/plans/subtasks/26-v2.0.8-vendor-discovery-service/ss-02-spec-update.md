# SS-02 — Spec update: operator selection contract + error registration

Slug: spec-update
Parent: 26-v2.0.8-vendor-discovery-service
Status: pending
Created: 2026-07-14

## Purpose

Lock the operator-facing discovery + selection contract in spec before code so adapters, server functions, and UI all bind to the same shape.

## Edits

1. `spec/21-app/66-v2-vendor-discovery.md`
   - Add `## Operator Selection Contract` section: `listDiscoveredDevices() -> DiscoveredDevice[]`, `selectCaptureDevice({vendor, serial}) -> {ok: true}` or throws typed error.
   - Enumerate the `DiscoveredDevice` fields: `vendor`, `serial`, `model`, `transport`, optional `display_name`.
   - Cross-reference `SettingsStore.write_capture_device` and `resolve_discovered_device`.
2. `spec/21-app/67-v2-discovery-contract.md`
   - Extend `## Facade Binding` to include `resolve_discovered_device` and the server-function pair.
   - Extend `## Contract back-links` with rows for `E_CFG_UNKNOWN_DEVICE`, `E_SEC_ROLE_DENIED`, `E_SEC_RATE_LIMITED`.
3. `spec/21-app/40-error-manage.md`
   - Register `E_CFG_UNKNOWN_DEVICE` (severity: error; audit: yes; retryable: no; user_message: "Selected device is not present.") if not already registered.
   - Increment the "registered codes" total count noted in the doc.
4. Append `## Acceptance Checklist` rows to 66 and 67 for the new selection contract (verifiable anchors).

## Definition of done

- Blind-AI rubric (Plan 23 Step 24: Acceptance Checklist / Facade Binding / Contract back-links / no enum drift / all codes registered) would score 100/100 on 66, 67, and 40 in a dry-run rescore.
- `E_CFG_UNKNOWN_DEVICE` shows up exactly once in `spec/21-app/40-error-manage.md` with the required fields.
- No code touched in this subtask.
