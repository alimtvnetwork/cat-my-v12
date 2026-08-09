# 43 — AI Validation Stub

**Status:** Locked (Plan 04 Step 40). Defines the shape of an optional AI-assisted validation lane that MAY sit alongside classical rules (33) in a future version, and the strict guardrails that keep it from ever silently overriding a deterministic verdict in v1.

Anchors: 15 (processing pipeline), 24 (results JSONL), 27 (config), 33 (rule catalog), 34 (tolerance model), 36 (Instruction Bundle), 40 (errors), 41 (logging), 42 (observability).

## 1. Scope in v1

**Stub only.** No model runs in v1. This spec locks the interface, the storage, and the reporting so that when a model is wired in v2 there is nothing to redesign — and no v1 code path can silently start invoking a model.

- Feature flag: `27.AI.Enabled` (bool, default `false`). While `false`, all AI code paths are compiled out or guarded; a request that reaches them is `E_AI_STUB_INVOKED`.
- Availability of a model, weights, or network is irrelevant in v1 — the flag is the only gate.

## 2. Role: Advisory, Never Authoritative

The classical rule verdict (33 §Verdict) is always authoritative. AI produces a parallel `AiOpinion` object attached to the same `Result` (24). Rules:

- AI MUST NOT change `Result.Verdict`. Doing so is `E_AI_OVERRODE_VERDICT`.
- AI MUST NOT block the pipeline. If AI takes longer than `27.AI.TimeoutMs`, its opinion is dropped and the result is emitted without it — never delayed. Delaying is `E_AI_BLOCKED_PIPELINE`.
- AI MUST NOT read from or write to Task DB (22) or Rules DB (23). Its only inputs are the Instruction Bundle (36) and the image bytes; its only output is the `AiOpinion` block on the result row.

## 3. `AiOpinion` Shape

Appended to `Result` (24) as an optional block:

```json
"AiOpinion": {
  "ModelId": "stub-v0",
  "ModelVersion": "0.0.0",
  "OpinionVerdict": "PASS | FAIL | ABSTAIN",
  "Confidence": 0.0,
  "AgreesWithRules": true,
  "DisagreementReasons": ["RULE:<RuleId>:<Reason>", "..."],
  "LatencyMs": 0,
  "Truncated": false
}
```

Rules:

- `OpinionVerdict = ABSTAIN` is required when `Confidence < 27.AI.MinConfidence` — a low-confidence PASS/FAIL is `E_AI_LOW_CONFIDENCE_EMITTED`.
- `AgreesWithRules` is a pure function of `OpinionVerdict` vs. `Result.Verdict`; mismatch is a data bug, not a modelling choice (`E_AI_AGREEMENT_INCONSISTENT`).
- `DisagreementReasons` cites specific `RuleId`s from the bundle. Free-form text without a rule ref is `E_AI_UNGROUNDED_DISAGREEMENT`.

## 4. Disagreement Handling

- Disagreements are surfaced on the Results screen (38) as a neutral chip on the row ("AI disagrees") and in the DetailPane as a side-by-side comparison.
- Disagreements are counted in `ca.ai.disagreements_total{rule_id}` (added to 42 §2 when v2 lands; declared here so it is not a surprise).
- Operators MAY use disagreements as a signal to tune rules — never as a signal to re-verdict a specific Result. Re-verdict in v1 is `E_RESULT_RECOMPUTED` (38 §8).

## 5. Failure Modes

| Situation         | Handling                                                                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model unavailable | `AiOpinion` omitted; row still emitted; single WARN line per session.                                                                             |
| Model timeout     | `AiOpinion` omitted with WARN; counter `ca.ai.timeouts_total` incremented (v2).                                                                   |
| Model crash       | Isolated to the AI worker; classical pipeline unaffected. Crash logged as `ERROR`; `AiOpinion.Truncated = true` never appears in v1 (no partial). |
| Flag off          | No code path reached; any invocation is `E_AI_STUB_INVOKED`.                                                                                      |

No fallback that fabricates an `AiOpinion` when the model is missing. Fabrication is `E_AI_FABRICATED_OPINION`.

## 6. Isolation + Transport Binding

**Q-06 resolution:** the advisory AI lane is bound to an **isolated local subprocess** model, not an in-process plugin. Even when a future model is enabled, it runs outside the classical dispatcher/worker address space and communicates only through local JSON-lines IPC.

