# Command: Re-audit spec vs code with 6-dimension rubric

Captured: 2026-07-12
Scope: post-v1.15 spec/code sync check.

Verbatim intent:

- Audit the current specification set against the implemented codebase.
- For each spec: check accuracy, drift, missing specs for implemented features, specs for unimplemented features.
- Score on 6-dimension rubric: Completeness 25%, Consistency 25%, Alignment 20%, Clarity 15%, Maintainability 10%, Test Coverage 5%.
- Output report to `spec/25-app-audit/latest/` with severity + impact per finding, fold useful conclusions into the current audit bundle, and delete processed duplicates.

Applies to: this audit cycle. Extends the rubric in `spec/25-app-audit/00-rubric.md`.
