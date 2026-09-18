# SS-01: Spec and IPC Linters

## Objective

Restore the strictness of the markdown cross-link and folder reference linters, then fix the actual underlying broken links across the `.ai-memory` and `02-spec` documentation files. Do not blindly revert unrelated legitimate compatibility fixes.

## Files/Area Involved

- `linter-scripts/check-spec-cross-links.py`
- `linter-scripts/check-spec-folder-refs.py`
- `linter-scripts/spec-cross-links.allowlist`
- `linter-scripts/spec-folder-refs.allowlist`
- Various `.md` files in `02-spec/` and `.ai-memory/`

## Verification Command

```bash
python linter-scripts/check-spec-cross-links.py
python linter-scripts/check-spec-folder-refs.py
python linter-scripts/check-forbidden-strings.py
```

## Completion Condition

The python scripts are reverted to their original strictness (allowlists pruned of recent bloat), the markdown files are corrected to point to valid paths, and the three verification commands exit with code 0.

## Recovery/Checkpoint Instructions

- **Revert Step:** `git checkout HEAD -- linter-scripts/check-spec-cross-links.py linter-scripts/check-spec-folder-refs.py linter-scripts/spec-cross-links.allowlist linter-scripts/spec-folder-refs.allowlist`
- **Commit Boundary:** Commit these fixes as a single logical unit labeled `docs(spec): fix broken cross-links and restore linter strictness` before proceeding to SS-02.
