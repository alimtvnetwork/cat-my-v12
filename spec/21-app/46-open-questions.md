# 46 — Open Questions

**Status:** Locked (Plan 04 Step 43). Central registry of unresolved decisions that MUST be answered before the v1 implementation freeze. Every question here is grounded in an existing spec section; nothing is speculative. Answering a question is a spec edit, not a chat reply — the resolution updates the anchor section and this file records the pointer.

Anchors: 00 (glossary/authoring rules), 09–16 (runtime), 20–27 (persistence + config), 30–39 (UI), 40–45 (cross-cutting).

## 1. Governance

- Each question has a stable ID `Q-<NN>`, an owner area, an anchor section, a blocking level (`BLOCKS_V1` | `BLOCKS_V1.1` | `TRACK`), and a proposed resolution path.
- A question moves to **Resolved** only when the anchor section is edited AND the changelog entry references the `Q-<NN>` ID.
- Adding a question without an anchor is `E_SPEC_UNGROUNDED_QUESTION`.
- Resolving a question by changing this file alone (without editing the anchor) is `E_SPEC_UNANCHORED_RESOLUTION`.

## 2. Open Questions (v1 blocking)

### Q-01 — Trigger source authority

- Anchor: 14 (capture pipeline), 27 (config surface).
- Blocks: `BLOCKS_V1`.
- Question: Is the v1 trigger source `SOFTWARE_TIMER` only, or must `GPIO_EDGE` ship in v1?
- Resolution path: pick one; if `GPIO_EDGE`, add hardware abstraction section to 14.

### Q-02 — Worker pool sizing default

- Anchor: 13 (worker pattern), 16 (parallelism), 27.
- Blocks: `BLOCKS_V1`.
- Question: Is the default worker count `min(cpu-2, 6)` or a fixed `4`?
- Resolution path: benchmark on reference workstation; pin number in 27 registry.

### Q-03 — Rules DB override cap

- Anchor: 23 (rules DB overrides).
- Blocks: `BLOCKS_V1`.
- Question: Is the per-Task override row limit `1_000` or unbounded with a warn threshold?
- Resolution path: decide UX for over-cap (`E_RULE_OVERRIDE_LIMIT`) vs soft warning.

### Q-04 — Results JSONL rotation

- Anchor: 24 (results JSONL), 25 (file naming).
- Blocks: `BLOCKS_V1`.
- Question: Rotate by size (e.g. 256 MiB) or by day boundary?
- Resolution path: choose one; add rotation rule + naming suffix to 24 and 25.

### Q-05 — OCR engine binding

- Anchor: 33 (rule catalog, `OCR_TEXT`).
- Blocks: `BLOCKS_V1`.
- Question: Which OCR engine is v1 — bundled Tesseract WASM, native Tesseract, or deferred to v1.1?
- Resolution path: if deferred, mark `OCR_TEXT` as `RuleKind.disabledInV1` in 33.

### Q-06 — AI advisory transport

- Anchor: 43 (AI validation stub), 44 (security/privacy).
- Blocks: `BLOCKS_V1`.
- Question: Is the advisory model in-process only, or an isolated local subprocess with unix-socket IPC?
- Resolution path: pick one; codify isolation boundary and redaction hook location in 43.

### Q-07 — Operator identity model

- Anchor: 39 (settings), 40 (error manage), 41 (logging).
- Blocks: `BLOCKS_V1`.
- Question: Is v1 single-operator workstation (no login) or PIN-based operator switching?
- Resolution path: pick one; add `operatorId` field rules to 39 and log record in 41.

### Q-08 — Reference image storage

- Anchor: 20 (folder structure), 24, 44.
- Blocks: `BLOCKS_V1`.
- Question: Are reference/gold images stored inline in Task DB blob, sidecar files under `refs/`, or content-addressed by `SourceHash`?
- Resolution path: decide; update 20 layout and 24 result linkage.

### Q-09 — Time source

- Anchor: 41 (logging), 42 (observability).
- Blocks: `BLOCKS_V1`.
- Question: Is timestamp source monotonic clock for durations + wall clock for events, or wall clock only?
- Resolution path: pin dual-clock rule and drift tolerance in 41.

### Q-10 — Health endpoint auth

- Anchor: 42 (observability), 44 (security).
- Blocks: `BLOCKS_V1`.
- Question: Are `/api/public/health/*` endpoints unauthenticated on LAN, or bearer-token gated?
- Resolution path: choose; document exact status/body shape and any token rotation in 42.

## 3. Deferred (v1.1 or later)

### Q-11 — Multi-camera synchronization

- Anchor: 11, 14. Blocks: `BLOCKS_V1.1`.
- Question: Global shutter sync strategy across N cameras.

### Q-12 — Remote result mirror

- Anchor: 24, 44. Blocks: `BLOCKS_V1.1`.
- Question: Outbound mirror of JSONL to LAN NAS — auth, retry, backpressure.

### Q-13 — Rule authoring versioning

- Anchor: 23, 26. Blocks: `TRACK`.
- Question: Should Rules DB carry semver per rule row for rollback UX?

## 4. Explicitly Out of Scope for v1

The following are decided NOT to be in v1 and MUST NOT reopen without a new spec section:

- Cloud sync of Task DB or Results.
- Multi-tenant / multi-site aggregation.
- Model training UI (only advisory inference is allowed per 43).
- Windows-native installer (v1 target is Chromium shell + local worker binary).

## 5. Resolution Log

