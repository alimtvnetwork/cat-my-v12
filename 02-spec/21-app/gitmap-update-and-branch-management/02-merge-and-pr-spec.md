# Merge and PR Spec: GitMap Update and Branch Management

**Version:** 1.0.0
**Updated:** 2026-10-19
**Status:** Active

---

## 1. Branch Identity (Corrected)

The user's request names `fix/18October2026Joy*` as the latest branch. That
pattern matches nothing on the remote. Spec 01 records the correction:

- **Canonical branch:** `origin/fix/18-oct-26-joy-multi-device-analyzer`
- **Pinned SHA:** `180f843a8d3af629b2d9316ea19e44c324146cc8`
- **Head commit:** "feat(vision): make OCR format and character count checks
  optional by default" (18-Oct-2026)

All merge work targets the canonical name above. Any step that references the
user's literal pattern must stop and re-resolve via `gitmap LP` before
proceeding.

## 2. Integration Branch Strategy

- Integration branch name: `merge/fix-18-oct-26-joy-multi-device-analyzer`
- Base: created from `origin/main` at `d36043c5` (lead-verified lead state;
  fast-forwarded, tree clean, 118 files).
- Direction: merge `origin/fix/18-oct-26-joy-multi-device-analyzer` **into**
  the integration branch. `main` is never touched directly until the PR merge.

This keeps every trial merge disposable: a bad merge is redone on a fresh
integration branch, and the pushed `main` history (Lovable-linked) is never at
risk.

## 3. Merge Execution

1. Fetch both refs (`origin/main`, `origin/fix/18-oct-26-joy-multi-device-analyzer`)
   and confirm the pinned SHAs before merging.
2. Create `merge/fix-18-oct-26-joy-multi-device-analyzer` from `origin/main`.
3. Merge `origin/fix/18-oct-26-joy-multi-device-analyzer` into it with a merge
   commit (never fast-forward here; the merge commit documents the union).
4. Resolve conflicts per the policy in section 4. Record **every** resolution:
   conflicted file, both sides' SHAs, chosen side, reason, and resulting diff
   evidence.
5. Push the integration branch via git-over-SSH; confirm the remote ref matches
   the local merge commit SHA.

## 4. Conflict-Resolution Policy

- **Inspect every conflict.** No blanket `--theirs`/`--ours`, no auto-resolver
  output accepted without review.
- **Prefer `main`** for generated files, lockfiles, and CI/workflow files that
  the main-line owners treat as source of truth.
- **Prefer the feature branch** for feature code it owns (the
  multi-device analyzer work and anything it introduces).
- **Hybrid conflicts** (both sides legitimately changed the same logic):
  hand-merge line by line, keep both behaviors, and note the rationale per
  file in the resolution record.
- If a conflict involves a binary asset, a deleted-vs-edited file, or a
  semantic collision that cannot be resolved with confidence from the diffs
  alone, escalate to the user with the evidence — do not guess.

### Abort criteria

Stop the merge (leave the integration branch as-is, report state) if:

- conflicts remain unresolvable under the policy above;
- the merge produces a tree that does not compile/type-check cleanly in a way
  that was clean on both parents (regression introduced by the merge itself);
- either remote ref moved during the merge (re-fetch, re-verify SHAs, restart).

## 5. PR Creation (Blocked on Auth)

**Dependency:** the GitHub session on this machine is not authenticated
(`gh` not logged in; `gitmap login --status` → not logged in). PR creation is
blocked until the user confirms one of the auth options the lead is
presenting. `gitmap pr LEFT RIGHT` exists but requires login, so no PR is
created before auth is resolved.

Steps once auth is confirmed:

1. Create PR: `gitmap pr merge/fix-18-oct-26-joy-multi-device-analyzer main`
   (base `main`, head the integration branch).
2. Title convention: `Merge fix/18-oct-26-joy-multi-device-analyzer into main`.
3. Body convention: branch head SHA, merge commit SHA on the integration
   branch, one-line summary of the branch contents (multi-device analyzer
   work), conflict-resolution summary or "no conflicts", and test/CI evidence.
4. Record the PR number in the subtask plan. Do not embed absolute URLs or
   `file:///` URIs in specs, plans, or release notes — relative paths and the
   PR number only.

## 6. PR Merge Policy

- Merge with **ALL commits, NO squash** — explicit standing user order (PR #10
  precedent used a regular merge commit via `gh pr merge --merge`; `main` is
  not branch-protected).
- Never rewrite pushed history: no rebase, no squash, no force-push, no amend
  of pushed commits. This repo is Lovable-linked.
- Record the resulting merge commit SHA on `main`.

## 7. Post-Merge Verification

1. `main` is clean and in sync with `origin/main` after the merge.
2. CI watched via `gitmap pe -t` — must be green.
3. The merge commit is present on `main` with the full commit history intact
   (verify: the feature branch's commits are reachable from `main`).

## 8. Branch-Cleanup Policy

Leave remote branches in place. The user did not ask to delete anything:

- `origin/fix/18-oct-26-joy-multi-device-analyzer` stays.
- `merge/fix-18-oct-26-joy-multi-device-analyzer` stays.

Deletion of either requires an explicit user order.

## 9. Commit Hygiene for This Task

`.gitmap/release/` is not gitignored. The final task commit that lands the spec
and plan files must use targeted `git add <relative paths>` only — never
`git add -A` and never `gitmap cpf`. The only untracked working path at spec
time is `.ai-memory/temp-agents/` (lead run bookkeeping) and it must never be
added or referenced.

## 10. Companion Files

- Spec 01 (gitmap sync + branch discovery) is owned by Spec Author A:
  `02-spec/21-app/gitmap-update-and-branch-management/01-architecture-spec.md`.
- Subtask plan for this spec:
  `.ai-memory/plans/subtasks/gitmap-update-and-branch-management/02-merge-pr-complete.md`.
- Parent plan: `.ai-memory/plans/gitmap-update-and-branch-management.md`.