- AI runs in its own worker class (`ai-worker-<n>`) backed by a local subprocess, separate from classical rule workers (11 §Runtime Processes).
- IPC is one-way over the same local IPC family as 27 §Never-Configurable: dispatcher → ai-worker (bundle id + redacted image path); ai-worker → dispatcher (opinion). The ai-worker cannot enqueue work to classical workers. Reverse flow is `E_AI_BAD_IPC_DIRECTION`.
- The redaction hook is located in the dispatcher immediately before enqueueing to the AI subprocess: load `Result.ImageFilePath`, load the Instruction Bundle (36), apply 44 §6 redaction, write the redacted temp image, then send only `{InstructionId, SourceHash, RedactedImagePath, CorrelationId}` over IPC.
- If redaction fails, the dispatcher omits `AiOpinion`, emits the typed security/error log, and still emits the classical `Result`; AI failure never delays or changes deterministic output.
- The AI subprocess receives no DB handles, no root/task/rules DB paths, no raw image path, and no network capability. Any attempt to request those resources is `E_AI_ISOLATION_BREACH`.
- Resource limits (`27.AI.CpuPct`, `27.AI.MemMb`) are enforced by the supervisor. Exceeding them kills the ai-worker without touching classical workers.

## 7. Privacy

- The ai-worker MAY see the same image bytes classical workers see, subject to 44 (Security & Privacy) — no additional data.
- The ai-worker MUST NOT phone home; network egress is denied by policy. Any outbound connection is `E_AI_NETWORK_EGRESS`.
- Model weights are read from `27.AI.ModelPath` at startup; missing weights with `AI.Enabled = true` is startup-fatal (`E_AI_MODEL_MISSING`), not a silent disable.

## 8. Reporting

- `results.jsonl` (24) rows include `AiOpinion` when present; absence is not error.
- Exports (38 §5) include `AiOpinion` columns in CSV (empty when absent) and inside Evidence Bundles verbatim. Filtering exports by "AI disagreed" is a v2 filter.

## 9. Failure Taxonomy (AI-local)

| Code                           | When                                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| `E_AI_STUB_INVOKED`            | Any AI code path executed while `27.AI.Enabled = false`.                                  |
| `E_AI_OVERRODE_VERDICT`        | `Result.Verdict` differs after AI writes.                                                 |
| `E_AI_BLOCKED_PIPELINE`        | Result emission waited on AI.                                                             |
| `E_AI_LOW_CONFIDENCE_EMITTED`  | `OpinionVerdict != ABSTAIN` while below `MinConfidence`.                                  |
| `E_AI_AGREEMENT_INCONSISTENT`  | `AgreesWithRules` flag disagrees with the actual verdicts.                                |
| `E_AI_UNGROUNDED_DISAGREEMENT` | Disagreement without `RuleId` ref.                                                        |
| `E_AI_FABRICATED_OPINION`      | Opinion emitted without a real model run.                                                 |
| `E_AI_BAD_IPC_DIRECTION`       | AI worker enqueued to a classical worker.                                                 |
| `E_AI_ISOLATION_BREACH`        | AI subprocess attempted DB access, raw image access, network access, or unsanctioned IPC. |
| `E_AI_NETWORK_EGRESS`          | Outbound network call from the ai-worker.                                                 |
| `E_AI_MODEL_MISSING`           | `AI.Enabled = true` with no model at `ModelPath`.                                         |

## 10. Cross-References

- Verdict authority (never overridden): 33.
- Result row shape (opinion is an appended block): 24.
- Bundle inputs (only allowed data source alongside image): 36.
- Runtime isolation: 11.
- Security/privacy of image bytes: 44 (next).
- Config keys (`27.AI.*`): 27.

## Acceptance Checklist

- [ ] Stub contract mirrors the future Lovable AI Gateway call shape; no vendor lock-in.
- [ ] Failure modes map to `E_AI_*` codes registered in spec 40.
- [ ] Stub outputs are ignored by image verdict (silent) per spec 16.

## Cross-reference: TS constants sync

Frontend string registries (`HttpMethod`, `StorageKey`, `AppEvent`) live under `src/lib/constants/`. See `spec/21-app/40-error-manage.md` Appendix Z for the reality-aligned inventory and the rationale for not mirroring `ErrorCode`/`IpcChannel`/vendor/pixel-format on the TS side.
