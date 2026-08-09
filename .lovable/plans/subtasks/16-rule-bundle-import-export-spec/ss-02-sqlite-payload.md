# SS-02 - SQLite Payload

Parent plan: `.lovable/plans/pending/16-rule-bundle-import-export-spec.md`
Parent spec: `spec/21-app/70-rule-bundle-import-export.md` §70.5

## Summary

`BundleFormatSqlite` payload lives at `/payload.sqlite`. Self-contained SQLite 3 file: FK on, no triggers, no views, no `sqlite_sequence`, UUID PKs, `WITHOUT ROWID` on every table. `application_id = 0x43415452` ('CATR') + `user_version = schemaVersion` are sniff-guards.

## Tables (canonical order)

1. `BundleMeta(key TEXT PK, value TEXT)` - required rows: `bundleId`, `schemaVersion`, `format`.
2. `Rules(ruleId UUID PK, name UNIQUE, kind CHECK, isEnabled 0/1, createdAt, updatedAt)`.
3. `RuleTolerances(ruleId FK, key, valueJson) PK(ruleId, key)`.
4. `RuleShapes(ruleId PK FK, shapeKind CHECK, geometryJson)`.
5. `RuleImageRefs(ruleId FK, imageSha256 CHECK(len=64), role CHECK) PK(ruleId, imageSha256, role)`.

## Enum values (locked, PascalCase, no underscores)

- `Rules.kind`: `Presence` | `Circle` | `Rectangle` | `Ocr` | `Barcode` | `DataMatrix`.
- `RuleShapes.shapeKind`: `ShapeCircle` | `ShapeRectangle` | `ShapePolygon`.
- `RuleImageRefs.role`: `RoleReference` | `RoleMask` | `RoleGolden`.

## Importer verification order

`PRAGMA foreign_key_check` -> row count == `manifest.ruleCount` -> image-ref graph both directions -> canonical JSON on `geometryJson` / `valueJson` -> `BundleMeta` triple matches manifest -> `application_id` sniff.

## Determinism

Export writes rows in stable ascending order per PK, then `VACUUM` last for reproducible bytes.

Status: final for Plan 16 Step 5.
