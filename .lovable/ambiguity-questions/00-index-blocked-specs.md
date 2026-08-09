# Blocked-specs index (Plan 64)

Cross-reference of every ambiguity question (Q1..Q21 in `01-ui-v2-open-questions.md`) to the exact spec files that carry a `(BLOCKED by Qn)` marker. When an answer lands in `01-ui-v2-open-questions.md`, propagate the resolution to every file listed here in the same commit, then delete the "BLOCKED by Qn" line from that file and add a short "Resolved by Qn (YYYY-MM-DD): <one-line summary>" note.

| Question | Topic                                | Blocked specs                                                                                     |
| -------- | ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Q1       | Recipe -> Rule Set final rename      | `spec/24-app-ui-design-system/00-overview.md`                                                     |
| Q4       | Lighting setup fields                | `spec/24-app-ui-design-system/18-lighting-setup.md`                                               |
| Q6       | Override key (name+kind vs explicit) | `spec/24-app-ui-design-system/22-override-modes.md`                                               |
| Q7       | Promote-snapshot-to-live semantics   | `spec/24-app-ui-design-system/22-override-modes.md`                                               |
| Q8       | JS sandbox profiles + `cv` subset    | `spec/24-app-ui-design-system/27-user-js-functions.md`                                            |
| Q9       | Flaw detection algorithm choice      | `spec/24-app-ui-design-system/28-flaw-detection.md`                                               |
| Q10      | Barcode symbology list               | `spec/24-app-ui-design-system/29-barcode-qr.md`, `20-backend-endpoint-map.md` (row 6 payload)     |
| Q11      | Positional Adjust internal algo      | `spec/24-app-ui-design-system/31-positional-adjust.md`                                            |
| Q12      | Data folder root path per OS         | `spec/24-app-ui-design-system/21-filesystem-layout.md`, `20-backend-endpoint-map.md` (rows 9, 34) |
| Q13      | SQLite vs Cloud transactionality     | `spec/24-app-ui-design-system/20-backend-endpoint-map.md` (rows 15, 16, 17)                       |
| Q14      | (open, unassigned yet)               | -                                                                                                 |
| Q15      | YAML numeric precision + comments    | `spec/24-app-ui-design-system/33-export-yaml-schema.md`                                           |
| Q16      | Project Zip runs/captures default    | `spec/24-app-ui-design-system/34-project-zip-layout.md`                                           |
| Q17      | Running pill multi-op UI             | `spec/24-app-ui-design-system/42-drag-drop-running-pill.md`, `11-running-process-pill.md`         |
| Q18      | (open, unassigned yet)               | -                                                                                                 |
| Q19      | Modal-as-route promotion             | `spec/24-app-ui-design-system/39-back-forward.md`                                                 |
| Q20      | AI settings scope                    | `spec/24-app-ui-design-system/19-ai-settings-placeholder.md`                                      |
| Q21      | (open, unassigned yet)               | -                                                                                                 |

## Update protocol

1. User (or spec owner) writes the answer inline in `01-ui-v2-open-questions.md` under the matching Qn heading.
2. Executor edits each listed file: replace the BLOCKED line with a `Resolved by Qn (YYYY-MM-DD): <summary>` line, apply the concrete change, bump the file's `Version`, and update `98-changelog.md`.
3. Executor removes the row from the table above (or marks it Resolved with the resolution date).
4. Executor updates `97b-ui-acceptance-checklist.md` rows that reference the resolved area.
5. Version bump + changelog + release notes per the standard flow.
