# 4-Part Root Cause Analysis (RCA): Prettier Formatting Gate Failure in CI

> **Issue ID:** #44  
> **Target Repository:** `alimtvnetwork/cat-my-v12`  
> **Failed Run:** [GitHub Actions Run #35420306845](https://github.com/alimtvnetwork/cat-my-v12/actions/runs/35420306845)  
> **Commit SHA:** `7502ba2`  
> **Date:** 2026-09-19

---

## 1. Why It Happened (Symptom)

The GitHub Actions CI pipeline failed at the `Frontend lint + typecheck + tests` job on the step `Prettier (format check on changed files)` with exit code 123:

```text
Checking:
.ai-memory/issues/43-typecheck-error-code-undefined.md
.ai-memory/memory/issues/43-typecheck-error-code-undefined.md
.ai-memory/strictly-avoid.md
.lovable/issues/43-typecheck-error-code-undefined.md
.lovable/issues/index.md
CHANGELOG.md
RELEASE_NOTES.md
package.json
readme.md
src/types/errors.ts
Checking formatting...
[warn] .ai-memory/issues/43-typecheck-error-code-undefined.md
[warn] .ai-memory/memory/issues/43-typecheck-error-code-undefined.md
[warn] .ai-memory/strictly-avoid.md
[warn] .lovable/issues/43-typecheck-error-code-undefined.md
[warn] .lovable/issues/index.md
[warn] CHANGELOG.md
[warn] readme.md
[warn] Code style issues found in 7 files. Run Prettier with --write to fix.
##[error]Process completed with exit code 123.
```

---

## 2. How It Happened

The CI workflow step `Prettier (format check on changed files)` in `.github/workflows/ci.yml` compares the latest commit against `HEAD~1`, collecting all changed formattable files (`.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.css`, `.md`, `.yml`), and executes:

```bash
echo "${CHANGED}" | xargs bunx prettier --check
```

In commit `7502ba2`, markdown files (`.ai-memory/issues/43-typecheck-error-code-undefined.md`, `CHANGELOG.md`, `readme.md`, etc.) were authored and modified directly via file editing tools without running `bun x prettier --write` before committing. Prettier identified whitespace, newline, and list indentation formatting discrepancies in 7 of the touched files, returning exit code 123 (from `xargs`).

---

## 3. Root Cause

1. **Omission of Pre-Commit Prettier Formatting:** While `tsc --noEmit` and `check-root-readme.py` were executed and verified, `bun x prettier --check` was not run on all touched files prior to staging and pushing commit `7502ba2`.
2. **Strict CI Forward-Only Formatting Gate:** CI strictly enforces `prettier --check` against all files touched in the latest commit, requiring exact Prettier AST formatting compliance for all `.md` and code files.

---

## 4. Code Fix & Prevention

### Code Fix

1. Ran `bun x prettier --write` across all modified files:
   - `.ai-memory/issues/43-typecheck-error-code-undefined.md`
   - `.ai-memory/memory/issues/43-typecheck-error-code-undefined.md`
   - `.ai-memory/strictly-avoid.md`
   - `.lovable/issues/43-typecheck-error-code-undefined.md`
   - `.lovable/issues/index.md`
   - `CHANGELOG.md`
   - `RELEASE_NOTES.md`
   - `package.json`
   - `readme.md`
   - `src/types/errors.ts`
2. Formatted all new and existing issue files with Prettier so `bun x prettier --check` exits 0 with `All matched files use Prettier code style!`.

### Prevention

1. **Mandatory Prettier Execution Before Commit:** Always run `bun x prettier --write <touched-files>` and verify with `bun x prettier --check <touched-files>` before creating any git commit touching `.ts`, `.tsx`, `.json`, or `.md` files.
2. **Updated Memory & Strictly-Avoid:** Document the requirement in `.ai-memory/strictly-avoid.md`.
