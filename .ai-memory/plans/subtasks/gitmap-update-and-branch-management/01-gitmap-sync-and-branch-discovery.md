# Subtask 01: GitMap Sync and Branch Discovery

**Version:** 1.0.0
**Updated:** 2026-10-19
**Status:** Ready
**Parent:** `.ai-memory/plans/gitmap-update-and-branch-management.md`

---

## Goal

Bring the cat-my-v12 checkout fully up to date and identify the exact origin
branch to merge, using only verified-correct gitmap commands. This subtask does
no merging and no PR work — it leaves the repo clean, current, and the target
branch positively identified for the downstream merge worker.

## Constraints

- Invoke the gitmap binary via its full path (it is not on PATH).
- Codebase search, if needed, uses gitmap-only commands (`gitmap aum search`,
  `gitmap find`, `gitmap cat`, `gitmap ps`, `gitmap py`, `gitmap llm train`) —
  total ban on rg, ripgrep, grep, git grep, Select-String.
- Record everything with repo-relative paths; zero absolute paths, zero
  `file:///` URIs.
- Never run `gitmap space update` (does not exist), `gitmap cat my`, or
  `gitmap LP` — all verified invalid.

---

## Ordered Steps

### 1. Record the `gitmap space update` skip

Do NOT run it. Record skipped with rationale: the `space` subcommand has no
`update` action in gitmap v6.566.4 (available: `common`, `backup-branch`,
`PR-merge`, `send-email`, `schedule-send-email`).

**Evidence to collect:** gitmap version line and the space help output showing
the available subcommands.

### 2. Attempt `gitmap pa` (pull-all)

Run it so the run record is current.

**Evidence to collect:** exit code and full per-repo output.

**Known state:** fails fleet-wide with `Permission denied (publickey)` on clean
repos even though interactive `ssh -T git@github.com` succeeds as
`alimtvnetwork`. Also known: `repo-cache` and `story-telling-v1` were dirty and
skipped — out of scope; do not touch them.

### 3. Fallback pull in the task repo (only if pa fails)

Run `git pull --ff-only` over SSH in the cat-my-v12 repo. If it reports
"already up to date", that is a success state — record it.

**Evidence to collect:** before/after HEAD refs, files-changed count, exit
code, and tree-clean confirmation.

**Verified precedent:** main `fe80352b` → `d36043c5`, 118 files, exit 0.

### 4. Discover the latest branch with `gitmap lb`

`gitmap lb` (latest-branch) is the ONLY valid discovery command.

**Evidence to collect:** the full `lb` output line(s).

**Verified result:** `origin/fix/18-oct-26-joy-multi-device-analyzer`
@ `180f843a8d3af629b2d9316ea19e44c324146cc8`, 18-Oct-2026 08:05 PM, subject
"feat(vision): make OCR format and character count checks optional by default".

**Name correction:** the user's literal pattern `fix/18October2026Joy*` matches
nothing on origin — record the canonical name exactly as `lb` reports it and
use only that name downstream.

### 5. Verify branch + main state for the merge worker

- Confirm the branch ref exists on origin at the reported commit.
- Confirm main is fast-forward clean with no local divergence that would block
  the later merge.

**Evidence to collect:** branch ref listing line, main HEAD ref, clean-tree
confirmation.

### 6. Hand off with commit-hygiene notes for the merge worker

- `.gitmap/release/` is NOT gitignored — the merge worker must commit ONLY via
  targeted `git add <relative paths>`, NEVER `git add -A` / `gitmap cpf`.
- Repo is Lovable-linked — NEVER rewrite pushed history: merge commits only,
  no rebase/squash/force-push/amend of pushed commits.
- Merge preference: all commits, no squash (`gh pr merge --merge` semantics, PR
  #10 precedent).

---

## Done Criteria

- [ ] Space-update skip recorded with version/subcommand evidence.
- [ ] `gitmap pa` attempted with exit code and output captured.
- [ ] Repo on latest origin/main, tree clean (fallback pull evidence or
      "already up to date" recorded).
- [ ] `gitmap lb` output captured; canonical branch name recorded exactly:
      `fix/18-oct-26-joy-multi-device-analyzer`.
- [ ] Branch ref + main HEAD verified for the merge worker.
- [ ] Handoff notes delivered; no merge or PR action taken in this subtask.
- [ ] No absolute paths in any artifact produced.
