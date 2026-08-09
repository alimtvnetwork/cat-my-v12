# Command: 50-step plan workflow (maximal enforcement)

Scope: any turn that includes the "50 steps Plan, Maximal Enforcement" header.
Captured: 2026-07-09 from Control Automation redesign brief.

Rules (verbatim intent):

- Exactly 50 steps per plan file, no more, no less.
- Never call `plan--create` or open plan-approval mode for these turns — write markdown files directly.
- Do NOT execute the plan the same turn it is written.
- One task = one file at `.lovable/plans/pending/XX-<slug>.md`; next free `XX` across `pending/` + `done/`.
- On completion: `mv` file to `.lovable/plans/done/XX-<slug>.md` and flip `Status:` frontmatter.
- Depth (>~3 lines, multi-file, non-obvious): spin out `.lovable/plans/subtasks/XX-<slug>/SS-<subslug>.md` and link from the main step.
- Capture commands the user issues → `.lovable/spec/commands/XX-<slug>.md`.
- Capture bugs/issues → `.lovable/issues/XX-<slug>.md`.
- Before writing, scan `.lovable/` and append unresolved pending tasks to the new plan.
- Coding tasks: also read `.lovable/coding-guidelines.md`, `spec/coding-guidelines/**`, `coding-guidelines/**`, and any `XX-error-manage/` folder inside those; skip silently if missing.

Applies to: this project, all future planning turns.
