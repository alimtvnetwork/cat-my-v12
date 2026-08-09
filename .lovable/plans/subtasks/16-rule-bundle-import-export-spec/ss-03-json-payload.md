# SS-03 - JSON Payload

Parent plan: `.lovable/plans/pending/16-rule-bundle-import-export-spec.md`
Parent spec: `spec/21-app/70-rule-bundle-import-export.md` §70.6

## Summary

`BundleFormatJson` payload lives at `/payload.json`. UTF-8 no BOM, LF, canonical JSON (RFC 8785-style: sorted keys, no whitespace variance). Top-level keys exactly: `bundleId`, `format`, `rules`, `schemaVersion`.

## `RuleRecord` shape (sorted keys)

`createdAt`, `id`, `imageRefs[]`, `isEnabled`, `kind`, `name`, `shape{geometry,kind}`, `tolerances[]`, `updatedAt`.

## Enums (identical to SS-02)

- `kind`: `Presence` | `Circle` | `Rectangle` | `Ocr` | `Barcode` | `DataMatrix`.
- `shape.kind`: `ShapeCircle` | `ShapeRectangle` | `ShapePolygon`.
- `imageRefs[].role`: `RoleReference` | `RoleMask` | `RoleGolden`.

## Byte-equivalence with SS-02

`sqliteToJson(jsonToSqlite(x)) == x` and vice versa. Same logical bundle -> same rules, same tolerances, same shape geometry, same image refs.

## Importer verification order

Duplicate `id` -> duplicate `name` -> `rules.length == manifest.ruleCount` -> image-ref graph both directions -> sort order on `rules`, `tolerances`, `imageRefs`.

Status: final for Plan 16 Step 6.
