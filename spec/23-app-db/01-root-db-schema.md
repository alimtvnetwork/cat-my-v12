# Root DB Schema (App-Scoped)

**Anchor:** `spec/21-app/21-root-db.md` (contract) · `spec/21-app/05-db-conventions-digest.md` (naming).
**Owns:** `app/core/io/migrations/root/*.sql`.
**Status:** Locked.

## 1. Casing Waiver (overrides `spec/04-database-conventions/01`)

This app uses **PascalCase table names, camelCase column names, camelCase JSON keys** — matching `spec/21-app/05-db-conventions-digest.md` and `.lovable/coding-guidelines/coding-guidelines.md` §"Data & Schema Rules" rule 2.

Where this conflicts with the generic `spec/04-database-conventions/01-naming-conventions.md` "Column names — PascalCase" rule (L21), the folder-level app spec wins per the meta-rule in `.lovable/prompts/86-next-task.md` §"Additional Instruction": _"prefer the folder-level spec … and call out the conflict."_

**Rationale.** The v1 app spec, the code, and the coding guidelines were all authored against the same camelCase convention; a rename would touch every read/write site (`migrate.py`, `pending_writer.py`, `results_writer.py`, UI RPC contracts, JSON key parity with `results.jsonl`) for zero behavioural gain. The waiver is scoped to this app's SQLite DBs (`root.db`, `task.db`, `rules.db`); non-app libraries under `spec/04` retain PascalCase.

Closes audit finding **F-76** (RESOLVED-VIA-WAIVER).

## 2. Table Inventory (as of migration 001)

| Table           | Purpose                           | Migration |
| --------------- | --------------------------------- | --------- |
| `SchemaVersion` | Applied migration ledger          | 000       |
| `Job`           | Named Job container               | 000       |
| `Task`          | Named Task under a Job            | 000       |
| `RunSession`    | One Run of a Task                 | 000       |
| `WorkerRun`     | Per-worker lifecycle within a Run | 000       |
| `AppSetting`    | Global key/value config           | 000       |

## 3. Referential Integrity

Migration `001_integrity_and_idempotency.sql` adds:

- `PRAGMA foreign_keys=ON` enforced at connection open by `migrate.py`.
- `INSERT OR IGNORE` on the `SchemaVersion(0)` seed (fixes F-78 — replay idempotency, gate A-07).
- Documented FK relationships (declared via `001` add-column-less approach: SQLite cannot add FKs to existing tables, so v1 relies on `PRAGMA foreign_keys=ON` + application-level enforcement; a v2 `CREATE TABLE ... FOREIGN KEY` rebuild is tracked in `spec/21-app/46-open-questions.md`).

Closes audit findings **F-78** and (partially) **F-79** — the pragma is on; the full FK rebuild is a v2 concern documented above.

## 4. SQLite Column Contract for Rules (Plan 64 step 23)

The `Rule` table stores kind-typed parameters both as first-class columns (fast, indexable, migration-checkable) and as a `paramsJson` blob (forward-compatible for kind extensions). Every rule kind MUST use only the columns listed for its kind; all others MUST be NULL. Readers Zod-validate `paramsJson` against the schema for `kind` on load.

### 4.1 Shared columns (all kinds)

| Column           | Type    | Notes                                                   |
| ---------------- | ------- | ------------------------------------------------------- |
| `id`             | TEXT PK | UUIDv7 as text.                                         |
| `ruleSetId`      | TEXT FK | FK to `RuleSet.id`.                                     |
| `parentRuleId`   | TEXT?   | Group parent, NULL when the rule is top-level.          |
| `name`           | TEXT    | Display name (Title-Case).                              |
| `kind`           | TEXT    | One of the enum values in `13-rule-kinds-catalogue.md`. |
| `sequence`       | INTEGER | Order within its parent (Group or RuleSet root).        |
| `enabled`        | INTEGER | 0/1.                                                    |
| `updatedAt`      | TEXT    | ISO-8601 UTC.                                           |
| `paramsJson`     | TEXT    | Full typed payload, mirrors columns below.              |
| `checksumSha256` | TEXT    | Over `paramsJson` + shape refs, for export integrity.   |

