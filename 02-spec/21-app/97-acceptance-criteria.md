# 97 — Acceptance Criteria

**Status:** Locked (Plan 04 Step 44). Defines the objective, testable gates that MUST all pass before v1 can be declared shippable. Each criterion cites the spec section it verifies and the test layer from 45 that proves it. A green build without every gate below is not v1 — it is a pre-release.

Anchors: 09–16 (runtime), 20–27 (persistence + config), 30–39 (UI), 40–45 (cross-cutting), 46 (open questions must be resolved or explicitly deferred).

## 1. Gate Structure

Each gate has:

- **ID** — stable `A-<NN>`.
- **Anchor** — the spec section whose contract is being verified.
- **Proof layer** — one of the layers in 45 (unit, contract, integration, UI E2E, performance, security/privacy, observability).
- **Signal** — the exact log line, metric, or test name that proves pass.
- **Failure code** — the `E_*` code that fires if the gate regresses.

A gate without all five fields is `E_ACCEPT_MALFORMED_GATE`. A "pass" claim without the named signal in logs is `E_ACCEPT_UNPROVEN` (mirrors `E_TEST_LOG_UNPROVEN` from 45).

## 2. Runtime & Pipeline Gates

### A-01 — Five processes start and register

- Anchor: 11. Layer: integration. Signal: `runtime.process.registered` fires exactly 5 times within 3s of boot. Failure: `E_RUNTIME_MISSING_PROCESS`.

### A-02 — Worker pool respects sizing

- Anchor: 13, 27, Q-02. Layer: integration. Signal: `worker.pool.size` gauge equals resolved config value. Failure: `E_WORKER_POOL_MISSIZED`.

### A-03 — Capture holds 77 fps for 10 minutes

- Anchor: 14, 16. Layer: performance. Signal: `ca.capture.fps` p50 ≥ 77.0 and dropped-frame count = 0 over the 10-min window. Failure: `E_CAP_FPS_REGRESSION`.

### A-04 — Processing pipeline is deterministic

- Anchor: 15, 32–34, 36. Layer: contract. Signal: identical `SourceHash` → identical `Result` bytes across 3 runs. Failure: `E_PROC_NONDETERMINISTIC`.

### A-05 — No cross-worker mutable sharing

- Anchor: 13, 16. Layer: integration. Signal: worker heap snapshot shows no shared array buffers outside the sanctioned image ring. Failure: `E_WORKER_SHARED_MUTATION`.

## 3. Persistence & Config Gates

### A-06 — Split-DB writes are atomic

- Anchor: 21–23, 26. Layer: contract. Signal: no partial row across Root/Task/Rules after induced crash mid-write. Failure: `E_DB_PARTIAL_WRITE`.

### A-07 — Migrations are forward-only and idempotent

- Anchor: 26. Layer: contract. Signal: replaying all migrations twice yields byte-identical schema. Failure: `E_DB_MIGRATION_NONIDEMPOTENT`.

### A-08 — Config resolution order enforced

- Anchor: 27. Layer: unit. Signal: `config.resolve` test matrix passes runtime > task > app > seed. Failure: `E_CONFIG_ORDER_VIOLATION`.

### A-09 — Results JSONL rotation obeys Q-04 resolution

- Anchor: 24, 25, Q-04. Layer: integration. Signal: rotation event `results.rotate` fires at chosen boundary; no lost lines. Failure: `E_RESULTS_ROTATE_MISSED`.

## 4. UI Gates

### A-10 — Every screen matches its spec

- Anchor: 30–39. Layer: UI E2E. Signal: Playwright suites `setup`, `run-monitor`, `results`, `settings` pass. Failure: `E_UI_SPEC_DRIFT`.

### A-11 — Run Monitor renders from stored Result only

- Anchor: 37. Layer: contract + UI E2E. Signal: instrumentation asserts no rule re-evaluation in renderer; `E_RESULT_RENDER_DRIFT` never fires. Failure: `E_RESULT_RENDER_DRIFT`.

