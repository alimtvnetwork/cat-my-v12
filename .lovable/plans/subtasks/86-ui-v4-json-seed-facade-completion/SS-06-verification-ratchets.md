# Verification ratchets for JSON seed facade completion

Slug: verification-ratchets
Status: pending
Created: 2026-07-19
Parent: 86-ui-v4-json-seed-facade-completion

## Scope

Add tests and audits that stop seed coverage from regressing. The verification must prove both data integrity and UI usability.

## Required checks

- JSON schema validation for every seed bundle.
- Relationship integrity: every referenced id resolves.
- Idempotency: repeated seed runs do not duplicate or overwrite user edits.
- Facade-only access ratchet: no direct storage reads or writes from UI surfaces.
- Route coverage: seeded data appears on every target UI route.
- Error funnel: failed seed or facade writes expose contextual errors through the global error path.

## Acceptance

The verification suite can fail loudly when a new screen is added without a seed slice or when a component bypasses the facade contract.
