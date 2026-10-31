# Plan: GitMap Update and Branch Management

**Spec:** 02-spec/21-app/gitmap-update-and-branch-management/
**Status:** COMPLETE (2026-10-19) — branch merged directly into main (59f0d0af, pushed); PR route superseded by user's direct-merge order; prettier CI-gate fix committed as d6023346; pipeline green
**Subtasks dir:** .ai-memory/plans/subtasks/gitmap-update-and-branch-management/

## User Request (Verbatim)

```
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

## Objective

Bring the local GitMap index fully up to date (`gitmap space update`,
`gitmap pa`), resolve the user's literal `fix/18October2026Joy*` pattern to
the canonical branch `origin/fix/18-oct-26-joy-multi-device-analyzer`, merge
all of its code into `main` via a PR with all commits preserved (no squash),
and complete the PR.

## Subtasks

| #   | File                                                                                | Goal                                                                            | Status                      |
| --- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------- |
| 1   | subtasks/gitmap-update-and-branch-management/01-gitmap-sync-and-branch-discovery.md | GitMap sync (space update + pa), pull, branch discovery and identity correction | IN PROGRESS (Spec Author A) |
| 2   | subtasks/gitmap-update-and-branch-management/02-merge-pr-complete.md                | Merge via integration branch, PR, merge all commits, verify                     | QUEUED (blocked on PR auth) |

## Guardrails

- Codebase search via GitMap only (`gitmap aum search`, `gitmap find`,
  `gitmap cat`, `gitmap ps`, `gitmap py`, `gitmap llm train`); TOTAL BAN on
  rg, ripgrep, grep, git grep, Select-String.
- Strictly relative Git paths everywhere: in files, specs, commits, release
  pages, and release notes. Zero absolute paths, zero `file:///` URIs.
- Targeted `git add <relative paths>` only for the final commit; never
  `git add -A` and never `gitmap cpf` (`.gitmap/release/` is not gitignored).
  Never reference or add `.ai-memory/temp-agents/`.
- No history rewriting: merge commits only, no rebase/squash/force-push/amend
  of pushed commits (repo is Lovable-linked; user merge preference is all
  commits, no squash).
- Prettier CI gate: keep all `.md` files prettier-clean; lowercase kebab-case
  filenames.
- Worker git ban: spec authors never run git commands.

## Lead-owned index updates (draft snippets for lead to apply)

Shared files are lead-only. Apply these snippets exactly; do not reword.

**1. `.ai-memory/plans/index.md` — Pending section (insert one line):**

```text
- gitmap-update-and-branch-management - pending - see gitmap-update-and-branch-management.md
```

**2. `.ai-memory/memory/06-spec-map.md` — spec registration (insert under the
On-demand table's `21-app` row as a registered module note):**

```text
- Module `02-spec/21-app/gitmap-update-and-branch-management/` (2026-10-19): GitMap sync, branch discovery, and merge/PR workflow for task `gitmap-update-and-branch-management`. Read when merging `origin/fix/18-oct-26-joy-multi-device-analyzer` into `main`.
```
