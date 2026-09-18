# 45 — Testing Strategy

**Status:** Locked (Plan 04 Step 42). Defines the verification matrix for deterministic rule behavior, instruction-bundle contracts, split-DB persistence, UI workflows, performance envelopes, logging/error observability, and security/privacy gates.

Anchors: 11 (runtime processes), 13 (worker pattern), 14/15 (capture/processing), 16 (parallelism), 22/23 (Task DB + Rules DB), 24 (results JSONL), 26 (migrations), 33–36 (rules, tolerances, view, instruction output), 37–39 (screens), 40–44 (cross-cutting contracts).

## 1. Test Pyramid

| Layer            | Scope                                          | Required before merge             |
| ---------------- | ---------------------------------------------- | --------------------------------- |
| Unit             | pure rule/tolerance/config/path functions      | yes                               |
| Contract         | JSON schemas, IPC messages, DB rows, log shape | yes                               |
| Integration      | Supervisor + dispatcher + worker + split DB    | yes for pipeline changes          |
| UI E2E           | Chromium shell workflows via Playwright        | yes for screen changes            |
| Performance      | 77 fps capture envelope and queue stability    | yes for hot-path changes          |
| Security/privacy | consent, redaction, no-egress, no-secret logs  | yes for export/AI/log/API changes |

Skipping a required layer is `E_TEST_LAYER_SKIPPED`.

## 2. Unit Tests

Unit tests cover pure behavior only:

- Rule evaluators from 33: every `RuleKind` has PASS, NG, and ERROR fixtures.
- Tolerance resolution from 34: range edges, profile mismatch, unresolved profile.
- Geometry transforms from 32/35: image-space coordinates, hit-test math, zoom/pan transforms.
- Config resolution from 27: runtime > task > app > seed, unknown key failure.
- Path/name validation from 25/44: ULID, image sequence, `.part`, path escape rejection.

Every unit test fixture names the source spec section it verifies. A fixture without a section ref is `E_TEST_UNGROUNDED_FIXTURE`.

## 3. Contract Tests

Contract tests lock shapes between processes and storage files:

| Contract           | Source | Assertion                                                                     |
| ------------------ | ------ | ----------------------------------------------------------------------------- |
| Instruction Bundle | 36     | schema-valid, canonical `SourceHash` stable                                   |
| Worker IPC         | 13/15  | `AssignImage` → per-judgment output or typed error                            |
| Result JSONL       | 24     | one line per image, unknown version rejected, partial trailing line tolerated |
| Task DB rows       | 22     | `Judgment` and `Result` rows match JSONL projection                           |
| Rules overrides    | 23     | cascade produces immutable RunSession snapshot                                |
| Error envelope     | 40     | every boundary error has `Code`, `Message`, `Context`                         |
| Log record         | 41     | one-line JSON, PascalCase keys, correlation present                           |
| Metrics registry   | 42     | emitted metrics exist in registry and use allowed labels                      |
| Security consent   | 44     | export/AI/support actions require purpose-specific consent                    |

Adding a new persisted/API/IPC/log shape without a contract test is `E_TEST_CONTRACT_MISSING`.

## 4. Integration Tests

Integration tests run against temporary install roots and real SQLite files.

Required scenarios:

1. Start Task → capture saves `.part` then final image → dispatcher assigns → worker writes judgments → dispatcher appends result line.
2. Dispatcher crash after DB write but before JSONL append → restart rebuilds missing line from `task.db`.
3. Worker crash mid-image → image returns to `pending/` until retry cap, then `failed/` with typed code.
4. Rules edit while RunSession is active → running snapshot stays unchanged; edit applies next session.
5. Migration gap → Supervisor refuses boot with `E_MIGRATION_GAP`.
6. Disk-low simulation → capture halts and UI surfaces `InfraError` banner.

Tests must assert file movement, DB rows, logs, and final user-visible state. A pipeline test that checks only one of those is `E_TEST_PIPELINE_PARTIAL`.

## 5. UI E2E Tests

UI tests run through the embedded Chromium surface using stable roles/labels.

| Screen         | Critical journeys                                                            |
| -------------- | ---------------------------------------------------------------------------- |
| Home/Jobs      | select task, see status, start setup/run flow                                |
| Rule Setup     | draw/edit shapes, assign rule, set tolerance, save bundle, preview JSON      |
| Run Monitor    | counters advance, pause/cancel, worker strip reflects health, NG row appears |
| Results        | filter OK/NG/ERROR, open detail, export CSV/bundle                           |
| Settings       | edit allowed key, reject locked key mid-run, import/export config            |
| Error surfaces | inline DomainError, banner InfraError, modal BugError                        |

