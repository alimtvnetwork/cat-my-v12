# Consolidated Audit - v2.73.0

Generated: 2026-07-14 by `scripts/audit_consolidate.py`.
This document supersedes all prior audit bundles; source: `spec/25-app-audit/latest/`.

## Version pins

- README pin: `ok`
- Current release: **v2.73.0**

## Inputs consolidated

- App specs (`spec/21-app/`): **61** files
- Latest audit bundle (`spec/25-app-audit/latest/`): **0** files
- Plans pending: **1** / done: **23**

## Outdated sections detected

### dangling_spec_ref (292)

- `spec/01-spec-authoring-guide/04-ai-onboarding-prompt.md:150` - spec/02-coding-guidelines/03-naming.md
- `spec/01-spec-authoring-guide/08-cross-references.md:120` - spec/09-gsearch-cli/01-backend/01-arch.md
- `spec/01-spec-authoring-guide/08-cross-references.md:121` - spec/09-gsearch-cli/00-overview.md
- `spec/01-spec-authoring-guide/08-cross-references.md:122` - spec/09-gsearch-cli/01-backend/01-arch.md
- `spec/01-spec-authoring-guide/08-cross-references.md:122` - spec/09-gsearch-cli/00-overview.md
- `spec/01-spec-authoring-guide/09-exceptions.md:94` - spec/02-prefix-disambiguation.md
- `spec/02-coding-guidelines/01-cross-language/03-casting-elimination-patterns.md:498` - spec/03-error-manage/01-error-resolution/10-apperror-package/01-apperror-reference.md
- `spec/02-coding-guidelines/01-cross-language/03-casting-elimination-patterns.md:501` - spec/02-spec-management-software/13-shared-packages/04-pkg-logging.md
- `spec/02-coding-guidelines/01-cross-language/05-cross-spec-contradiction-checks.md:15` - spec/23-how-app-issues-track/08-p7-inline-assignment-contradiction.md
- `spec/02-coding-guidelines/01-cross-language/05-cross-spec-contradiction-checks.md:72` - spec/03-error-manage/01-error-resolution/10-apperror-package/01-apperror-reference.md
- `spec/02-coding-guidelines/01-cross-language/05-cross-spec-contradiction-checks.md:157` - spec/23-how-app-issues-track/01-issue-template.md
- `spec/02-coding-guidelines/01-cross-language/09-dry-refactoring-summary.md:144` - spec/response-envelope/adr.md
- `spec/02-coding-guidelines/01-cross-language/09-dry-refactoring-summary.md:144` - spec/response-envelope/changelog.md
- `spec/02-coding-guidelines/01-cross-language/09-dry-refactoring-summary.md:174` - spec/03-error-manage/01-error-resolution/09-response-envelope/04-response-envelope-reference.md
- `spec/02-coding-guidelines/01-cross-language/09-dry-refactoring-summary.md:176` - spec/03-error-manage/01-error-resolution/09-response-envelope/01-adr.md
- `spec/02-coding-guidelines/01-cross-language/09-dry-refactoring-summary.md:177` - spec/03-error-manage/01-error-resolution/09-response-envelope/00-overview.md
- `spec/02-coding-guidelines/01-cross-language/11-key-naming-pascalcase.md:136` - spec/02-spec-management-software/12-prompts/01-coding-guideline/01-backend-go.md
- `spec/02-coding-guidelines/01-cross-language/11-key-naming-pascalcase.md:137` - spec/01-general-spec/01-foundation/01-coding-standards-foundation.md
- `spec/02-coding-guidelines/01-cross-language/13-strict-typing.md:312` - spec/31-generic-enforce/00-overview.md
- `spec/02-coding-guidelines/01-cross-language/13-strict-typing.md:313` - spec/03-error-manage/01-error-resolution/10-apperror-package/01-apperror-reference.md
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/01-naming-and-database.md:91` - spec/02-spec-management-software/02-instructions/01-file-naming-convention.md
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/05-magic-strings-and-organization.md:37` - spec/23-how-app-issues-track/09-magic-string-enum-comparison.md
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/05-magic-strings-and-organization.md:73` - spec/23-how-app-issues-track/10-domain-status-magic-strings.md
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/06-advanced-patterns.md:24` - spec/02-spec-management-software/18-enum-consumer-checklist.md
- `spec/02-coding-guidelines/02-typescript/01-connection-status-enum.md:5` - spec/23-how-app-issues-track/10-domain-status-magic-strings.md
- `spec/02-coding-guidelines/02-typescript/01-connection-status-enum.md:74` - spec/09-api-integration/02-websocket-patterns-api-integration.md
- `spec/02-coding-guidelines/02-typescript/01-connection-status-enum.md:93` - spec/23-how-app-issues-track/10-domain-status-magic-strings.md
- `spec/02-coding-guidelines/02-typescript/02-entity-status-enum.md:5` - spec/23-how-app-issues-track/10-domain-status-magic-strings.md
- `spec/02-coding-guidelines/02-typescript/02-entity-status-enum.md:102` - spec/23-how-app-issues-track/10-domain-status-magic-strings.md
- `spec/02-coding-guidelines/02-typescript/03-execution-status-enum.md:5` - spec/23-how-app-issues-track/10-domain-status-magic-strings.md
- `spec/02-coding-guidelines/02-typescript/03-execution-status-enum.md:110` - spec/23-how-app-issues-track/10-domain-status-magic-strings.md
- `spec/02-coding-guidelines/02-typescript/04-export-status-enum.md:5` - spec/23-how-app-issues-track/10-domain-status-magic-strings.md
- `spec/02-coding-guidelines/02-typescript/04-export-status-enum.md:89` - spec/23-how-app-issues-track/10-domain-status-magic-strings.md
- `spec/02-coding-guidelines/02-typescript/05-http-method-enum.md:104` - spec/02-spec-management-software/18-enum-consumer-checklist.md
- `spec/02-coding-guidelines/02-typescript/06-message-status-enum.md:5` - spec/23-how-app-issues-track/10-domain-status-magic-strings.md
- `spec/02-coding-guidelines/02-typescript/06-message-status-enum.md:89` - spec/23-how-app-issues-track/10-domain-status-magic-strings.md
- `spec/02-coding-guidelines/03-golang/03-httpmethod-enum.md:246` - spec/10-brun-cli/01-backend/19-enum-architecture.md
- `spec/02-coding-guidelines/03-golang/03-httpmethod-enum.md:247` - spec/23-how-app-issues-track/07-magic-string-tuple-return-audit.md
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/00-overview.md:57` - spec/03-error-manage/01-error-resolution/10-apperror-package/01-apperror-reference.md
- `spec/02-coding-guidelines/04-php/02-forbidden-patterns.md:5` - spec/28-wp-plugin-development/07-error-handling.md
- `spec/02-coding-guidelines/04-php/02-forbidden-patterns.md:402` - spec/28-wp-plugin-development/07-error-handling.md
- `spec/02-coding-guidelines/04-php/02-forbidden-patterns.md:403` - spec/28-wp-plugin-development/01-initialization-patterns.md
- `spec/02-coding-guidelines/04-php/02-forbidden-patterns.md:404` - spec/28-wp-plugin-development/04-api-design.md
- `spec/03-error-manage/01-error-resolution/05-debugging-guides/01-debugging-php.md:234` - spec/02-coding-guidelines/04-php/forbidden-patterns.md
- `spec/03-error-manage/01-error-resolution/05-debugging-guides/02-debugging-go.md:643` - spec/02-spec-management-software/13-shared-packages/08-pkg-database-operations.md
- `spec/03-error-manage/02-error-architecture/05-response-envelope/01-adr.md:143` - spec/response-envelope/changelog.md
- `spec/03-error-manage/02-error-architecture/05-response-envelope/01-adr.md:145` - spec/response-envelope/configurability.md
- `spec/03-error-manage/02-error-architecture/05-response-envelope/02-changelog.md:22` - spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/02-error-handling-reference.md
- `spec/03-error-manage/02-error-architecture/05-response-envelope/02-changelog.md:24` - spec/error-modal/copy-formats.md
- `spec/03-error-manage/02-error-architecture/05-response-envelope/02-changelog.md:35` - spec/error-modal/copy-formats.md
- ... 242 more

### plan_ref_moved (26)

- `spec/21-app/68-v2-vendor-sdk-contract.md:97` - .lovable/plans/pending/17-v2.0.2-vendor-sdk.md -> now at .lovable/plans/done/17-v2.0.2-vendor-sdk.md
- `.lovable/memory/v2/00-kickoff.md:4` - .lovable/plans/pending/14-v2-kickoff-scoping.md -> now at .lovable/plans/done/14-v2-kickoff-scoping.md
- `.lovable/memory/v2/00-kickoff.md:17` - .lovable/plans/pending/14-v2-kickoff-scoping.md -> now at .lovable/plans/done/14-v2-kickoff-scoping.md
- `.lovable/memory/v2/01-ranked-backlog.md:4` - .lovable/plans/pending/14-v2-kickoff-scoping.md -> now at .lovable/plans/done/14-v2-kickoff-scoping.md
- `.lovable/memory/v2/01-ranked-backlog.md:11` - .lovable/plans/pending/14-v2-kickoff-scoping.md -> now at .lovable/plans/done/14-v2-kickoff-scoping.md
- `.lovable/memory/v2/01-ranked-backlog.md:15` - .lovable/plans/pending/14-v2-kickoff-scoping.md -> now at .lovable/plans/done/14-v2-kickoff-scoping.md
- `.lovable/memory/v2/02-status-audit.md:4` - .lovable/plans/pending/14-v2-kickoff-scoping.md -> now at .lovable/plans/done/14-v2-kickoff-scoping.md
- `.lovable/memory/v2/02-status-audit.md:11` - .lovable/plans/pending/14-v2-kickoff-scoping.md -> now at .lovable/plans/done/14-v2-kickoff-scoping.md
- `.lovable/memory/v2/03-effort-risk-scoring.md:4` - .lovable/plans/pending/14-v2-kickoff-scoping.md -> now at .lovable/plans/done/14-v2-kickoff-scoping.md
- `.lovable/memory/v2/03-effort-risk-scoring.md:10` - .lovable/plans/pending/14-v2-kickoff-scoping.md -> now at .lovable/plans/done/14-v2-kickoff-scoping.md
- `.lovable/plans/pending/23-blind-ai-remediation.md:47` - .lovable/plans/done/23-blind-ai-remediation.md -> now at .lovable/plans/pending/23-blind-ai-remediation.md
- `.lovable/plans/pending/23-blind-ai-remediation.md:61` - .lovable/plans/pending/21-v2.0.5-db-clarity.md -> now at .lovable/plans/done/21-v2.0.5-db-clarity.md
- `.lovable/plans/done/08-plan-10.md:10` - .lovable/plans/pending/07-audit-remediation.md -> now at .lovable/plans/done/07-audit-remediation.md
- `.lovable/plans/done/08-plan-10.md:48` - .lovable/plans/pending/02-control-automation-redesign.md -> now at .lovable/plans/done/02-control-automation-redesign.md
- `.lovable/plans/done/08-plan-10.md:49` - .lovable/plans/pending/05-v1-implementation-kickoff.md -> now at .lovable/plans/done/05-v1-implementation-kickoff.md
- `.lovable/plans/done/08-plan-10.md:50` - .lovable/plans/pending/07-audit-remediation.md -> now at .lovable/plans/done/07-audit-remediation.md
- `.lovable/plans/done/10-v1-closeout-and-post-v1-backlog.md:10` - .lovable/plans/pending/09-audit-closeout-v1-tag.md -> now at .lovable/plans/done/09-audit-closeout-v1-tag.md
- `.lovable/plans/done/10-v1-closeout-and-post-v1-backlog.md:12` - .lovable/plans/pending/09-audit-closeout-v1-tag.md -> now at .lovable/plans/done/09-audit-closeout-v1-tag.md
- `.lovable/plans/done/10-v1-closeout-and-post-v1-backlog.md:20` - .lovable/plans/pending/09-audit-closeout-v1-tag.md -> now at .lovable/plans/done/09-audit-closeout-v1-tag.md
- `.lovable/plans/done/12-spec-vs-code-audit-v1.28.md:48` - .lovable/plans/pending/12-spec-vs-code-audit-v1.28.md -> now at .lovable/plans/done/12-spec-vs-code-audit-v1.28.md
- `.lovable/plans/done/13-spec-vs-code-audit-v1.42.1.md:35` - .lovable/plans/pending/13-spec-vs-code-audit-v1.42.1.md -> now at .lovable/plans/done/13-spec-vs-code-audit-v1.42.1.md
- `.lovable/plans/done/13-spec-vs-code-audit-v1.42.1.md:48` - .lovable/plans/pending/12-spec-vs-code-audit-v1.28.md -> now at .lovable/plans/done/12-spec-vs-code-audit-v1.28.md
- `.lovable/plans/done/16-rule-bundle-import-export-spec.md:13` - .lovable/plans/pending/15-v2.0.1-vendor-discovery.md -> now at .lovable/plans/done/15-v2.0.1-vendor-discovery.md
- `.lovable/plans/done/16-rule-bundle-import-export-spec.md:50` - .lovable/plans/pending/15-v2.0.1-vendor-discovery.md -> now at .lovable/plans/done/15-v2.0.1-vendor-discovery.md
- `.lovable/plans/done/22-blind-ai-spec-audit-21.md:70` - .lovable/plans/pending/22-blind-ai-spec-audit-21.md -> now at .lovable/plans/done/22-blind-ai-spec-audit-21.md
- `.lovable/plans/done/22-blind-ai-spec-audit-21.md:84` - .lovable/plans/pending/21-v2.0.5-db-clarity.md -> now at .lovable/plans/done/21-v2.0.5-db-clarity.md

### stale_audit_bundle (1)

- `spec/25-app-audit/10-issues` - non-latest audit bundle still present; expected under Plan 18 consolidation

### stale_version_pin (305)

- `spec/01-spec-authoring-guide/11-root-readme-conventions.md:3` - pins v1.0.0 < current v2.73.0
- `spec/01-spec-authoring-guide/17-version-schema.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/01-issues-and-fixes-log.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/02-boolean-principles/01-naming-prefixes.md:4` - pins v2.6.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/02-boolean-principles/02-guards-and-extraction.md:4` - pins v2.6.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/02-boolean-principles/03-parameters-and-conditions.md:4` - pins v2.6.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/02-boolean-principles/04-quick-reference.md:4` - pins v2.6.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/02-boolean-principles/05-exemptions-and-api.md:4` - pins v2.7.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/03-casting-elimination-patterns.md:3` - pins v2.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/05-cross-spec-contradiction-checks.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/06-cyclomatic-complexity.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/07-database-naming.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/08-dry-principles.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/10-function-naming.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/11-key-naming-pascalcase.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/12-no-negatives.md:3` - pins v2.1.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/13-strict-typing.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/14-test-naming-and-structure.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/01-naming-and-database.md:4` - pins v2.1.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/02-boolean-and-enum.md:4` - pins v2.1.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/03-code-style-and-errors.md:4` - pins v2.1.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/04-type-safety.md:4` - pins v2.1.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/05-magic-strings-and-organization.md:4` - pins v2.1.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/06-advanced-patterns.md:4` - pins v2.1.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/07-checklist.md:4` - pins v2.1.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/16-static-analysis/10-cross-language-rule-matrix.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/22-variable-naming-conventions.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/23-solid-principles.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/24-boolean-flag-methods.md:4` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/01-cross-language/25-generic-return-types.md:4` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/02-typescript/12-discriminated-union-patterns.md:4` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/03-golang/08-pathutil-fileutil-spec.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/04-php/03-naming-conventions.md:3` - pins v1.3.0 < current v2.73.0
- `spec/02-coding-guidelines/04-php/05-response-array-standard.md:6` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/04-php/05-response-array-standard.md:7` - pins v2.2.0 < current v2.73.0
- `spec/02-coding-guidelines/04-php/10-php-go-consistency-audit.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/05-rust/98-changelog.md:7` - pins v1.1.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/00-overview.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/01-sarif-contract.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/02-plugin-model.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/03-language-roadmap.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/04-ci-templates.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/05-distribution.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/06-rules-mapping.md:3` - pins v2.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/07-performance.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/08-fix-repo-and-installers/00-overview.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/08-fix-repo-and-installers/01-fix-repo-contract.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/08-fix-repo-and-installers/02-installer-contract.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/08-fix-repo-and-installers/03-visibility-change-contract.md:3` - pins v1.0.0 < current v2.73.0
- `spec/02-coding-guidelines/06-cicd-integration/08-fix-repo-and-installers/97-acceptance-criteria.md:3` - pins v1.0.0 < current v2.73.0
- ... 255 more

### tbd_marker (183)

- `spec/01-spec-authoring-guide/09-exceptions.md:74` - XXX
- `spec/01-spec-authoring-guide/09-exceptions.md:193` - XXX
- `spec/02-coding-guidelines/01-cross-language/04-code-style/06-comments-and-documentation.md:83` - TODO
- `spec/02-coding-guidelines/01-cross-language/04-code-style/06-comments-and-documentation.md:83` - FIXME
- `spec/02-coding-guidelines/01-cross-language/04-code-style/06-comments-and-documentation.md:83` - TODO
- `spec/02-coding-guidelines/01-cross-language/15-master-coding-guidelines/03-code-style-and-errors.md:98` - xxx
- `spec/02-coding-guidelines/01-cross-language/16-static-analysis/09-ci-pipeline-quality-gate.md:379` - TODO
- `spec/02-coding-guidelines/01-cross-language/16-static-analysis/09-ci-pipeline-quality-gate.md:387` - TODO
- `spec/02-coding-guidelines/02-typescript/08-typescript-standards-reference.md:312` - TODO
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:173` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:174` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:175` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:176` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:177` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:178` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:179` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:180` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:181` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:182` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:183` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:184` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:185` - xxx
- `spec/02-coding-guidelines/03-golang/04-golang-standards-reference/02-type-safety-and-errors.md:186` - xxx
- `spec/02-coding-guidelines/06-cicd-integration/03-language-roadmap.md:53` - todo
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/00-overview.md:42` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/00-overview.md:42` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/02-apperror-struct.md:250` - Xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:15` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:16` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:17` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:18` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:19` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:20` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:21` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:22` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:23` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:24` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:25` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:26` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:27` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:28` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:77` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/04-codes-and-policy.md:77` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/05-apperrtype-enums.md:47` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/05-apperrtype-enums.md:53` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/05-apperrtype-enums.md:65` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/05-apperrtype-enums.md:72` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/05-apperrtype-enums.md:94` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/05-apperrtype-enums.md:102` - xxx
- `spec/03-error-manage/02-error-architecture/06-apperror-package/01-apperror-reference/05-apperrtype-enums.md:109` - xxx
- ... 133 more

## Latest bundle index

<!-- sha256:caf255743de5 -->
