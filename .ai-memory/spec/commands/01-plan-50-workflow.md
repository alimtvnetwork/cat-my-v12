# Command: 50-step plan workflow (maximal enforcement)

Scope: any turn that includes the "50 steps Plan, Maximal Enforcement" header.
Captured: 2026-07-09 from Control Automation redesign brief.

Rules (verbatim intent):

- Exactly 50 steps per plan file, no more, no less.
- Never call `plan--create` or open plan-approval mode for these turns — write markdown files directly.
- Do NOT execute the plan the same turn it is written.
- One task = one file at `.ai-memory/plans/pending/XX-<slug>.md`; next free `XX` across `pending/` + `done/`.
- On completion: `mv` file to `.ai-memory/plans/done/XX-<slug>.md` and flip `Status:` frontmatter.
- Depth (>~3 lines, multi-file, non-obvious): spin out `.ai-memory/plans/subtasks/XX-<slug>/SS-<subslug>.md` and link from the main step.
- Capture commands the user issues → `.ai-memory/02-spec/commands/XX-<slug>.md`.
- Capture bugs/issues → `.ai-memory/issues/XX-<slug>.md`.
- Before writing, scan `.ai-memory/` and append unresolved pending tasks to the new plan.
- Coding tasks: also read `.ai-memory/coding-guidelines.md`, `02-spec/coding-guidelines/**`, `coding-guidelines/**`, and any `XX-error-manage/` folder inside those; skip silently if missing.

Applies to: this project, all future planning turns.