### 4.2 Geometry columns (used by every kind with a spatial ROI)

| Column        | Type  | Kinds                                                               |
| ------------- | ----- | ------------------------------------------------------------------- |
| `roiX`        | REAL  | Rectangle*, Circular*, Presence, Absence, Flaw, Blob, Barcode.      |
| `roiY`        | REAL  | Same.                                                               |
| `roiW`        | REAL  | Rectangle\*, Presence, Absence, Flaw, Blob, Barcode.                |
| `roiH`        | REAL  | Same.                                                               |
| `roiRadius`   | REAL  | Circular\*.                                                         |
| `roiShapeId`  | TEXT? | CustomShapeOcr and any kind using a compiled Shape via `RuleShape`. |
| `roiRotation` | REAL  | Default 0 degrees; used by Rectangle\*, Barcode.                    |

### 4.3 Kind-specific columns

| Column               | Type     | Applies to                                | Notes                                                        |
| -------------------- | -------- | ----------------------------------------- | ------------------------------------------------------------ |
| `ocrExpectedText`    | TEXT?    | RectangleOcr, CircularOcr, CustomShapeOcr | Regex allowed with `re:` prefix.                             |
| `ocrLanguage`        | TEXT?    | OCR kinds                                 | Default `en`.                                                |
| `ocrConfidenceMin`   | REAL?    | OCR kinds                                 | 0-1.                                                         |
| `presenceThreshold`  | REAL?    | Presence, Absence                         | 0-1 score.                                                   |
| `flawSensitivity`    | REAL?    | FlawDetection                             | 0-1.                                                         |
| `flawMinAreaPx`      | INTEGER? | FlawDetection                             | Discard tinier defects.                                      |
| `blobMinAreaPx`      | INTEGER? | BlobDetection                             |                                                              |
| `blobMaxAreaPx`      | INTEGER? | BlobDetection                             |                                                              |
| `blobConnectivity`   | INTEGER? | BlobDetection                             | 4 or 8.                                                      |
| `barcodeSymbology`   | TEXT?    | BarcodeQr                                 | Enum per `29-barcode-qr.md` (blocked by Q10 for final list). |
| `barcodeExpected`    | TEXT?    | BarcodeQr                                 | Optional literal or `re:` regex.                             |
| `posAdjustEdgeW`     | REAL?    | PositionalAdjust modifier                 | Edge width in pixels.                                        |
| `posAdjustEdgePitch` | REAL?    | PositionalAdjust modifier                 | Edge pitch in pixels.                                        |
| `jsFunctionId`       | TEXT?    | UserJsFunction                            | FK to `JsFunction.id`.                                       |
| `groupPolicy`        | TEXT?    | Group                                     | `AllPass`, `AnyPass`, `FirstPass`.                           |

### 4.4 Migration hygiene

- New columns are nullable and add no DEFAULT (rule 12 of DB conventions).
- Adding a rule kind = add its enum value, add its columns to this table, add a Zod branch. No columns are ever renamed; deprecated columns get an `x_` prefix and an accompanying migration note.
- `paramsJson` is authoritative for round-tripping export/import; the typed columns exist for indexing and constraint checks. Readers MUST assert equivalence at load and refuse rows where the two disagree with `code: "IntegrityError"`.

### 4.5 Verification

- `tests/db/rule-column-contract.test.ts` inserts a fixture per kind and asserts (a) only the listed columns are non-null, (b) `paramsJson` round-trips through Zod without loss, (c) `checksumSha256` matches a recomputation.
- `linter-scripts/check-forbidden-strings.py` gains a rule against renaming any listed column.
