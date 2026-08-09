# 70 - Rule Bundle Import/Export (SQLite + JSON, ZIP-wrapped)

Status: draft (Plan 16 in progress; Steps 1-10 landed)
Owner: Rules track
Baseline: Control Automation v2.22.0
Numbering note: Plan 16 originally referenced `61-rule-bundle-import-export.md`, but slot 61 is occupied by `61-v2-scope.md`. This spec claims slot `70` (next free after `69-v2-denial-tuning-contract.md`); Plan 16 verification step is updated in place at implementation time.

## §70.1 Purpose and Scope

This spec defines how CAT MY UI persists and transports **Rule Bundles**: portable, verifiable collections of rule-based validations (rules + tolerances + reference geometry, optionally reference images) that can move between installs (local export/import) and later be pulled from a curated **Cloud Rule Catalog** (TierThree feature).

### In scope

- Rule records (`Presence`, `Circle`, `Rectangle`, `Ocr`, `Barcode`, `DataMatrix`).
- Tolerances attached to rules.
- Reference shape geometry (ROI polygons, safe zones, expected values).
- Optional reference images used by rules (stored by content hash under `/assets/images/`).
- Two first-layer serialization formats (SQLite, JSON) wrapped in a single outer container (ZIP).
- Manifest, checksum, and optional signature envelope.

### Out of scope (non-goals)

- **No `Results`**: bundles never carry inspection results (`24-results-json.md` remains the sole result surface).
- **No license material**: license keys, activation tokens, tier metadata never appear inside a bundle (see `60-licensing.md`).
- **No capture configuration**: camera, trigger, lighting, and vendor SDK settings are excluded (see `27-config-surface.md`, `50-capture-modules.md`).
- **No user data**: audit rows, operator identities, and role assignments never appear inside a bundle (`44-security-privacy.md`).

### Cross-links

- Licensing feature flags this spec unblocks: `spec/21-app/60-licensing.md` §60.9 (`RuleBundleImport`, `RuleBundleExport`, `CloudRuleCatalogDownload`).
- Task DB shape referenced by the SQLite payload: `spec/21-app/22-task-db.md`.
- Rule catalog / kinds: `spec/21-app/33-rule-catalog.md`.
- Shape model referenced by `RuleShapes`: `spec/21-app/32-shape-model.md`.
- Tolerance model referenced by `RuleTolerances`: `spec/21-app/34-tolerance-model.md`.
- Open questions consolidated in: `spec/21-app/46-open-questions.md` (to be cross-linked in a follow-up execution turn per Plan 16 verification).

### Naming rules (locked)

- All enums, error types, feature flags, and format identifiers in this spec are **PascalCase, no underscores** (matches `.lovable/memory/09-enums-and-results-shape.md`).
- Boolean fields use `is`/`has` prefixes.
- No em dashes anywhere in this spec.

---

## §70.2 First-Layer Formats and Outer Container

### First-layer format enum

Locked, PascalCase, no underscores:

- `BundleFormatSqlite`: primary format. Payload is a single SQLite database file (`payload.sqlite`) inside the ZIP. Preferred for round-trips inside CAT MY UI because it preserves referential integrity via foreign keys and matches the shape of `22-task-db.md`.
- `BundleFormatJson`: interchange format. Payload is a single UTF-8 JSON file (`payload.json`) inside the ZIP. Preferred when the receiver is not CAT MY UI or when a diff-friendly, VCS-storable representation is required.

A bundle carries **exactly one** payload format; there is no dual-payload mode.

### Outer container

- Container: standard PKZIP (`application/zip`), no encryption at container level.
- File extension: `.catrules`.
- MIME type: `application/vnd.catmy.catrules+zip`.
- Magic bytes: first four bytes of the container are the ZIP magic `50 4B 03 04` (`PK\x03\x04`). The bundle itself is identified by the `.catrules` extension plus the `manifest.json` inside; the ZIP magic alone is not sufficient.
- Character set for all text entries: UTF-8, no BOM.
- Compression: `Deflate` per entry, level 6. `Stored` (no compression) permitted only for pre-compressed image assets under `/assets/images/`.

### Format auto-detection at import

The importer never guesses format from filename. Detection is strictly:

1. Open the ZIP, read `/manifest.json`, parse `manifest.format`.
2. If `manifest.format == BundleFormatSqlite`, require exactly one entry at `/payload.sqlite` and zero entries at `/payload.json`.
3. If `manifest.format == BundleFormatJson`, require exactly one entry at `/payload.json` and zero entries at `/payload.sqlite`.
4. Any mismatch (both payloads present, neither present, or format value outside the enum) raises `BundleInvalidError` with reason code `PayloadFormatMismatch` and the importer aborts before opening the payload.

### Reserved for later steps

Per-payload contracts (§70.5, §70.6), pipelines (§70.7, §70.8), merge policy (§70.9), versioning (§70.10), feature gating (§70.11), and the Cloud Rule Catalog section (§70.12) are defined in Plan 16 Steps 5-12.

---

## §70.3 ZIP Internal Layout

### Fixed entry set

Every `.catrules` ZIP contains exactly this entry set. Extra entries not listed below are rejected at import with `BundleInvalidError(UnknownEntry)`.

```
/manifest.json                    (required, exactly 1)
/payload.sqlite                   (required iff format == BundleFormatSqlite, exactly 1)
/payload.json                     (required iff format == BundleFormatJson, exactly 1)
/assets/images/<sha256>.png       (0..imageCount; filename MUST equal lowercase hex SHA-256 of the entry bytes)
/signature.sig                    (required iff origin == CloudCatalog, exactly 1; forbidden when origin == Local)
```

