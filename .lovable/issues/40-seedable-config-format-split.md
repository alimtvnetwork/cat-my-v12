# Issue 40: Seedable config format split (JSON seed vs. TOML runtime overlays)

**Status:** open (documentation gap, not a code bug)
**Filed:** 2026-07-21
**Plan:** 90 (Worker + Processing CLI), Step 3
**Related specs:** `spec/06-seedable-config-architecture/{00-overview.md,01-fundamentals.md,02-features/00-overview.md}`, `spec/21-app/76-cli-log-and-ipc.md` §Seedable config (line 128-130)
**Related memory:** `.lovable/memory/26-split-db-cli-cheatsheet.md` §8

## Context

Step 3 of Plan 90 requires confirming that spec 76's CLI config layer chain (`defaults -> repo config/*.toml -> <APP_CONFIG_ROOT>/*.toml -> env -> flags`) matches spec 06's Seedable Config Architecture. The two specs are compatible (they operate on different axes: 06 = persistence and first-run seeding, 76 = per-invocation runtime override resolution), but neither reconciles the file-format split:

- Spec 06 §File Specifications defines the seed as `config.seed.json` with a JSON Schema (`config.schema.json`) and SemVer-gated GORM merges into Root DB tables `ConfigMeta` / `Setting` / `SettingHistory`.
- Spec 76 §Seedable config declares that runtime overlays are TOML files at `config/*.toml` (repo) and `<APP_CONFIG_ROOT>/*.toml` (user).

Neither spec states that this split is intentional; a naive reader would assume one format. Plan 90 Step 12 (`BE/cli/common/config_loader.py`) needs a definitive answer before implementation.

## Reconciliation adopted (memory §8)

Both formats coexist by design:

| Axis                       | Format | Owner                                  | Trigger                 |
| -------------------------- | ------ | -------------------------------------- | ----------------------- |
| Persisted seed (spec 06)   | JSON   | `bin/db-bootstrap.py` (Plan 90 §39)    | First run + SemVer bump |
| Runtime overlays (spec 76) | TOML   | `BE/cli/common/config_loader.py` (§12) | Every CLI invocation    |

`config_loader.py` reads `Setting` rows from Root DB as the `defaults` layer, then applies the four TOML/env/flag overlays on top. Loader is read-only against Root DB.

## Follow-up (not this turn)

- When either spec is next revised, add a cross-reference paragraph stating the split is intentional so future readers do not re-file this issue.
- Do NOT change either spec on a next-task turn; spec edits are their own tracked work.

## Evidence

- `spec/06-seedable-config-architecture/01-fundamentals.md` (lines 30-70): `config.seed.json` shape.
- `spec/21-app/76-cli-log-and-ipc.md` line 128-130: TOML layer chain.
- `.lovable/memory/26-split-db-cli-cheatsheet.md` §8: operative reconciliation used by Plan 90.