### A-12 — Keyboard + a11y contract passes

- Anchor: SS-02. Layer: UI E2E. Signal: axe-core 0 serious/critical; every action reachable by keyboard. Failure: `E_A11Y_REGRESSION`.

### A-13 — Zoom/pan preserves layout stability

- Anchor: 35. Layer: UI E2E. Signal: no layout shift outside canvas during zoom range 5–800 %. Failure: `E_VIEW_LAYOUT_SHIFT`.

## 5. Cross-Cutting Gates

### A-14 — Every error is typed

- Anchor: 40. Layer: contract. Signal: grep for `throw new Error(` in non-test source returns 0. Failure: `E_ERR_UNTYPED`.

### A-15 — Every log line matches schema

- Anchor: 41. Layer: contract. Signal: log validator rejects 0 lines over a 1-hour soak. Failure: `E_LOG_SCHEMA_VIOLATION`.

### A-16 — Metric cardinality within guard

- Anchor: 42. Layer: contract. Signal: cardinality report < declared cap per metric. Failure: `E_OBS_CARDINALITY_EXPLOSION`.

### A-17 — AI stub is advisory-only and offline

- Anchor: 43, 44. Layer: security/privacy. Signal: verdict pipeline ignores `AiOpinion`; network egress test records 0 outbound bytes from AI subsystem. Failure: `E_AI_VERDICT_LEAK`, `E_SEC_EGRESS_DETECTED`.

### A-18 — No secrets in logs, exports, or health responses

- Anchor: 41, 44. Layer: security/privacy. Signal: redaction test suite passes on real fixtures. Failure: `E_SEC_SECRET_LEAK`.

### A-19 — Health endpoints expose only liveness/readiness

- Anchor: 42, 44, Q-10. Layer: contract. Signal: response schema matches locked shape; no PII, no config dump. Failure: `E_SEC_HEALTH_OVEREXPOSED`.

### A-20 — Export/support bundle manifest is complete + redacted

- Anchor: 44. Layer: security/privacy. Signal: manifest listed files == archive files; redaction pass verified. Failure: `E_SEC_BUNDLE_MISMATCH`.

## 6. Governance Gates

### A-21 — All `BLOCKS_V1` open questions resolved

- Anchor: 46. Layer: manual review. Signal: 46 §5 resolution log contains every `BLOCKS_V1` ID with an anchor edit reference. Failure: `E_SPEC_STALE_QUESTION`.

### A-22 — Spec + code + memory in sync

- Anchor: 00, 99 (consistency report). Layer: manual review. Signal: 99 report shows 0 drift items. Failure: `E_SPEC_DRIFT`.

### A-23 — CHANGELOG and RELEASE_NOTES pinned to v1 tag

- Anchor: 98. Layer: contract. Signal: root `readme.md` version == git tag == top of CHANGELOG. Failure: `E_RELEASE_UNPINNED`.

## 7. Non-Gates (explicitly excluded)

The following are NOT acceptance gates for v1 and MUST NOT block release:

- Cloud sync, multi-tenant, model training UI (see 46 §4).
- Cosmetic polish beyond the a11y contract (SS-02).
- Performance targets above 77 fps.

## 8. Declaration Procedure

v1 is declared shippable only when:

1. All gates A-01 → A-23 pass in a single CI run.
2. The proof signals for every gate exist in that run's log archive.
3. 46 §5 is complete for `BLOCKS_V1`.
4. 98 changelog entry records the v1 tag and links this section.

Any deviation is `E_ACCEPT_PREMATURE_DECLARATION`.

## Acceptance Checklist

- [ ] Every GA bullet cites an owning spec + test in spec 45.
- [ ] No bullet references an open question from spec 46.
- [ ] Bullet count matches the summary table (`E_ACC_COUNT_MISMATCH`).