### Path rules (all enforced pre-extract)

- Entry names use forward slashes (`/`) only. Backslashes reject with `BundleInvalidError(PathSeparator)`.
- All entry names are lowercase ASCII. Case-variants of a fixed entry (e.g., `Manifest.json`) reject with `BundleInvalidError(PathCase)`.
- Absolute paths (leading `/` in the ZIP entry name field, or drive letters like `C:\`) reject with `BundleInvalidError(AbsolutePath)`.
- `..` segments anywhere in the path reject with `BundleInvalidError(PathTraversal)`.
- Symlink entries (ZIP external attribute `0xA000`) reject with `BundleInvalidError(Symlink)`.
- Entry name length capped at 255 bytes.
- Image asset filenames MUST match `^[0-9a-f]{64}\.png$`; mismatch rejects with `BundleInvalidError(AssetName)`. The importer additionally recomputes the SHA-256 of the entry bytes and verifies it matches the filename; mismatch raises `BundleChecksumMismatchError(AssetHash)`.

### Size caps (locked)

Prior `[TBD MB]` resolved:

- Total uncompressed size across all entries: **256 MiB** (`268_435_456` bytes). Exceeds -> `BundleInvalidError(TotalSizeCap)`.
- Single entry uncompressed size: **64 MiB** (`67_108_864` bytes). Exceeds -> `BundleInvalidError(EntrySizeCap)`.
- Compression ratio cap per entry: **1:100** (uncompressed / compressed). Exceeds -> `BundleInvalidError(CompressionRatioCap)` (zip-bomb guard).
- Max entry count: **10_000**. Exceeds -> `BundleInvalidError(EntryCountCap)`.

Caps are enforced by streaming through the central directory and each local file header **before** any entry is fully decompressed; the importer never reads a full entry into memory to measure it.

### Deterministic ordering (export)

Exporters MUST write entries in this fixed order to keep bundle bytes reproducible for the same input:

1. `/manifest.json`
2. `/payload.sqlite` OR `/payload.json`
3. `/assets/images/<sha256>.png` sorted ascending by filename (hex string sort).
4. `/signature.sig` (last, so signature can cover entries 1-3).

Every entry uses fixed modification time `1980-01-01T00:00:00Z` (the ZIP epoch) and Unix permissions `0644`. Importers ignore mtime and permissions.

---

## §70.4 `manifest.json` Field Contract

Encoding: UTF-8, no BOM, LF line endings, canonical JSON (sorted object keys, no trailing commas). Non-canonical form rejects with `BundleInvalidError(ManifestNotCanonical)`.

### Required fields

| Field           | Type   | Constraint                                                                                        |
| --------------- | ------ | ------------------------------------------------------------------------------------------------- |
| `schemaVersion` | int    | `>= 1`, `<= currentSupported` (see §70.10).                                                       |
| `bundleId`      | string | UUIDv4, lowercase, `xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx`.                                   |
| `format`        | string | `BundleFormatSqlite` or `BundleFormatJson`. Any other value -> `BundleInvalidError(FormatValue)`. |
| `createdAt`     | string | ISO8601 UTC with `Z` suffix, second precision (e.g., `2026-07-14T12:34:56Z`).                     |
| `producer`      | object | See below.                                                                                        |
| `ruleCount`     | int    | `>= 0`. Must equal the row count in the payload (§70.5 / §70.6).                                  |
| `imageCount`    | int    | `>= 0`. Must equal the number of `/assets/images/*` entries.                                      |
| `checksum`      | object | See below.                                                                                        |
| `origin`        | string | `Local` or `CloudCatalog`.                                                                        |

### Optional fields

| Field       | Type   | When required                                                                                                                 |
| ----------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `signature` | object | Required iff `origin == CloudCatalog`; forbidden when `origin == Local`. Mismatch -> `BundleInvalidError(SignaturePresence)`. |

### Nested object shapes

`producer`:

- `appVersion` (string, required): SemVer of the CAT MY UI build that produced the bundle (e.g., `2.18.0`).
- `machineHash` (string, optional): opaque lowercase hex, `<= 64` chars. Never a raw machine identifier; salted + hashed producer-side. Absent when the producer opts out.

`checksum`:

- `algorithm` (string, required): fixed value `Sha256`. Any other value -> `BundleInvalidError(ChecksumAlgorithm)`.
- `payloadHex` (string, required): lowercase hex SHA-256 of the single payload entry bytes (`/payload.sqlite` or `/payload.json`), computed over the uncompressed bytes. Mismatch at import -> `BundleChecksumMismatchError(Payload)`.

`signature` (present only when `origin == CloudCatalog`):

- `algorithm` (string, required): `Ed25519`.
- `keyId` (string, required): opaque lowercase hex key identifier assigned by the catalog signing service.
- `signedAt` (string, required): ISO8601 UTC with `Z` suffix.

Signature bytes themselves live in `/signature.sig` (raw 64-byte Ed25519 signature over the concatenation of `manifest.json` bytes + payload entry bytes, in that order); they are NOT duplicated inside `manifest.json`. Signature verification is defined in §70.11.

### Validation order at import

1. Parse JSON. Parse error -> `BundleInvalidError(ManifestJson)`.
2. Reject unknown top-level keys -> `BundleInvalidError(ManifestUnknownField)`.
3. Enforce required-field presence and type per table above.
4. Enforce `format` <-> payload entry presence (§70.2 auto-detection).
5. Enforce `origin` <-> `signature` / `/signature.sig` presence rule.
6. Enforce `imageCount` == count of `/assets/images/*` entries.
7. Enforce `schemaVersion` bounds (§70.10).
8. Verify payload SHA-256 matches `checksum.payloadHex`.
9. Verify each image asset filename matches SHA-256 of its bytes.
10. If cloud, verify signature (§70.11).

Steps 1-7 run without decompressing the payload. Steps 8-10 stream through payload / assets and never buffer a full entry beyond the size caps in §70.3.

### Canonical example (`BundleFormatSqlite`, `origin: Local`)

```json
{
  "bundleId": "0f9b3c7e-6a52-4e18-9a01-2b1a7c4d5e60",
  "checksum": {
    "algorithm": "Sha256",
    "payloadHex": "b5c9...e2a1"
  },
  "createdAt": "2026-07-14T12:34:56Z",
  "format": "BundleFormatSqlite",
  "imageCount": 3,
  "origin": "Local",
  "producer": {
    "appVersion": "2.18.0"
  },
  "ruleCount": 12,
  "schemaVersion": 1
}
```

---

## §70.5 SQLite Payload Contract (`BundleFormatSqlite`)

Payload entry: `/payload.sqlite` (exactly one, per §70.3). File is a self-contained SQLite 3 database, no attached DBs, no external references.

### Database-level PRAGMAs (locked)

Set at export, verified at import. Divergence -> `BundleInvalidError(SqlitePragma)`.

- `user_version = <manifest.schemaVersion>` (single source of truth for payload version; mismatch with manifest -> `BundleInvalidError(SchemaVersionMismatch)`).
- `application_id = 0x43415452` (ASCII `CATR`; sniff-guard so an unrelated `.sqlite` file never round-trips as a bundle payload).
- `foreign_keys = ON`.
- `journal_mode = MEMORY` at export (payload is one-shot). Importer opens read-only and does not care about journal mode.
- `page_size = 4096`, `encoding = 'UTF-8'`.
- No `sqlite_sequence` rows (no `AUTOINCREMENT` columns; all PKs are UUIDs).
- No triggers (`sqlite_master.type = 'trigger'` count MUST be 0).
- No views (`type = 'view'` count MUST be 0).
- Only tables named in the schema below are allowed; any other user table -> `BundleInvalidError(SqliteUnknownTable)`.

### Table set (exhaustive, in creation order)

```sql
CREATE TABLE BundleMeta (
  key        TEXT PRIMARY KEY NOT NULL,
  value      TEXT NOT NULL
) WITHOUT ROWID;
-- Required rows (importer verifies presence + value):
--   ('bundleId',       <manifest.bundleId>)
--   ('schemaVersion',  <manifest.schemaVersion as text>)
--   ('format',         'BundleFormatSqlite')
-- Divergence from manifest -> BundleInvalidError(BundleMetaMismatch).

CREATE TABLE Rules (
  ruleId     TEXT PRIMARY KEY NOT NULL,            -- UUIDv4 lowercase
  name       TEXT NOT NULL,                        -- 1..128 chars, trimmed, no leading/trailing WS
  kind       TEXT NOT NULL CHECK (kind IN
             ('Presence','Circle','Rectangle','Ocr','Barcode','DataMatrix')),
  isEnabled  INTEGER NOT NULL CHECK (isEnabled IN (0,1)),
  createdAt  TEXT NOT NULL,                        -- ISO8601 UTC 'Z'
  updatedAt  TEXT NOT NULL
) WITHOUT ROWID;
CREATE UNIQUE INDEX Rules_name_uidx ON Rules(name);

CREATE TABLE RuleTolerances (
  ruleId     TEXT NOT NULL REFERENCES Rules(ruleId) ON DELETE CASCADE,
  key        TEXT NOT NULL,                        -- see spec/21-app/34-tolerance-model.md
  valueJson  TEXT NOT NULL,                        -- canonical JSON scalar/object
  PRIMARY KEY (ruleId, key)
) WITHOUT ROWID;

CREATE TABLE RuleShapes (
  ruleId       TEXT PRIMARY KEY NOT NULL REFERENCES Rules(ruleId) ON DELETE CASCADE,
  shapeKind    TEXT NOT NULL CHECK (shapeKind IN
               ('ShapeCircle','ShapeRectangle','ShapePolygon')),
  geometryJson TEXT NOT NULL                       -- canonical JSON per 32-shape-model.md
) WITHOUT ROWID;

CREATE TABLE RuleImageRefs (
  ruleId      TEXT NOT NULL REFERENCES Rules(ruleId) ON DELETE CASCADE,
  imageSha256 TEXT NOT NULL CHECK (length(imageSha256) = 64),
  role        TEXT NOT NULL CHECK (role IN
              ('RoleReference','RoleMask','RoleGolden')),
  PRIMARY KEY (ruleId, imageSha256, role)
) WITHOUT ROWID;
```

### Referential-integrity checks (importer, in order)

1. `PRAGMA foreign_key_check` MUST return 0 rows.
2. `SELECT COUNT(*) FROM Rules` MUST equal `manifest.ruleCount`; mismatch -> `BundleInvalidError(RuleCountMismatch)`.
3. Every `RuleImageRefs.imageSha256` MUST have a matching `/assets/images/<sha256>.png` entry; missing -> `BundleInvalidError(OrphanImageRef)`.
4. Every `/assets/images/<sha256>.png` entry MUST be referenced by at least one `RuleImageRefs` row; unreferenced -> `BundleInvalidError(OrphanImageAsset)`.
5. `RuleShapes.geometryJson` and `RuleTolerances.valueJson` are canonical JSON (sorted keys, no whitespace variation); non-canonical -> `BundleInvalidError(PayloadJsonNotCanonical)`.

### Determinism (for reproducible bytes)

Export writes rows in `ORDER BY ruleId ASC` for `Rules`, then `(ruleId, key)` for `RuleTolerances`, then `ruleId` for `RuleShapes`, then `(ruleId, imageSha256, role)` for `RuleImageRefs`. `VACUUM` runs last so file bytes are stable for identical logical content. See `ss-02-sqlite-payload.md`.

---

## §70.6 JSON Payload Contract (`BundleFormatJson`)

Payload entry: `/payload.json` (exactly one, per §70.3). UTF-8 no BOM, LF line endings, canonical JSON (sorted keys, no trailing commas, no whitespace variation across producers). Non-canonical -> `BundleInvalidError(PayloadJsonNotCanonical)`.

### Top-level shape

```json
{
  "bundleId": "<uuid>",
  "format": "BundleFormatJson",
  "rules": [ RuleRecord, ... ],
  "schemaVersion": 1
}
```

Top-level MUST equal exactly these four keys. `bundleId`, `format`, `schemaVersion` MUST equal the manifest values; mismatch -> `BundleInvalidError(PayloadMetaMismatch)`. Unknown top-level key -> `BundleInvalidError(PayloadUnknownField)`.

### `RuleRecord`

```
RuleRecord = {
  "createdAt":  ISO8601 UTC 'Z',
  "id":         UUIDv4 lowercase,
  "imageRefs":  ImageRef[],           // sorted by (imageSha256, role)
  "isEnabled":  boolean,
  "kind":       "Presence"|"Circle"|"Rectangle"|"Ocr"|"Barcode"|"DataMatrix",
  "name":       string, 1..128 chars, unique across rules,
  "shape":      RuleShape,
  "tolerances": ToleranceEntry[],     // sorted by key
  "updatedAt":  ISO8601 UTC 'Z'
}

RuleShape = {
  "geometry": <canonical JSON per 32-shape-model.md>,
  "kind":     "ShapeCircle"|"ShapeRectangle"|"ShapePolygon"
}

ToleranceEntry = { "key": string, "valueJson": <canonical JSON scalar/object> }

ImageRef = {
  "imageSha256": string (64 lowercase hex),
  "role":        "RoleReference"|"RoleMask"|"RoleGolden"
}
```

### Byte-equivalence rule (§70.5 <-> §70.6)

For any given logical bundle, the SQLite payload and the JSON payload MUST carry identical information. A round-trip converter defined by these two sections is bijective: `sqliteToJson(jsonToSqlite(x)) == x` for every valid JSON payload, and vice versa. Field ordering and canonical-JSON rules exist precisely so this equivalence holds byte-for-byte after re-serialization.

### Referential-integrity checks (importer, in order)

1. `rules[*].id` unique; duplicate -> `BundleInvalidError(DuplicateRuleId)`.
2. `rules[*].name` unique; duplicate -> `BundleInvalidError(DuplicateRuleName)`.
3. `rules.length == manifest.ruleCount`; mismatch -> `BundleInvalidError(RuleCountMismatch)`.
4. Every `rules[*].imageRefs[*].imageSha256` MUST match a `/assets/images/<sha256>.png` entry (`OrphanImageRef`); every asset MUST be referenced (`OrphanImageAsset`).
5. `rules[*].tolerances` sorted by `key` ASC; `imageRefs` sorted by `(imageSha256, role)` ASC; `rules` sorted by `id` ASC. Out-of-order -> `BundleInvalidError(PayloadJsonNotCanonical)`.

### Determinism

Producers MUST emit fields in the sorted-key order shown above (JSON RFC 8785-style: lexicographic on UTF-16 code units), rules sorted by `id`, arrays sorted per the referential-integrity rules. See `ss-03-json-payload.md`.

---

## §70.7 Export Pipeline

Precondition: caller holds `RuleBundleExport`. Missing entitlement rejects before any DB read with `FeatureNotLicensedError(RuleBundleExport)`. Export is read-only against the live Rules DB and writes a new `.catrules` file atomically at the caller-provided destination.

### Ten required export steps

1. **Resolve request**: validate `ruleIds[]` is non-empty, `format` is `BundleFormatSqlite` or `BundleFormatJson`, destination has `.catrules` extension, and `origin` is `Local` unless a catalog upload path explicitly requested cloud signing. Empty selection -> `BundleInvalidError(EmptySelection)`.
2. **Snapshot rules**: open one read transaction on the live Rules DB, select `Rules`, `RuleTolerances`, `RuleShapes`, and `RuleImageRefs` restricted to `ruleIds`, then close the transaction before any file I/O. Missing selected rule -> `BundleInvalidError(SelectedRuleMissing)`.
3. **Validate snapshot graph**: verify every selected rule has valid `kind`, every optional shape row references a selected rule, every tolerance row references a selected rule, and every image ref is attached to a selected rule. Any graph break -> `BundleInvalidError(SnapshotIntegrity)`.
4. **Normalize snapshot**: sort rules by `ruleId` ascending, sort child rows by the §70.5 / §70.6 deterministic keys, canonicalize `geometryJson` and tolerance `valueJson`, lowercase all SHA-256 values, and strip runtime-only cache fields that are not part of §70.5 / §70.6.
5. **Materialize payload**: for `BundleFormatSqlite`, create `/payload.sqlite` in a staging directory, apply §70.5 PRAGMAs and tables, insert normalized rows, then `VACUUM`; for `BundleFormatJson`, serialize `/payload.json` using §70.6 canonical JSON rules.
6. **Stage image assets**: for each unique `imageSha256`, copy the source PNG into staging as `/assets/images/<sha256>.png`, recompute SHA-256 over bytes, and require filename == digest. Missing source -> `BundleInvalidError(MissingSourceImage)`. Digest mismatch -> `BundleChecksumMismatchError(AssetHash)`.
7. **Build manifest and optional signature**: compute `checksum.payloadHex` over uncompressed payload bytes, set `ruleCount` and `imageCount` from staged content, write canonical `manifest.json` per §70.4. For `origin == CloudCatalog`, require catalog signing, add `signature` metadata, and write raw Ed25519 bytes to `/signature.sig`.
8. **Assemble deterministic ZIP**: write entries in §70.3 order, use ZIP mtime `1980-01-01T00:00:00Z`, permissions `0644`, Deflate level 6 for manifest/payload, and `Stored` only for image assets already compressed as PNG. Extra fields are forbidden.
9. **Commit file atomically**: write to `<destination>.tmp`, fsync the file and parent directory where supported, then rename to the final `.catrules` path. Existing destination replacement is caller-policy controlled and never implicit.
10. **Emit Ops event**: on success emit `RuleBundleExported` with `correlationId`, `bundleId`, `format`, `ruleCount`, `imageCount`, `origin`, and final bundle SHA-256. Never log raw signatures, raw image bytes, or full payload bytes.

### Export failure semantics

- Any failure removes the staging directory and partial `.tmp` file before returning the typed error.
- A failed export emits `RuleBundleExportFailed` with `correlationId`, `format`, selected rule count, and reason code.
- No error is swallowed. Export errors are logged once at the pipeline boundary with context, then returned to the caller.

See `ss-04-export-pipeline.md`.

---

## §70.8 Import Pipeline

Precondition: caller holds `RuleBundleImport`. Import is the only pipeline that mutates the live Rules DB. It validates the container, manifest, payload, image assets, schema version, and merge policy before any live write.

### Ten required import steps

1. **Authorize and open container**: require `RuleBundleImport`, open the `.catrules` ZIP read-only, and enforce §70.3 entry count, path, size, and compression-ratio caps before extraction. Failure -> `BundleInvalidError(ZipEnvelope)` or the more specific §70.3 reason.
2. **Read manifest only**: extract `/manifest.json` to bounded memory, parse and validate §70.4 fields, determine payload entry from `manifest.format`, and reject format/payload mismatch before opening the payload.
3. **Verify payload checksum**: stream the selected payload entry, compute SHA-256 over uncompressed bytes, compare to `manifest.checksum.payloadHex`, and abort on mismatch with `BundleChecksumMismatchError(Payload)`.
4. **Verify cloud signature**: when `origin == CloudCatalog`, require `CloudRuleCatalogDownload`, require `/signature.sig`, and verify Ed25519 over canonical `manifest.json` bytes plus payload bytes. Failure -> `BundleSignatureInvalidError(Signature)`. `origin == Local` forbids signatures per §70.4.
5. **Load payload into staging model**: open SQLite payload read-only and run §70.5 PRAGMA/table checks, or parse JSON payload and run §70.6 canonical checks. Both formats produce the same in-memory `RuleRecord` graph.
6. **Validate schema and referential integrity**: reject unsupported newer `schemaVersion` with `BundleSchemaUnsupportedError`; run older supported versions through the §70.10 `MigrationLadder`; enforce rule count, FK graph, canonical child ordering, known enum values, and no orphan image references.
7. **Stage image assets**: stream `/assets/images/*` to a content-addressed staging directory, verify each filename equals SHA-256 bytes, and require every referenced image to exist and every staged asset to be referenced.
8. **Resolve merge policy**: compare staged rules against the live Rules DB using §70.9. Apply `MergePolicyReplace`, `MergePolicyMergeById`, `MergePolicySkipExisting`, or `MergePolicyNamespace` in memory first. Unresolvable conflict -> `BundleMergeConflictError` with row-level identifiers, not raw payload data.
9. **Commit atomically**: inside one live DB write transaction, apply rule inserts/updates/deletes plus child rows in dependency order. Image asset promotion is content-addressed and idempotent; DB rows become visible only on transaction commit. Any DB failure rolls back all live DB changes.
10. **Emit Ops event and cleanup**: on success emit `RuleBundleImported` with `correlationId`, `bundleId`, `origin`, `format`, `mergePolicy`, applied/skipped/conflicted counts, and bundle SHA-256, then remove staging. Never log raw signatures, raw payload bytes, or full asset bytes.

### Import failure semantics

- Any failure before step 9 guarantees no live DB write was attempted.
- Any failure during step 9 rolls back the live DB transaction and leaves only temporary staged files for cleanup.
- A failed import emits `RuleBundleImportFailed` with `correlationId`, `bundleId` when known, operation phase, and reason code.
- No partial rule graph is committed. Silent success is forbidden.

See `ss-05-import-pipeline.md`.

---

## §70.9 Merge Policy Enum and Conflict Matrix

Precondition: import step 8 has already produced a valid in-memory `RuleRecord` graph and has not written to the live Rules DB. Merge policy resolution runs against a consistent live Rules DB snapshot and must finish before the transaction in §70.8 step 9 begins.

### Merge policy enum

Locked, PascalCase, no underscores:

- `MergePolicyReplace`: imported rules win over live rules when the same `ruleId` or the same `name` exists.
- `MergePolicyMergeById`: imported rules update only live rules with the same `ruleId`; same-name different-id conflicts are errors.
- `MergePolicySkipExisting`: imported rules with a matching live `ruleId` or live `name` are skipped; non-conflicting imported rules are inserted.
- `MergePolicyNamespace`: imported rule names are prefixed with a caller-supplied namespace before conflict checks; imported IDs are preserved unless they collide with live IDs.

### Namespace rules

`MergePolicyNamespace` requires `namespace` at request validation time. The value is trimmed, 1..32 characters, and must match `^[A-Za-z0-9][A-Za-z0-9 -]{0,31}$`. The effective imported name is `<namespace> / <originalName>`. If the effective name exceeds 128 characters, import fails with `BundleMergeConflictError(NamespaceNameTooLong)`. If the effective name already exists in the live DB, import fails with `BundleMergeConflictError(NamespaceNameTaken)`. The importer never appends hidden suffixes.

### Conflict matrix

| Conflict                        | `MergePolicyReplace`                                                                                                                                                                                                                                                 | `MergePolicyMergeById`                                                                                                                                                                                   | `MergePolicySkipExisting`                                             | `MergePolicyNamespace`                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Same `ruleId`                   | Replace live `Rules` row and all child rows (`RuleTolerances`, `RuleShapes`, `RuleImageRefs`) with imported graph. Preserve `ruleId`. If imported `name` is owned by a different live rule, delete that live rule first or fail if it is protected by a caller lock. | Update live row and replace child rows by `ruleId`. Preserve fields not present in the bundle only when the target schema explicitly marks them runtime-only; otherwise imported graph is authoritative. | Skip this imported rule and its child rows. Count as `skippedById`.   | Generate a new UUIDv4 for the imported rule, rewrite all staged child references through the remap table, and apply namespace prefix to `name`. |
| Same `name`, different `ruleId` | Delete the live same-name rule and child rows, then insert the imported rule under its imported `ruleId`. If another imported rule also claims that name, payload validation has already failed with `DuplicateRuleName`.                                            | Fail with `BundleMergeConflictError(NameConflict)`. No live write.                                                                                                                                       | Skip this imported rule and its child rows. Count as `skippedByName`. | Apply namespace prefix before comparison. If prefixed name conflicts, fail with `BundleMergeConflictError(NamespaceNameTaken)`.                 |
| Orphan image asset              | Reject before merge with `BundleInvalidError(OrphanImageAsset)`.                                                                                                                                                                                                     | Reject before merge with `BundleInvalidError(OrphanImageAsset)`.                                                                                                                                         | Reject before merge with `BundleInvalidError(OrphanImageAsset)`.      | Reject before merge with `BundleInvalidError(OrphanImageAsset)`.                                                                                |
| Unknown `RuleKind`              | Reject before merge with `BundleInvalidError(UnknownRuleKind)`.                                                                                                                                                                                                      | Reject before merge with `BundleInvalidError(UnknownRuleKind)`.                                                                                                                                          | Reject before merge with `BundleInvalidError(UnknownRuleKind)`.       | Reject before merge with `BundleInvalidError(UnknownRuleKind)`.                                                                                 |

### Resolution output contract

Merge resolution returns an ordered plan, not live writes:

- `rulesToInsert[]`, `rulesToUpdate[]`, `rulesToDelete[]`, `rulesToSkip[]`.
- `idRemap` for namespace-generated IDs.
- `imageAssetsToPromote[]`, deduped by SHA-256.
- `counts`: `inserted`, `updated`, `deleted`, `skipped`, `conflicted`.

The plan is serialized into the §70.8 success event counts and into failure context when resolution fails. It never logs raw payload rows, image bytes, or tolerance JSON values.

---

## §70.10 Schema Versioning and Compatibility

`schemaVersion` is the compatibility boundary for the manifest and the payload. The current supported version for this spec revision is `1`.

### Import acceptance rule

1. Read `manifest.schemaVersion` during §70.4 validation.
2. For `BundleFormatSqlite`, require `PRAGMA user_version == manifest.schemaVersion` and `BundleMeta.schemaVersion == manifest.schemaVersion`.
3. For `BundleFormatJson`, require top-level `schemaVersion == manifest.schemaVersion`.
4. If `schemaVersion > currentSupported`, abort with `BundleSchemaUnsupportedError` before opening a live DB write transaction.
5. If `schemaVersion == currentSupported`, validate directly against §70.5 or §70.6.
6. If `schemaVersion < currentSupported`, run the `MigrationLadder` in memory, then validate the migrated graph against the current schema.

### `MigrationLadder`

`MigrationLadder` is an ordered set of pure migration entries, each converting exactly one version to the next version:

```
MigrationEntry {
  fromVersion: int
  toVersion: int
  migrate(inputGraph): outputGraph
}
```

Rules:

- Entries must be contiguous. A bundle at version `1` imported into current version `3` runs `1 -> 2` then `2 -> 3`.
- Migrations run only on the staged in-memory graph. They never mutate source ZIP entries and never touch the live DB.
- Each migration must be deterministic: same input graph produces byte-equivalent current-format output.
- Migration output must pass all current §70.5 / §70.6 referential-integrity checks before merge policy resolution.
- A missing ladder step aborts with `BundleSchemaUnsupportedError(MigrationMissing)`.
- Migration failures emit `RuleBundleImportFailed` with `phase = SchemaMigration`, `bundleId` when known, `fromVersion`, `toVersion`, and `correlationId`.

### New schema version checklist

A future `schemaVersion` bump is valid only when the same change set includes all of these items:

1. Increment `currentSupported` in the implementation contract.
2. Update §70.5 SQLite tables or PRAGMAs and §70.6 JSON payload shape as needed.
3. Add one `MigrationLadder` entry from the previous version to the new version.
4. Add importer fixtures for old version, current version, newer unsupported version, missing migration, and payload/manifest mismatch.
5. Update `manifest.json` examples and release notes.

Older supported versions remain readable until a later spec explicitly declares a minimum supported version. No silent downgrade is allowed.

---

## §70.11 Feature Gating, Error Taxonomy, and Ops Events

Ties directly to `60-licensing.md` §60.9. Every entry point in §70.7 and §70.8 is gated before any file I/O or DB read.

### Feature gates (locked)

| Entry point                          | Required feature           | Tier surface       |
| ------------------------------------ | -------------------------- | ------------------ |
| Local export (§70.7)                 | `RuleBundleExport`         | TierTwo, TierThree |
| Local import (§70.8)                 | `RuleBundleImport`         | TierTwo, TierThree |
| Cloud catalog fetch (§70.12)         | `CloudRuleCatalogDownload` | TierThree          |
| Cloud signature verification (§70.8) | `CloudRuleCatalogDownload` | TierThree          |

Rules:

- Gate check runs first in each pipeline. Denial returns `FeatureNotLicensedError` and emits `RuleBundleExportDenied` or `RuleBundleImportDenied` with `feature`, `tier`, and `correlationId`. No ZIP is opened and no DB transaction is started.
- Cloud bundles (`manifest.origin == CloudCatalog`) fail with `FeatureNotLicensedError` at import when `CloudRuleCatalogDownload` is absent, even if `RuleBundleImport` is present.
- Local bundles (`manifest.origin == Local`) never require `CloudRuleCatalogDownload`.

### Typed error taxonomy (PascalCase, no underscores)

| Error                             | Raised in            | Meaning                                                                                                                       |
| --------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `FeatureNotLicensedError`         | §70.7, §70.8, §70.12 | Feature flag denied for the caller's tier.                                                                                    |
| `BundleInvalidError`              | §70.3, §70.4         | ZIP layout, path rules, size caps, or manifest shape violated.                                                                |
| `BundleChecksumMismatchError`     | §70.8                | `manifest.checksum.payloadHex` does not match recomputed payload SHA-256.                                                     |
| `BundleSignatureInvalidError`     | §70.8                | `signature.sig` missing, malformed, wrong key, or verify failed for cloud bundle.                                             |
| `BundleSchemaUnsupportedError`    | §70.10               | `schemaVersion > currentSupported`, or `MigrationMissing` for older.                                                          |
| `BundleMergeConflictError`        | §70.9                | Merge policy resolution cannot proceed (for example `MergeById` id collision under `MergePolicySkipExisting`+strict submode). |
| `BundleReferentialIntegrityError` | §70.5, §70.6         | Foreign-key or asset-graph check failed after staging.                                                                        |

All errors carry `bundleId` when known, `phase` (one of §70.7 / §70.8 stage names), and the current-request `correlationId`. Error messages never include raw signature bytes, raw payload rows, image bytes, or tolerance JSON values.

### Ops events (structured, one row per event)

Emitted through the same audit sink as `E_SEC_*` / `E_CAP_*` families. Event names use the `RuleBundle*` prefix and PascalCase.

| Event                       | Fields (in addition to `correlationId`, `actorUserId`, `ts`)                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `RuleBundleExportRequested` | `bundleFormat`, `ruleCount`, `origin`                                                                                    |
| `RuleBundleExported`        | `bundleId`, `bundleFormat`, `ruleCount`, `imageCount`, `payloadSha256Prefix8`, `durationMs`                              |
| `RuleBundleExportDenied`    | `feature`, `tier`, `reasonCode`                                                                                          |
| `RuleBundleExportFailed`    | `phase`, `errorType`, `reasonCode`, `bundleId?`                                                                          |
| `RuleBundleImportRequested` | `bundleFormat`, `origin`, `mergePolicy`                                                                                  |
| `RuleBundleImported`        | `bundleId`, `bundleFormat`, `origin`, `mergePolicy`, `counts{inserted,updated,deleted,skipped,conflicted}`, `durationMs` |
| `RuleBundleImportDenied`    | `feature`, `tier`, `reasonCode`                                                                                          |
| `RuleBundleImportFailed`    | `phase`, `errorType`, `reasonCode`, `bundleId?`, `fromVersion?`, `toVersion?`                                            |

Rules:

- `payloadSha256Prefix8` is the first 8 hex characters of the SHA-256; the full digest is not logged.
- `reasonCode` is a stable PascalCase token (for example `ChecksumMismatch`, `SignatureMissing`, `MergeConflict`, `MigrationMissing`, `SchemaTooNew`, `EntryCapExceeded`).
- Every failure path in §70.7 and §70.8 emits exactly one `*Failed` event. Missing a failure event is a spec violation.
- Every success path emits exactly one `*Requested` and one `*Exported` / `*Imported` event.

See `./subtasks/16-rule-bundle-import-export-spec/ss-06-gating-and-errors.md`.

---

## §70.12 Cloud Rule Catalog (Forward-Looking)

TierThree-only client behavior. All items in this section are `[TBD]` until a future plan promotes them; nothing in §70.12 is implementable from this revision alone.

### Client role (locked shape, unlocked details)

- Read-only for standard TierThree clients. Uploads are owner-side only (see below).
- All catalog traffic requires `CloudRuleCatalogDownload`. Denial path is §70.11.
- Downloaded bundles land in an offline cache under `config/catalog-cache/` and are then imported via the standard §70.8 pipeline. The cache never bypasses signature verification.

### Endpoints sketch (`[TBD]` shapes)

| Method | Path                     | Purpose                                                             |
| ------ | ------------------------ | ------------------------------------------------------------------- |
| GET    | `/v1/catalog`            | List available bundles (id, name, version, tags, signer id).        |
| GET    | `/v1/bundles/{bundleId}` | Download the `.catrules` ZIP.                                       |
| POST   | `/v1/bundles`            | Owner-side upload with signature. Not exposed to TierThree readers. |

### Offline cache under `config/catalog-cache/`

- Layout: `config/catalog-cache/<bundleId>/bundle.catrules` + `config/catalog-cache/<bundleId>/manifest.json` (copy for fast list).
- Cache entries are addressed by `bundleId`; re-downloading the same `bundleId` requires the newer copy to pass §70.8 checksum and signature before replacing the old one.
- Cache eviction policy is `[TBD]` and tracked in the Open Questions block.

### Signing key handling

- Cloud bundle signatures are verified against a pinned trust set. The trust set format and rotation cadence are `[TBD]`.
- A rotated key never retroactively invalidates a previously cached, still-trusted bundle. Details are `[TBD]`.

### Open Questions block (all Step 12 items)

Tracked here and mirrored into `spec/21-app/46-open-questions.md` at the Plan 16 close-out step.

- ~~Max total uncompressed bundle size~~ - **resolved in §70.3: 256 MiB total, 64 MiB per entry.**
- `[TBD]` Whether image assets dedup across bundles (asset addressing today is per-bundle `sha256`; cross-bundle dedup would need a catalog-side content store).
- `[TBD]` Whether Tolerances travel with Rules or version separately. Currently: Tolerances travel with Rules (`RuleTolerances` / `tolerances[]`); the open question is whether they should also carry an independent version stamp for catalog updates.
- `[TBD]` Catalog auth model (user token vs machine token vs both) and signing key rotation cadence.
- `[TBD]` Owner-side review workflow for cloud uploads (who approves, how rejection is signaled, how a withdrawn bundle propagates to caches).
- `[TBD]` Offline cache eviction policy (`config/catalog-cache/` size cap, LRU vs pinned).
- `[TBD]` Catalog transport (HTTPS-only assumed; whether a signed offline sneakernet import path is also supported).

See `./subtasks/16-rule-bundle-import-export-spec/ss-07-cloud-catalog.md`.

## §70.13 Facade bindings

| Facade                    | Owns                                                                        | Returns                      | Error code                                               |
| ------------------------- | --------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------- |
| `RuleBundleSqliteFacade`  | SQLite payload import, export, schema validation, merge transaction         | `CatRuleBundleSqlitePayload` | `E_BUNDLE_PAYLOAD_UNREADABLE`, `E_BUNDLE_MERGE_CONFLICT` |
| `RuleBundleJsonFacade`    | JSON manifest validation, deterministic serialization, checksum preparation | `CatRuleBundleManifest`      | `E_BUNDLE_MANIFEST_INVALID`, `E_BUNDLE_SIZE_EXCEEDED`    |
| `RuleBundleCatalogFacade` | TierThree catalog download cache and signature handoff                      | `CatRuleBundleCatalogEntry`  | `E_BUNDLE_TIER_DENIED`                                   |

No caller reads ZIP entries directly. Import and export pipelines call the facades above so SQLite and JSON validation stay separate and testable.

## §70.14 Contract back-links

| Target                                          | Required use                                                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `spec/21-app/40-error-manage.md`                | Registers `E_BUNDLE_*` import, export, manifest, checksum, size, tier, and conflict failures.                  |
| `spec/21-app/27-config-surface.md`              | Confirms capture, trigger, lighting, and vendor SDK settings stay outside `.catrules` bundles.                 |
| `.lovable/memory/09-enums-and-results-shape.md` | Locks `BundleFormatSqlite`, `BundleFormatJson`, merge policies, origin values, and reason codes as PascalCase. |

## §70.15 Implementation checklist

- [ ] Export ZIP entry order is deterministic.
- [ ] Manifest validates before payload extraction.
- [ ] SQLite import runs in one transaction per bundle.
- [ ] JSON import validates every enum value as PascalCase.
- [ ] Merge policy is one of `Skip`, `Overwrite`, `Rename`, or `Fail`.
- [ ] Feature gates deny cloud catalog actions below TierThree.
- [ ] Every failure emits a registered `E_BUNDLE_*` code with correlation id.

## Acceptance Checklist

- [ ] `.catrules` container magic bytes + version documented (matches spec 25).
- [ ] Import validates against spec 33 rule catalog; unknown kinds raise `E_BUNDLE_UNKNOWN_KIND`.
- [ ] Export is deterministic (stable field order, no timestamps in payload).
