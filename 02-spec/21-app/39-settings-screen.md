# 39 — Settings Screen

**Status:** Locked (Plan 04 Step 35). Defines the operator/engineer surface for editing the configurable knobs enumerated in 27 (config surface). Read-mostly; every write is validated, versioned, and audited.

Anchors: 21 (root DB), 22 (task DB), 23 (override cascade), 26 (migrations), 27 (config surface), 30 (UI overview), 37 (run monitor), 38 (results).

## 1. Purpose

Give a single place to view and edit config values without touching disk, without SSH, and without unversioned changes. The screen is a thin editor over 27 — it never invents keys, never renames them, and never persists a value 27 does not declare.

## 2. Layout

```text
+----------------------------------------------------------+
| TitleBar (32)   Scope selector · Dirty · Save · Revert   |
+---------------------+------------------------------------+
| ScopeTree (left,    |  KeyEditor (right)                 |
| 260px)              |   - Key path (from 27)             |
|   - Root            |   - Type · Default · Current       |
|   - Task <id>       |   - Effective (post-cascade)       |
|   - RunSession live |   - Description (from 27)          |
|                     |   - Validation errors              |
+---------------------+------------------------------------+
| BottomBar (44)  Cascade layer badge · Audit link         |
+----------------------------------------------------------+
```

Scopes correspond 1:1 to the override cascade layers (23): `ROOT` → `TASK` → `RUNTIME`. Editing `RUNTIME` requires an active `RunSession`; otherwise the tab is disabled with the reason spelled out — never hidden.

## 3. Data Sources

| Panel            | Source                                                                       |
| ---------------- | ---------------------------------------------------------------------------- |
| ScopeTree        | 21 (`Task` list) + live `RunSession` from Dispatcher (11)                    |
| KeyEditor keys   | 27 §Key Registry — the authoritative list                                    |
| Current values   | corresponding DB per scope (21 for ROOT, 22 for TASK, in-memory for RUNTIME) |
| Effective values | cascade resolver (23 §Resolution Order)                                      |

Keys not present in 27 MUST NOT appear in the editor. Extra keys in the DB are surfaced as `E_CONFIG_ORPHAN_KEY` in a diagnostics section — never silently rendered as editable.

## 4. Editing Contract

1. Every write goes through the same `saveConfig` server function used by imports (parity with 26 §Migration Writers). No direct DB writes from the UI process.
2. Values are validated against 27 §Type per key (integer bounds, enum membership, path shape). Failure is `E_CONFIG_BAD_INPUT` and the row shows the offending constraint verbatim.
3. Saves are transactional per scope; a partial save is `E_CONFIG_PARTIAL_WRITE` and is rolled back — never left half-applied.
4. Every save writes an `AuditEntry` (21) with `(UserId, Scope, Key, OldValue, NewValue, At)`. The BottomBar audit link opens the last 100 entries filtered to the current scope.

## 5. Dangerous Keys

Keys tagged `Restart: TASK` or `Restart: RUNTIME` in 27 show an inline banner: "Applies on next Task open" / "Applies immediately to running workers". Keys tagged `Restart: PROCESS` require a Dispatcher restart and are refused while a `RunSession` is active with `E_CONFIG_RESTART_REQUIRED` — the operator stops the run first, no exceptions.

## 6. Import / Export

- **Export** — serializes the selected scope to JSON in the 27 §Wire Format. File name per 25 §File Naming.
- **Import** — validates the file end-to-end against 27 before writing a single key; a file with any invalid key is refused whole with `E_CONFIG_IMPORT_INVALID`. No partial imports.

## 7. Read-Only While Running

While a `RunSession` is active, `ROOT` and `TASK` scopes are read-only regardless of role — editing them mid-run would race the cascade snapshot (23 §Snapshot). Attempts are `E_CONFIG_LOCKED_DURING_RUN`. `RUNTIME` remains editable and is the intended escape hatch.

## 8. Failure Taxonomy (UI-local)

| Code                         | When                                               |
| ---------------------------- | -------------------------------------------------- |
| `E_CONFIG_BAD_INPUT`         | Value fails 27 type/bounds/enum check.             |
| `E_CONFIG_ORPHAN_KEY`        | DB row for a key not declared in 27.               |
| `E_CONFIG_PARTIAL_WRITE`     | Transaction did not commit all rows for the scope. |
| `E_CONFIG_RESTART_REQUIRED`  | `Restart: PROCESS` key edited during active run.   |
| `E_CONFIG_LOCKED_DURING_RUN` | `ROOT` / `TASK` edit attempted mid-run.            |
| `E_CONFIG_IMPORT_INVALID`    | Any single key in an imported file is invalid.     |

All six are surfaced inline with the offending key highlighted — no toast-only errors.

## 9. Cross-References

- Key registry (single source of truth): 27.
- Cascade resolution & snapshotting: 23.
- Audit table `AuditEntry`: 21.
- Migration writers reused by `saveConfig`: 26.
- Run lifecycle that gates edits: 11, 37.

## 10. Operator Identity (LOCKED — resolves Q-07)

v1 is a **single-operator workstation**. There is no login screen, no per-user session, and no password/PIN prompt at boot or run start.

- The operator label is a single config value `27.Operator.Id` (short string, `^[A-Za-z0-9_.-]{1,32}$`), edited on this screen under the `ROOT` scope; empty value is `E_CONFIG_BAD_INPUT`.
- All audit rows (§4) and log records (41 §10) MUST stamp this `Operator.Id` as `UserId` / `OperatorId`. There is no anonymous write path — a save with an unset `Operator.Id` is refused with `E_OPERATOR_ID_UNSET`.
- Rotation (shift change) is edit-and-save on this screen; the change takes effect on the next audited action. Mid-run edits obey the `ROOT` lock in §7 — the run stops first, no exceptions.
- v1 explicitly rejects PIN-based per-shift switching, OS-level identity, and multi-user auth. Reopening any of these requires a new spec section under 46 §3 (deferred), not a code path added later.

Failure modes added by this section:

| Code                  | Meaning                                                  |
| --------------------- | -------------------------------------------------------- |
| `E_OPERATOR_ID_UNSET` | Any audited write attempted with `27.Operator.Id` empty. |

## Acceptance Checklist

- [ ] Every settings field is a config key from spec 27.
- [ ] Admin-only fields gated by `has_role('admin')` per user-roles memory.
- [ ] Writes emit `SettingsChanged` audit per spec 72.
