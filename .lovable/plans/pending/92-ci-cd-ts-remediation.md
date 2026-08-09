# CI/CD and Type-Safety Remediation Plan

## User Review Required

This plan outlines the steps required to resolve the failing CI/CD pipelines (TypeScript, Mermaid diagrams, and Pytest issues). Please review and approve to proceed with execution.

## Proposed Changes

### 1. Fix Pytest / Test Directory Not Found in CI

**Root Cause**: The `.gitignore` file contains `tests/` on line 46, which caused the entire test suite to be excluded from the Git repository. Consequently, GitHub Actions could not find `tests/e2e/padding_tokens_visual.py` or the `tests` directory.
**Changes**:

- Remove `tests/` from `.gitignore`.
- Run `git add tests/` to stage the test suite for commit.

### 2. Fix Mermaid Diagram Rendering (`render-mmd-check.sh`)

**Root Cause**: Puppeteer (used by `mmdc`) fails on Ubuntu GitHub Action runners when unprivileged user namespaces with AppArmor are restricted, complaining about "No usable sandbox".
**Changes**:

- Modify `scripts/render-mmd-check.sh` to generate a temporary `puppeteer-config.json` with `{"args": ["--no-sandbox"]}`.
- Update the `mmdc` invocation to include `-p "$TMP/puppeteer-config.json"`.

### 3. Fix TypeScript Compilation Errors (`bunx tsc --noEmit`)

**Root Cause**: Recent string-to-Enum refactoring left mismatched types, incorrect Enum casing (e.g., `Beforerule` vs `BeforeRule`), missing `*Type` suffixes (e.g., `ScoreErrorCodeType`), and unaligned Zod schemas in `observability` routes.
**Changes**:

#### Observability Routes

- `observability.sessions.$cliInvocationId.ipc.tsx` & `logs.tsx`: Use `.passthrough()` on the Zod schemas in `ipc.functions.ts` and `logs.functions.ts` to allow extra fields like `_ParseError`, `timestamp`, `Items`, `Count`, etc. that are returned by the backend but omitted in the TS interfaces.
- `observability.sessions.tsx`: Cast sort values properly against `SortKeyType`.

#### Seed Bindings & Mocks

- `src/lib/projects/seed-bindings.ts`: Add `getAll` mock methods and strong typings to `CameraFacade` and `MicSettingsFacade`. Add missing `.id` and `.name` properties to the mocks.
- `src/lib/projects/seed.ts`: Fix `EditorRuleKind` to the correct enum (likely `RuleKindType`).

#### Enum Naming & Casing

- Fix `Beforerule` to `BeforeRule` and `Beforeruleset` to `BeforeRuleset` across all test files and routes (e.g., `chain-events-io.test.ts`, `setup.chain-events.tsx`).
- Fix `PropertiesPaletteRuleKindType` and `RuleKindType` mismatched assignments in `RuleEditor.tsx` and `envelopeAdapter.ts`.
- Fix `EditorToolFamilyType` assignment in `src/lib/editor/tools/index.ts`.
- Fix `ScoreErrorCodeType` in `validation.functions.ts` and `ValidateAgainstImageDialog.tsx`.
- Fix `StatusFilterType` assignments in `setup.rules.tsx`.

### 4. Create Query Wrapper

- Create a unified wrapper in `src/lib/http/queryWrapper.ts` (and a Python equivalent under `app/core/telemetry/` or `app/core/http/`) that wraps API requests and automatically catches and logs failures using explicit boolean state checks (`isFail`).

### 5. Memory Enforcement

- Perform the rigid session memory update in `.lovable/` containing root causes, workflow summaries, and strict rules for future iterations.

## Verification Plan

1. `bunx tsc --noEmit` returns 0 errors.
2. `scripts/render-mmd-check.sh` successfully executes locally.
3. `git status` shows the tests directory staged and ready to be committed to resolve the CI pipeline issues.
4. `.lovable/` folder contains the required updated indices and strictly-avoid files.
