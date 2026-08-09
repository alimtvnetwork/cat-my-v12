# Issue: spec/21-app is not blind-AI implementable

Status: closed (Plan 23 remediation, mean 98.0/100, 0 blockers; ref `spec/25-app-audit/99-signoff.md`; re-confirmed by Plan 25 SS-09 scoped rescore at 100/100 in `spec/25-app-audit/latest/plan25-ss09/00-rescore.md`; closed by Plan 26 SS-01 baseline audit 2026-07-14)
Reported: 2026-07-14
Reporter: user
Related: spec/21-app/\*, spec/25-app-audit/, .lovable/spec/commands/01-blind-ai-audit-conventions.md

## Symptom

User states that `spec/21-app/` cannot be handed to a non-frontier ("blind") AI as the sole context and result in a working implementation. Multiple specs assume prior knowledge, lack checklists, lack DB diagrams, lack image descriptions, and do not consistently reference the Facade pattern in spec 52.

## Expected

Any single spec file in `spec/21-app/` is self-contained enough that a weak model with only `spec/` in context can implement the corresponding module without guessing: it has success criteria, a checklist, PascalCase enums, image descriptions, DB structure (or explicit "no persistence"), and Facade references where SDKs are involved.

## Actual

- Several specs mention images without describing them.
- PascalCase is inconsistent in enum/verdict/tier prose.
- DB structure is only present in DB-focused files; feature specs that persist state do not repeat the relevant schema slice.
- Facade pattern references are missing outside spec 52 itself.
- Per-spec implementation checklists are absent.

## Fix path

Execute plan `.lovable/plans/pending/22-blind-ai-spec-audit-21.md`, which rewrites `spec/25-app-audit/` from scratch as one per-spec issue file per audited unit under `spec/21-app/`.