Assertions verify DOM state and screenshot evidence for dense HMI layouts. Keyboard-only coverage follows SS-02; missing keyboard coverage is `E_TEST_A11Y_MISSING`.

## 6. Performance Tests

Performance gates are spec-level acceptance targets:

- Capture sustains `77 fps` for a 10-minute synthetic run without capture blocking processing.
- Default `WorkerCount=8` and `BatchSize=3` keeps queue depth below `pipeline.backPressureWarn` for a nominal rule set.
- p95 rule evaluation latency stays below `27.Obs.P95BudgetMs`.
- Logger never drops `ERROR`; coalescing is visible for dropped DEBUG/INFO/WARN.
- Results reader tails JSONL without blocking Dispatcher writes.

Performance runs record metrics from 42 and logs from 41. A pass/fail report without source metrics is `E_TEST_PERF_UNOBSERVED`.

## 7. Security & Privacy Tests

Security tests verify 44 directly:

- Export without consent fails with `E_SEC_CONSENT_MISSING`.
- AI path with `ai.enabled=false` fails with `E_AI_STUB_INVOKED` and emits no egress.
- Config/log export redacts secret-shaped keys.
- Health endpoints return only live/ready status plus failing sub-check name.
- Path traversal attempts never escape the task/install root.
- Redaction hook removes configured mask regions before AI/support bundle output.

Network egress tests run with a deny-all harness. Any unexpected outbound request is test-fatal.

## 8. Error & Observability Tests

Every typed error code added to 40–44 needs one test that proves:

1. The code is emitted at the correct boundary.
2. The log line is written exactly once with correlation.
3. The UI/API surface receives the typed error.
4. The expected metric/counter changes when 42 declares one.

If the log assertion is absent, the test is incomplete (`E_TEST_LOG_UNPROVEN`). This mirrors the project rule that no fix is proven without a log signal.

## 9. Fixture Governance

- Golden images live under the test fixture root, never under production task folders.
- Fixture names use the same ASCII-safe rules as 25.
- Fixture manifests list source image, expected verdicts, rule ids, and tolerance profile ids.
- Large fixtures are referenced by hash and stored outside Git when needed; the manifest remains in Git.
- Updating a golden fixture requires a changelog entry in 98.

Unmanifested fixture use is `E_TEST_FIXTURE_ORPHAN`.

## 10. CI Gates

Minimum gate order:

1. Static spec/docs lint.
2. Unit tests.
3. Contract tests.
4. Integration tests.
5. UI E2E smoke.
6. Security/no-egress tests.
7. Performance smoke on scheduled or release branches.

CI must fail on any unhandled promise, swallowed error, missing log assertion for a boundary error, or orphan metric/error/test code.

## 11. Failure Taxonomy (testing-local)

| Code                        | When                                                       |
| --------------------------- | ---------------------------------------------------------- |
| `E_TEST_LAYER_SKIPPED`      | Required test layer omitted for a touched contract.        |
| `E_TEST_UNGROUNDED_FIXTURE` | Test fixture lacks a source spec-section reference.        |
| `E_TEST_CONTRACT_MISSING`   | Persisted/API/IPC/log shape has no contract test.          |
| `E_TEST_PIPELINE_PARTIAL`   | Pipeline test asserts only one of file/DB/log/UI outcomes. |
| `E_TEST_A11Y_MISSING`       | Screen test lacks required keyboard/a11y coverage.         |
| `E_TEST_PERF_UNOBSERVED`    | Performance pass/fail lacks metric/log evidence.           |
| `E_TEST_LOG_UNPROVEN`       | Error test lacks proof that the log line fired.            |
| `E_TEST_FIXTURE_ORPHAN`     | Fixture used without manifest entry.                       |

## 12. Cross-References

- Rule/tolerance behavior: 33 and 34.
- Instruction/output contracts: 36 and 24.
- UI screens: 37, 38, 39, SS-02.
- Error/log/metrics proofs: 40, 41, 42.
- AI/security gates: 43 and 44.

## Acceptance Checklist

- [ ] Every acceptance bullet in specs 10-72 is reachable from a test name here.
- [ ] Split-DB invariant (spec 06) has a dedicated integration test.
- [ ] Vendor SDK facades tested via mock adapters per spec 52.
