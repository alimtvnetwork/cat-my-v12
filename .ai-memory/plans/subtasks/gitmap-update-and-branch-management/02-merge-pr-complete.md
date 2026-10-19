# Subtask: Merge, PR, and Complete — gitmap-update-and-branch-management

**Version:** 1.0.0
**Updated:** 2026-10-19
**Status:** QUEUED (blocked on PR auth; see Step 5)
**Spec:** 02-spec/21-app/gitmap-update-and-branch-management/02-merge-and-pr-spec.md

---

## Goal

Merge all code from `origin/fix/18-oct-26-joy-multi-device-analyzer`
(`180f843a8d3af629b2d9316ea19e44c324146cc8`) into `main` via a PR, using a
disposable integration branch, with all commits preserved (no squash), and
verify `main` green afterwards.

## Ordered Steps

### Step 1 — Precondition check

- Confirm `main` is at `origin/main` `d36043c5`, tree clean.
- Confirm feature branch ref still resolves to
  `180f843a8d3af629b2d9316ea19e44c324146cc8` via `gitmap LP`.
- Evidence to collect: `gitmap pull` output, both ref SHAs.

### Step 2 — Create the integration branch

- Create `merge/fix-18-oct-26-joy-multi-device-analyzer` from `origin/main`.
- Evidence to collect: branch head SHA (must equal `d36043c5` before merging).

### Step 3 — Merge the feature branch

- Merge `origin/fix/18-oct-26-joy-multi-device-analyzer` into the integration
  branch with a merge commit.
- Resolve any conflicts under the conflict-resolution policy
  (02-merge-and-pr-spec.md section 4): prefer `main` for generated/lockfile
  content, prefer the branch for feature code, inspect every conflict.
- Evidence to collect: per-conflict resolution record (file, sides, choice,
  reason); merge commit SHA; abort and escalate on unresolvable conflicts.

### Step 4 — Push the integration branch

- Push via git-over-SSH; confirm remote ref matches the local merge commit SHA.
- Evidence to collect: push output, remote ref SHA.

### Step 5 — Create the PR (GATED ON AUTH)

- **Blocked:** GitHub session not authenticated (`gh` not logged in; `gitmap
login --status` → not logged in). Do not attempt PR creation until the user
  confirms one of the auth options the lead presented.
- Once auth is confirmed: `gitmap pr
merge/fix-18-oct-26-joy-multi-device-analyzer main`; title `Merge
fix/18-oct-26-joy-multi-device-analyzer into main`; body per spec section 5.
- Evidence to collect: PR number.

### Step 6 — Merge the PR

- Merge with ALL commits, NO squash (regular merge commit; PR #10 precedent).
- Never rebase/squash/force-push/amend pushed commits (Lovable-linked repo).
- Evidence to collect: merge commit SHA on `main`.

### Step 7 — Post-merge verification

- `main` clean and in sync with `origin/main`.
- CI green via `gitmap pe -t`.
- Feature branch commits reachable from `main`.
- Evidence to collect: sync state, `gitmap pe -t` output, merge commit SHA.

### Step 8 — Task closeout

- Leave both remote branches in place (user did not order deletion).
- Update this plan's status; commit the spec + plan files with targeted
  `git add <relative paths>` only (never `git add -A` / `gitmap cpf`;
  `.gitmap/release/` is not gitignored).

## Done Criteria

1. `main` contains the merge commit from the PR, with all commits from
   `origin/fix/18-oct-26-joy-multi-device-analyzer` reachable from it.
2. CI is green (`gitmap pe -t`) on `main` after the merge.
3. PR is merged and closed; PR number and merge commit SHA recorded above.
4. No remote branches were deleted.
5. Spec and plan files committed with targeted `git add`.

## Rollback Notes

- The integration branch is disposable: if the merge goes wrong, abandon it,
  create a fresh one from `origin/main`, and redo. `main` is never touched
  directly until the PR merge, so there is nothing to roll back on `main`
  before that point.
- If the PR is created against the wrong head, close it and open a new one;
  do not force-push to the integration branch after the PR is open (Lovable
  history rewrite rule).
