# GitMap Update and Branch Management — Architecture Spec

**Version:** 1.0.0
**Updated:** 2026-10-19
**Status:** In Progress

---

## User Request (Verbatim)

```text
# GitMap Update and Branch Management: high priority instruction, non-negotiable task

Update the Gitmap using gitmap space update, then run the Gitmap PA command. Then use the cat my and find the latest branch using Gitmap. You can do gitmap LP. That would give you the latest branch, which is the fix/18October2026Joy something. Merge all this code, create a PR, and merge all this code using the PR to the main branch, and then complete that PR as well.

## task: GitMap Update and Branch Management
## slug: gitmap-update-and-branch-management

# Actionable Items Must Follow Non-Negotiable

1. Git pull BEFORE starting any work — first try `gitmap pull <repo path>` (or run `gitmap pull` in repository folder); if that fails, fall back to regular `git pull` and resolve any merge conflicts so the repository is completely up to date and clean before starting.
2. Write spec under 02-spec/21-app/gitmap-update-and-branch-management/ and enqueue plan task in .ai-memory/plans/gitmap-update-and-branch-management.md (subtasks in .ai-memory/plans/subtasks/gitmap-update-and-branch-management/) first
3. Search codebase exclusively via GitMap (gitmap aum search, gitmap find, gitmap cat, gitmap ps, gitmap py, gitmap llm train); TOTAL BAN on rg, ripgrep, grep, git grep, Select-String
4. Strictly use relative Git paths (02-spec/..., .ai-memory/..., cmd/...); only add the relative paths, never add the absolute path during your work, and ensure this is respected on the release page and in release notes as well
5. Update the Gitmap using `gitmap space update`.
6. Run the Gitmap PA command.
7. Use `gitmap cat my` to find the latest branch.
8. Execute `gitmap LP` to identify the latest branch, which is `fix/18October2026Joy`.
9. Merge all code from the identified branch.
10. Create a PR and merge all code using the PR to the main branch.
11. Complete the PR process.

## Must follow and spawn agent using

[execute-parent-task-with-n-steps-v6](file;.agents/skills/execute-parent-task-with-n-steps-v6)

## Additional Instructions

- [/plan](slashCommand;plan) first before doing the work to reduce the credits.
- [/learn](slashCommand;learn) from [gitmap](file;.agents/skills/gitmap) skill to leverage GitMap high-speed search, toolchain discovery, and caching.
- Only add the relative paths, never add the absolute path during your work; this should be respected on the release page and in release notes as well.
```

---

## Corrected Command Matrix

Every prescribed command was probed against the installed gitmap binary
(v6.566.4, kept in the workspace tools dir and NOT on PATH — always invoke it
via its full path). Dispositions:

