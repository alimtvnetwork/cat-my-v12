# Release Method & Version Pin Sites

> **Document:** `.ai-memory/release/release-method.md`  
> **Repository:** `alimtvnetwork/cat-my-v12`  
> **Canonical Version Source:** `version.json`

---

## 1. Version Pin Sites

The repository maintains synchronized version references across 5 canonical files:

| File               | Location / Pattern                                       | Type                                |
| ------------------ | -------------------------------------------------------- | ----------------------------------- |
| `version.json`     | `"version": "X.Y.Z"`                                     | Root manifest & canonical authority |
| `package.json`     | `"version": "X.Y.Z"`                                     | Frontend & Bun runtime manifest     |
| `readme.md`        | Badge `<img src="...badge/version-vX.Y.Z-3B82F6" ... />` | §9 Root README badge                |
| `readme.md`        | `<!-- STAMP:VERSION -->vX.Y.Z<!-- /STAMP:VERSION -->`    | §9 Root README STAMP marker         |
| `readme.md`        | `## 🔄 What's New` list item                             | §9 Root README change summary       |
| `CHANGELOG.md`     | `## vX.Y.Z - YYYY-MM-DD`                                 | Keep-a-changelog release history    |
| `RELEASE_NOTES.md` | `## vX.Y.Z - YYYY-MM-DD - <Title>`                       | Release notes archive               |

---

## 2. Release Automation Tool

All automated version bumps and release preparations are orchestrated by:

```bash
python .ai-memory/release/bump_versions.py --type [major|minor|patch] [--title "Headline"] [--dry-run]
```

### Script Invariants

1. **Reads Canonical Version:** Reads from `version.json` (fallback to `package.json`).
2. **Computes SemVer:**
   - `major`: bumps X, resets Y=0, Z=0
   - `minor`: bumps Y, resets Z=0
   - `patch`: bumps Z
3. **Synchronizes Pin Sites:** Updates all 5 pin sites atomically.
4. **Enforces Prettier AST Compliance:** Automatically invokes `bun x prettier --write` on modified files so CI forward-only formatting gates pass.
5. **Executes Quality Gates:** Runs `check-root-readme.py` and `tsc --noEmit` before staging.
6. **Git Tag Policy:** Per specification contract, Git tags are managed externally by GitMap; the script creates clean semantic commits (`chore(release): bump version to vX.Y.Z`) and pushes to the active branch.
