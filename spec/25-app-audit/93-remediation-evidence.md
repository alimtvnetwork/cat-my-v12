# Remediation Evidence - Plan 23

Version: v2.76.0
Date: 2026-07-14
Purpose: map each Plan 22 blocker class to the Plan 23 step, code/spec touched, and memory note that proves it was cleared.

## Mapping table

| #   | Finding class                   | Plan 23 step | Change locus                                              | Memory note |
| --- | ------------------------------- | ------------ | --------------------------------------------------------- | ----------- |
| 1   | Guidelines lock (Python/TS/SQL) | 1-2          | `spec/02-coding-guidelines/*`, `spec/coding-guidelines/*` | 00, 01      |
| 2   | Error appendix registration     | 3, 21        | `spec/21-app/40-error-manage.md` Appendix A / A.15        | 02, 12      |
| 3   | Enum lock (PascalCase)          | 4, 20        | Sweep across `spec/21-app/`                               | 03, 11      |
| 4   | Acceptance checklists 01-17     | 5            | `spec/21-app/{01..17}-*.md`                               | 04          |
| 5   | Acceptance checklists 20-40     | 6            | `spec/21-app/{20..40}-*.md`                               | 05          |
| 6   | Acceptance checklists 41-60     | 7            | `spec/21-app/{41..60}-*.md`                               | 06          |
| 7   | Acceptance checklists 61-99     | 8            | `spec/21-app/{61..99}-*.md`                               | 07          |
| 8   | Facade binding 50-66            | 13-14        | `spec/21-app/{50,51}-*.md` add, {63-66} verified          | 08          |
| 9   | Facade binding 69-72            | 15-16        | `spec/21-app/{69..72}-*.md` verified                      | 09          |
| 10  | Contract back-links 63-72       | 17-18        | Back-link tables updated                                  | 10          |
| 11  | Anchor duplicate `42-obs §7`    | 19           | Renumbered to `## 11. Health Endpoint Auth`               | 11          |
| 12  | Audit path drift                | 23           | `scripts/audit_paths_check.py` -> OK                      | 13          |
| 13  | Blind-AI rescore                | 24           | `/tmp/rescore.py` -> mean 98.0, blockers 0                | 13          |

## Before / after signal

- Plan 22 baseline: mean 66.6, 46 blockers (`spec/25-app-audit/latest/99-consolidated.md` diagnostics history).
- Plan 23 rescore: mean 98.0, 0 blockers (see `90-findings-summary.md`).

## Reproduction

```bash
python3 scripts/audit_paths_check.py           # expects: OK (exit 0)
python3 scripts/audit_consolidate.py --cleanup # regenerates spec/25-app-audit/latest/99-consolidated.md
# Rescore: see .lovable/memory/v2/plan23/13-paths-and-rescore.md for /tmp/rescore.py rubric
```

## Links

- Findings summary: `spec/25-app-audit/90-findings-summary.md`.
- Consolidated diagnostics: `spec/25-app-audit/latest/99-consolidated.md`.
- Plan file: `.lovable/plans/pending/23-blind-ai-remediation.md` (moves to `done/` at Step 30).
