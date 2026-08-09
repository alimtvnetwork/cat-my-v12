---
Slug: ui-backend-map
Parent: 28-chromium-shell-spec
Status: pending
Created: 2026-07-14
---

# SS-04 — UI → backend mapping table

Produce `spec/21-app/shell/05-ui-to-backend-map.md`. It must contain one table per UI surface. Columns:

| UI element | User action | IPC method | Params (schema ref) | Result (schema ref) | Error codes | Auth | Notes |

Surfaces to cover exhaustively (walk the codebase index):

- Routes: `/` (index), `/run`, `/results`, `/errors`, `/settings`, `/settings/camera`, `/settings/license`, `/settings/lighting`, `/settings/trigger`, `/setup/reference`, `/setup/roi`, `/ops`.
- HMI components: ActionBar, ConfigPanel, Counter, DeviceDiscoveryPanel, FeatureGate, GlobalNav, HmiShell, MachineFrame, ModeHeader, RoiOverlay, StatusLog, StepsWindow, Titlebar, ToolRibbon, Viewport.
- Ops tiles: `audit-retention-tile`, retention audit panel, capture device panel, vendor smoke.
- Public API routes (webhooks the shell exposes locally): `api/public/health.live`, `api/public/health.ready`, `api/public/hooks/audit-retention`.

Rules:

- Every row's IPC method must resolve to a Python method under `app/*` or an HTTP route under `src/routes/api/*` — cite the file path.
- Every write row must list the audit `I_*` code emitted on success and `E_*` on failure.
- Rows requiring long detail link to a sub-file under `spec/21-app/shell/methods/<method>.md`.
- The table's rendered form is mirrored in `diagrams/09-ui-to-backend-map.mmd` (flowchart clusters per UI surface).
- Add a coverage assertion at the end: a shell script snippet (documented, not run) that greps all UI files and diffs against the table to detect orphans.