Empty on lock. Each resolution appends `Q-<NN> — <anchor> — <changelog-version>` here in the same commit that edits the anchor section.

- Q-01 — `spec/21-app/14-capture-pipeline.md` §Trigger Sources — v0.65.0 — `SOFTWARE_TIMER` + `GPIO_EDGE` both ship in v1; hardware abstraction added.
- Q-02 — `spec/21-app/27-config-surface.md` §Master Knob Table — v0.65.0 — `worker.count` default = `min(cpu-2, 6)`.
- Q-03 — `spec/21-app/23-rules-db-overrides.md` §9 Override Cap — v0.66.0 — hard cap 1_000 active overrides per Task, soft warn at 800, over-cap raises `E_RULE_OVERRIDE_LIMIT`.
- Q-04 — `spec/21-app/24-results-json.md` §7 Rotation + `spec/21-app/25-file-naming.md` §4.3 — v0.66.0 — size-based rotation at 256 MiB, rotated parts `<RunSessionId>.jsonl.<NNN>` starting at `001`.
- Q-05 — `spec/21-app/33-rule-catalog.md` §3.4 — v0.67.0 — `OCR_TEXT` remains schema-declared but `disabledInV1 = true`; no Tesseract WASM/native OCR ships; active rows raise `E_RULE_DISABLED_IN_V1`.
- Q-06 — `spec/21-app/43-ai-validation-stub.md` §6 + `spec/21-app/44-security-privacy.md` §6 — v0.67.0 — AI advisory lane bound to isolated local subprocess over local JSON-lines IPC with dispatcher-side redaction before handoff.
- Q-07 — `spec/21-app/39-settings-screen.md` §10 + `spec/21-app/41-logging.md` §10 — v0.68.0 — v1 is single-operator workstation; `27.Operator.Id` stamps every audit/log record; PIN/multi-user auth deferred; `E_OPERATOR_ID_UNSET` on empty.
- Q-08 — `spec/21-app/20-folder-structure.md` §7 + `spec/21-app/24-results-json.md` §9 — v0.68.0 — reference images are content-addressed sidecar files under `refs/<SourceHash>.<ext>`; rules and results reference by hash only; inline blobs rejected with `E_REF_INLINE_BLOB`.
- Q-09 — `spec/21-app/41-logging.md` §11 Time Source — v0.69.0 — dual-clock: wall clock for event `Ts`, monotonic for durations; `MaxClockStepMs=2000` warn threshold; new codes `E_LOG_CLOCK_MISUSE`, `E_LOG_CLOCK_REGRESSION`, `E_LOG_CLOCK_STEP_SWALLOWED`, `W_LOG_CLOCK_STEP`.
- Q-10 — `spec/21-app/42-observability.md` §7 + `spec/21-app/44-security-privacy.md` §7 — v0.69.0 — `/health/live` unauthenticated (Ok-only body), `/health/ready` bearer-token gated from `27.Obs.HealthToken` with timing-safe compare and 300s rotation grace; new codes `E_HEALTH_LIVE_LEAK`, `E_HEALTH_UNAUTHORIZED`, `E_HEALTH_UNKNOWN_PARAM`, `E_SEC_HEALTH_TOKEN_WEAK`, `E_SEC_HEALTH_TOKEN_ROTATION_SILENT`, `E_SEC_TIMING_UNSAFE_COMPARE`.

## 6. Failure Modes

## 7. Rule Bundle Follow-ups (Plan 16 close-out, v2.23.x)

Mirror of the Open Questions block in `spec/21-app/70-rule-bundle-import-export.md` §70.12. Anchor lives in spec 70; this section is the registry pointer so audits find it here too. Blocking level `TRACK` unless promoted.

- RB-01 - Cross-bundle image dedup (spec 70 §70.3, §70.5). `TRACK`. Currently per-bundle `sha256` addressing; cross-bundle dedup needs a catalog-side content store.
- RB-02 - Tolerances independent version stamp (spec 70 §70.5). `TRACK`. Today Tolerances travel with Rules; open question is whether catalog updates need a separate version.
- RB-03 - Catalog auth model + signing key rotation cadence (spec 70 §70.12). `BLOCKS_V2.1`. User token vs machine token vs both; rotation window.
- RB-04 - Owner-side review workflow for cloud uploads (spec 70 §70.12). `TRACK`. Approval, rejection signal, withdrawal propagation to caches.
- RB-05 - Offline cache eviction policy (spec 70 §70.12). `TRACK`. `config/catalog-cache/` size cap, LRU vs pinned.
- RB-06 - Catalog transport (spec 70 §70.12). `TRACK`. HTTPS-only assumed; whether signed offline sneakernet import is also supported.
- RB-07 - Trust set format and rotation (spec 70 §70.12). `BLOCKS_V2.1`. Pinned trust set format; rotated key never retroactively invalidates a previously cached, still-trusted bundle.

- `E_SPEC_UNGROUNDED_QUESTION` — question added without anchor.
- `E_SPEC_UNANCHORED_RESOLUTION` — resolution edits this file only.
- `E_SPEC_STALE_QUESTION` — question still `BLOCKS_V1` after v1 acceptance (97) is declared met.

## Acceptance Checklist

- [ ] Every open question has an owner and a due milestone.
- [ ] Closed questions move to `spec/21-app/99-consistency-report.md` with resolution.
- [ ] No open question blocks a v2 GA acceptance bullet without a mitigation note.
