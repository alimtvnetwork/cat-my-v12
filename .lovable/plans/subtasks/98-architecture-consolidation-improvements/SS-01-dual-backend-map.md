# SS-01 — Dual-Backend Ownership Map

**Plan:** 98  
**Status:** ✅ Done (2026-08-16)  
**Parallel:** Yes (Wave 1)  
**Blocks:** SS-05, SS-06, SS-07

---

## Problem

Contributors confuse `BE/` (FastAPI :8787) with `app/` (supervisor + capture + worker). Rule logic exists in both `BE/app/rules/` and `app/rules/`. No single doc answers "which screen calls which backend."

---

## Deliverable

Create **`docs/architecture/runtime-map.md`** with:

1. **Process diagram** — Shell, UI, BE, Supervisor, Capture, Dispatcher, Worker
2. **Endpoint table** — every UI screen/route → HTTP target (BE path or supervisor path or seed-only)
3. **Write-path table** — which mutations go through `runBackendWrite`, facades, or supervisor
4. **Ownership matrix**

| Concern                    | Canonical owner                            | Notes           |
| -------------------------- | ------------------------------------------ | --------------- |
| Rule CRUD (setup)          | `BE/routes/rules.py` → `BE/repos/`         | FE Save button  |
| Rule evaluation (live run) | `app/rules/engine.py` (TBD in SS-05)       | Worker hot path |
| Camera list/capture        | `BE/sdk_facade/camera.py` + `app/capture/` | Split today     |
| Observability / CLI        | `BE/routes/observability/**`               |                 |
| Seed/demo data             | `src/lib/seed/` + facades                  | No network      |

5. **Explicit "do not" list** — e.g. never import `sdk/` from routes; never join RootDb + TaskDb in SQL

---

## Steps

1. Inventory `src/routes/**` for `fetchBackend`, `apiFetch`, server functions, MSW handlers
2. Inventory `BE/routes/**` and mount points in `BE/main.py`
3. Inventory supervisor HTTP surface in `app/` (if any exposed to UI today)
4. Cross-check against `spec/24-app-ui-design-system/20-backend-endpoint-map.md`
5. Write `docs/architecture/runtime-map.md`
6. Add link from root `README.md` § Project structure

---

## Acceptance

- [ ] Doc exists and lists ≥90% of production UI → backend edges
- [ ] Orphan routes flagged in a `## Gaps` section
- [ ] Reviewed against `spec/21-app/11-system-context.md` — discrepancies listed, not hidden

---

## Verification

```bash
# Optional: extend ui-backend-map linter fixture if gaps found
python linter-scripts/check-ui-backend-map.py
```
