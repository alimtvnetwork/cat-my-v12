# V2 Enhancement Open Decisions (Plan 68 aftermath)

Created: 2026-07-17
Dispatch summary for user: `.lovable/ambiguity-questions/04-plan77-dispatch.md` (Plan 77, 2026-07-18) consolidates every open question here plus Issue 16 blockers into a single reply-ready list.
Parent view: `spec/24-app-ui-design-system/99d-ui-improvements-v2-enhancement.md` §4.
Prior lists: `.lovable/ambiguity-questions/01-ui-v2-open-questions.md`, `.lovable/ambiguity-questions/02-ui-v3-open-questions.md`.

Each entry: `Q<id>. <question>` followed by `Options:`, `Blocks:` (rows in 99d), and `Recommended default:` (agent view, not a decision). No option is applied until the user answers here.

## 4.a V2-scoped

### Q-A-01. Recent Projects surface on Home

Spec 09 L26 asks for a "drop-down button on Home"; Home currently ships full workflow cards (v3.432.0).

Options:

- (a) Add a shadcn `DropdownMenu` "Recent" button to the Titlebar right cluster, listing last 8 project ids from IDB facade.
- (b) Add a dedicated "Recent projects" section under the Home workflow cards.
- (c) Drop the requirement; workflow cards are the surface.

Blocks: I-PR-08.
Recommended default: (a). Matches the spec verb "drop-down", zero home-layout churn.

### Q-A-02. Data folder layout vs facade

Spec 09 L28 mandates `data/<ruleset>/<ruleId>/{image, rules.json}` on disk. Facade stores under IDB `ruleset:<id>` (v3.418.0). Tied to DEC-04.

Options:

- (a) Treat the folder shape as the export/desktop-worker shape only; runtime stays IDB.
- (b) Mirror the folder shape inside IDB (keys `data/<ruleset>/<ruleId>/...`) so future export is a straight walk.
- (c) Retire the folder-layout requirement now that facade owns storage.

Blocks: I-BE-03, I-PR-07.
Recommended default: (a). Keeps runtime clean, defers shape until export path lands.

### Q-A-03. Barcode chain-event exposure

Barcode primitive stores decoded text on the rule (v3.375.0); `/setup/chain-events` inspector (v3.409.0) does not expose it.

Options:

- (a) Auto-expose `Rule.<id>.decodedText` for every barcode rule as an implicit chain input.
- (b) Add an explicit "publish to chain as" field on the barcode rule editor; nothing implicit.
- (c) Introduce a generic `chain-outputs: string[]` field on the rule model for any primitive.

Blocks: I-FS-03.
Recommended default: (b). Explicit beats implicit, no schema migration for other primitives yet.

### Q-A-04. Project zip export shape today

Spec 09 L26 says the zip "contains SQLite DB or specific JSON files". SQLite is deferred (I-BE-01).

Options:

- (a) Ship JSON-only zip now: `manifest.json` + `rulesets/*.json` + `images/*`.
- (b) Block export until SQLite/desktop worker exists.
- (c) Ship JSON-only zip labeled `.project.zip` with a `format-version` and reserve the SQLite path in the manifest.

Blocks: I-PR-07.
Recommended default: (c). Same effort as (a), forward-compatible.

### Q-A-05. Reference images location

Spec 09 L15/L20 says put reference images into "assets folder" with proper names. They live under `spec/24-app-ui-design-system/assets/`.

Options:

- (a) Mirror into `src/assets/spec-references/` for runtime use (empty-state hints, docs pages).
- (b) Leave under spec assets; pure documentation, not runtime.
- (c) Mirror only the subset that the app actually renders (currently: none).

Blocks: I-MT-01.
Recommended default: (b). No runtime consumer today; (a)/(c) is dead weight.

## 4.b Cross-spec P0 gates

These override V2 closure claims. Answers change the closure column in 99d.

### Q-DEC-02. Rule catalog reconciliation

`spec/21` §33 locks 6 rule kinds; `spec/24` lists 10; shipped code has 12 primitives.

Options:

- (a) Update `spec/21` §33 to 12 kinds; the shipped set is canonical v1.
- (b) Keep spec/21 at 6; hide the extra 6 behind a feature flag; mark I-RP-02/05/07/09/10/11 as "shipped, non-canonical".
- (c) Reduce shipped set to spec/21's 6; deprecate the extras (breaking).

Blocks: I-RP-02, I-RP-05, I-RP-07, I-RP-09, I-RP-10, I-RP-11 closure claims.
Recommended default: (a). Users already touch all 12; rollback breaks them.

### Q-DEC-04. Persistence envelope

`spec/21` §36 uses `tasks/<TaskId>/instructions/<InstructionId>.json`; `spec/24` §06 uses flat `programs/<id>.json`; facade uses IDB `ruleset:<id>`.

Options:

- (a) Adopt `spec/21` §36 envelope for export + future SQLite rows; facade IDB keys stay flat internally.
- (b) Adopt `spec/24` §06 flat `programs/<id>.json` envelope; amend spec/21.
- (c) New envelope: `projects/<projectId>/rulesets/<rulesetId>.json` matching current UI vocabulary.

Blocks: I-PR-07, I-SU-06, I-SU-07, I-BE-02, I-BE-03.
Recommended default: (c). Matches user-visible nouns, still one migration.

### Q-DEC-05. Region model in Layers panel

`spec/21` §32 has first-class Regions with roles; current Layers panel is a flat rule list.

Options:

- (a) Promote Regions above rules: two-level tree `Region -> Rule`.
- (b) Absorb Region into rule params (`rule.regionId`); Layers stays flat.
- (c) Add Regions as a separate side panel; Layers stays rule-only.

Blocks: I-RE-04, I-RA-05.
Recommended default: (b). Least UI churn, still lets rules share a region via id.

### Q-DEC-07. Error code namespace

`spec/21` §40 App A owns `E_UI_*` codes; plans 66/67 shipped a separate registry.

Options:

- (a) Fold plan-66/67 registry into `spec/21` App A; App A is the single source.
- (b) Keep two registries; cross-reference via a table in `spec/21` App A.
- (c) Split by layer: `spec/21` owns `E_CORE_*`, plan-66/67 registry owns `E_UI_*`; rename current entries.

Blocks: I-CX-02, I-CX-06 closure claims.
Recommended default: (a). One list, no drift.

## Answer protocol

Reply with one line per Qid, e.g. `Q-A-01 (a); Q-DEC-04 (c); ...`. Unanswered ids stay open. Answers land in this file's "Resolution log" section (to be added on first answer) and get applied to 99d.
