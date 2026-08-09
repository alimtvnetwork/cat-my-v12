# 98 — Spec Changelog Contract

**Status:** Locked (Plan 04 Step 45). Defines how spec changes are recorded, versioned, and tied back to code + memory. This section governs `changelog.md` and `release_notes.md` for spec-affecting work; it does not replace them.

Anchors: 00 (authoring rules), 26 (migrations), 46 (open questions), 97 (acceptance), 99 (consistency report).

## 1. Scope

A "spec change" is any edit under `spec/**` or any code/memory change that alters a contract declared in `spec/21-app/*`. Cosmetic edits (typos, formatting) are still recorded but do not bump the minor version.

## 2. Version Rules

- Project uses SemVer per root `readme.md`.
- **Minor bump** — new spec section, new gate in 97, resolved `BLOCKS_V1` question in 46, or any new `E_*` code.
- **Patch bump** — clarifications, typo fixes, prompt archival, plan-progress bumps that add no contract.
- **Major bump** — reserved for v1 acceptance (A-01 → A-23 all green) and for breaking changes after v1.

No version may be reused. No version may be skipped without a `CHANGELOG` note explaining why.

## 3. CHANGELOG Entry Shape

Every entry MUST include:

```
## [<version>] — <YYYY-MM-DD>

### Added | Changed | Removed | Fixed | Security
- <one-line change> — anchor: <spec section or file> — refs: <Q-NN | A-NN | plan step>
```

Rules:

- Every bullet cites the anchor it changes. A bullet without an anchor is `E_CHANGELOG_UNANCHORED`.
- Resolving an open question MUST include the `Q-<NN>` ref AND edit 46 §5 in the same commit.
- Adding an acceptance gate MUST include the `A-<NN>` ref AND edit 97.

## 4. RELEASE_NOTES Entry Shape

`release_notes.md` is operator-facing; it summarizes the "so what" per version in prose, not a bullet list. Every release note MUST:

- State the user-visible impact in 1–3 sentences.
- Name the anchor(s) touched.
- Call out any behavioral change that requires a config or migration action (link to 26).

An empty or vibes-only release note is `E_RELEASE_NOTE_HOLLOW`.

## 5. README Pin

Root `readme.md` line 3 pins the current version. Every version bump MUST update that line in the same commit as the CHANGELOG entry. Drift is `E_RELEASE_UNPINNED` (mirrors A-23).

## 6. Commit / Turn Bundling

A single agent turn that bumps the version MUST touch all four surfaces atomically:

1. Anchor spec file(s).
2. `changelog.md` — new version block on top.
3. `release_notes.md` — new version block on top.
4. `readme.md` — pinned version line.

Missing any of the four is `E_RELEASE_INCOMPLETE_BUNDLE`.

## 7. Prompt Archival

The `next task` alias in `.lovable/prompt.md` MUST advance to the newly archived prompt file in the same commit as the version bump. Stale alias is `E_PROMPT_ALIAS_STALE`.

## 8. Failure Modes

- `E_CHANGELOG_UNANCHORED` — bullet lacks anchor.
- `E_CHANGELOG_MISSING_ENTRY` — spec edit shipped without changelog line.
- `E_RELEASE_NOTE_HOLLOW` — release note lacks user-visible impact.
- `E_RELEASE_UNPINNED` — README version out of sync.
- `E_RELEASE_INCOMPLETE_BUNDLE` — bump touched fewer than the four required surfaces.
- `E_PROMPT_ALIAS_STALE` — `next task` alias not advanced.

## 9. Non-Goals

- This section does NOT define code-level commit messages.
- It does NOT define git tags — tagging is governed by 97 §8 (declaration procedure).

## Acceptance Checklist

- [ ] Every entry is dated and pins a semver version.
- [ ] Every entry links to the plan file(s) whose steps landed in it.
- [ ] Contract-breaking changes flagged with `BREAKING:` prefix.