| #   | Prescribed step                 | Actual command                           | Evidence                                                                                                                                                                                                             | Disposition                                                                |
| --- | ------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 5   | `gitmap space update`           | — (does not exist)                       | v6.566.4 space subcommands: `common`, `backup-branch`, `PR-merge`, `send-email`, `schedule-send-email`                                                                                                               | **SKIPPED** — invalid step, recorded with evidence                         |
| 6   | GitMap PA command               | `gitmap pa` attempted                    | Fails fleet-wide: `Permission denied (publickey)` on all clean repos, although interactive `ssh -T git@github.com` succeeds as `alimtvnetwork`                                                                       | **ATTEMPTED** — then SSH fallback per user step 1                          |
| 6b  | Fallback pull                   | `git pull --ff-only` over SSH            | Worked: main `fe80352b` → `d36043c5`, 118 files, exit 0, tree clean                                                                                                                                                  | **ADOPTED**                                                                |
| 7   | `gitmap cat my` (branch lookup) | — (file-read utility)                    | Tried to open file `my` → E9000                                                                                                                                                                                      | **SKIPPED** — invalid branch-discovery method                              |
| 8   | `gitmap LP` (branch lookup)     | — (unrecognized)                         | E1001; lowercase `gitmap lp` = list-prompts                                                                                                                                                                          | **SKIPPED** — invalid branch-discovery method                              |
| 8b  | Latest-branch discovery         | `gitmap lb` (latest-branch)              | Reported `origin/fix/18-oct-26-joy-multi-device-analyzer` @ `180f843a8d3af629b2d9316ea19e44c324146cc8`, 18-Oct-2026 08:05 PM, subject "feat(vision): make OCR format and character count checks optional by default" | **ADOPTED** — canonical discovery command                                  |
| 8c  | Branch name pattern             | Literal `fix/18October2026Joy*`          | Matches NOTHING on origin                                                                                                                                                                                            | **CORRECTED** to `fix/18-oct-26-joy-multi-device-analyzer`                 |
| 10  | PR create + merge               | `gitmap pr LEFT RIGHT` exists            | `gitmap login --status` → not logged in; `gh` NOT logged in                                                                                                                                                          | **BLOCKED** — pending the user's auth choice (lead is asking the user now) |
| 10b | PR merge method                 | `gh pr merge --merge` (PR #10 precedent) | User merge preference: all commits, no squash; repo is Lovable-linked — NEVER rewrite pushed history (merge commits only; no rebase/squash/force-push/amend of pushed commits)                                       | **REQUIRED** when auth lands                                               |

---

## System Context

- **Repo:** `alimtvnetwork/cat-my-v12` — Windows CAT exam platform (Windows desktop app), Lovable-linked.
- **Tooling:** gitmap CLI v6.566.4 at the workspace tools dir (not on PATH); `gh` CLI present but not logged in; `gitmap login --status` reports not logged in.
- **Branch facts:** target branch `origin/fix/18-oct-26-joy-multi-device-analyzer`
  @ `180f843a8d3af629b2d9316ea19e44c324146cc8` (18-Oct-2026 08:05 PM,
  "feat(vision): make OCR format and character count checks optional by default").
- **Main fast-forward:** `fe80352b` → `d36043c5` via direct SSH `git pull --ff-only` (118 files, exit 0, clean tree).
- **Commit hygiene:** `.gitmap/data/` is absent; `.gitmap/release/` is NOT gitignored — commit ONLY via targeted `git add <relative paths>`, NEVER `git add -A` / `gitmap cpf` (cpf does `-A`).
- **Path discipline:** strictly repo-relative paths (e.g. `02-spec/...`, `.ai-memory/...`) in files, release pages, and release notes — zero absolute paths, zero `file:///` URIs.

---

## Run Architecture

### Phases

1. **Plan + spec authoring (this spec)** — Spec Author A (this agent). `/plan` first to reduce credits; `/learn` the gitmap skill for high-speed search, toolchain discovery, and caching.
2. **GitMap sync + branch discovery** — Worker 1 follows subtask
   `.ai-memory/plans/subtasks/gitmap-update-and-branch-management/01-gitmap-sync-and-branch-discovery.md`
   (space-update skip, pa attempt, SSH fallback, `gitmap lb` discovery, branch+main verification).
3. **PR creation + merge** — Worker 2, gated on user auth choice. Creates PR
   from `fix/18-oct-26-joy-multi-device-analyzer` into main, merges with all
   commits preserved (no squash), then completes the PR.
4. **Verification + close-out** — Confirm merge commit on main, CI state,
   PR completed; report to lead.

### Lead vs Worker Roles

- **Parent lead** runs `execute-parent-task-with-n-steps-v6`, owns the parent plan
  at `.ai-memory/plans/gitmap-update-and-branch-management.md`, briefs workers
  with the corrected command matrix only (never the invalid originals), and asks
  the user for the PR-auth choice.
- **Workers** execute their owned subtask files, run read-only tooling first,
  report evidence (exit codes, refs, output lines), and never run git mutating
  commands beyond what their subtask explicitly authorizes. Spec authors write
  only their owned files and run no git commands at all.

### File-Ownership Table

| File                                                                                                   | Owner         | Role                            |
| ------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------- |
| `02-spec/21-app/gitmap-update-and-branch-management/readme.md`                                         | Spec Author A | read+write (written 2026-10-19) |
| `02-spec/21-app/gitmap-update-and-branch-management/01-architecture-spec.md`                           | Spec Author A | read+write (this file)          |
| `.ai-memory/plans/subtasks/gitmap-update-and-branch-management/01-gitmap-sync-and-branch-discovery.md` | Spec Author A | read+write (written 2026-10-19) |
| `.ai-memory/plans/gitmap-update-and-branch-management.md`                                              | Parent lead   | not touched by this author      |
| PR/merge execution artifacts (Worker 2 outputs)                                                        | Worker 2      | future, gated on auth           |

---

## Acceptance Criteria

- [ ] `gitmap space update` skip recorded with version/subcommand evidence.
- [ ] `gitmap pa` attempted; SSH fallback executed per user step 1; main verified
      at latest origin commit with a clean tree before any merge work.
- [ ] Latest branch identified exclusively via `gitmap lb` and recorded as the
      canonical name `fix/18-oct-26-joy-multi-device-analyzer` (never the
      invalid `fix/18October2026Joy*` pattern, never `gitmap cat my`, never `gitmap LP`).
- [ ] PR created from the branch into main, merged with all commits preserved
      (no squash — `gh pr merge --merge` semantics), then completed.
- [ ] No pushed-history rewrite at any point (Lovable-linked).
- [ ] All code search during the run used gitmap-only commands
      (`gitmap aum search`, `find`, `cat`, `ps`, `py`, `llm train`); no
      rg/ripgrep/grep/git-grep/Select-String.
- [ ] All commits used targeted `git add <relative paths>`; zero absolute paths
      in files, release pages, and release notes.

---

## Assumptions

- The gitmap binary location (workspace tools dir, not on PATH) and v6.566.4
  behavior observed at authoring time (2026-10-19) hold for the worker run.
- `origin/fix/18-oct-26-joy-multi-device-analyzer` is the branch the user meant
  by "fix/18October2026Joy something" — intent matches the `gitmap lb` result.
- The main fast-forward (`fe80352b` → `d36043c5`) seen during probing is the
  base the merge worker will build on; the worker re-verifies before merging.
- `gh` / `gitmap login` auth state is as of 2026-10-19; the user will choose an
  auth path when the lead asks.

---

## Conflicts

- The user's prescribed commands (`gitmap space update`, `gitmap cat my`,
  `gitmap LP`, literal `fix/18October2026Joy*`) conflict with verified tool
  behavior — resolved via the corrected command matrix above; the lead must
  brief workers with corrected commands only.
- `gitmap pa` is prescribed first and fails fleet-wide; the user's own step 1
  authorizes the fallback ("if that fails, fall back to regular `git pull`"),
  so the SSH fallback is compliant, not a deviation.

---

## Follow-ups

- **PR creation is blocked on auth:** `gh` not logged in, `gitmap login --status`
  reports not logged in. The lead is asking the user for their auth choice; the
  merge worker (phase 3) must not start until auth is resolved.
- **Dirty repos skipped by pa:** `repo-cache` and `story-telling-v1` were dirty
  and skipped — out of scope for this task; flagged for a future fleet-hygiene pass.
- **Post-merge:** verify CI on the merge commit and run the release flow per repo
  conventions only if the user asks (out of scope of this task).
