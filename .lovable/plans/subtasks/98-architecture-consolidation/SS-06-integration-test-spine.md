# SS-06 — Integration Test Spine

**Plan:** 98  
**Status:** Pending  
**Parallel:** No — **requires SS-01 complete**

---

## Problem

Strong unit test coverage per layer; weak **cross-layer** tests proving:

UI (or FE client) → BE HTTP → envelope shape → error codes

Gaps allow envelope regressions and route wiring breaks to ship despite green unit tests.

---

## Deliverables

### T-001 — Contract test: BE health + meta

**File:** `tests/contract/test_be_spine.py` (extend if exists)

- `GET /healthz` → 200, envelope success
- `GET /meta` → version, env, capabilities present
- Assert PascalCase keys via shared schema or snapshot

### T-002 — Contract test: rules list envelope

- `GET /rules` → `Results` array shape (may be empty)
- Invalid `GET /rules/abc` → `E_BE_BAD_REQUEST`
- Missing rule → `E_BE_NOT_FOUND`
- Response includes `X-Correlation-Id`

### T-003 — Playwright: data-source toggle

**File:** `tests/e2e/data_source_backend_spine.py` (or extend existing)

- Start from seed mode
- Mock or real BE on :8787
- Toggle to backend after health probe
- Verify settings persist `localStorage` key

### T-004 — FE envelope adapter roundtrip

Ensure `src/lib/backend/__tests__/httpClient.test.ts` covers:

- Success envelope parsing
- Failure envelope → `BackendHttpError` with code
- Non-JSON response → `E9005` path

---

## Steps

1. Read SS-01 runtime map for canonical endpoints
2. Implement T-001, T-002 (pytest + httpx against `create_app()`)
3. Implement T-003 (Playwright; mark `@pytest.mark.skip` if no BE in CI — document)
4. Audit T-004 coverage; add cases if gaps
5. Add `## Integration spine` section to `docs/architecture/runtime-map.md` linking tests

---

## Acceptance

- [ ] At least 2 pytest contract tests and 1 E2E (or skipped with CI note) land
- [ ] CI job runs contract tests (wire into `scripts/ci-v3.sh` if not already)
- [ ] Envelope shape regression caught by test, not manual QA

---

## Verification

```bash
pytest tests/contract/test_be_spine.py -q
bun run visual:test --grep data.source
```
