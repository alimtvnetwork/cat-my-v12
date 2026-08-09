# SS-01 — Runtime + Pipeline Audit

Slug: runtime-pipeline
Parent: 06-spec-vs-code-audit
Status: pending
Created: 2026-07-12

## Scope

Audit `spec/21-app/09-runtime-processes.md` through `spec/21-app/16-*.md` against:

- `app/supervisor/boot.py`
- `app/capture/trigger/{base,software_timer,gpio_edge}.py`
- `app/capture/pending_writer.py`
- `app/dispatcher/{pool,snapshot,instruction_bundle,loop,results_writer}.py`
- `app/worker/runner.py`

## Checks

1. Five-process contract (A-01): supervisor, capture, dispatcher, worker(s), UI-host — confirm each is either implemented, stubbed, or explicitly deferred.
2. Worker pool sizing (A-02, Q-02 resolution): CPU-based sizing present in `pool.py`? Record value source.
3. Capture fps target (A-03): timer cadence 77 fps configurable? Record where.
4. Pipeline determinism (A-04): SourceHash → Result byte-equality path traced through `snapshot.py` + `instruction_bundle.py`.
5. No cross-worker shared mutation (A-05): confirm worker snapshots are immutable/copied.
6. Atomic write pattern parity between `pending_writer.py` and `results_writer.py` rotation.

## Output

Findings appended to `.lovable/memory/audit/21-runtime.md` with Severity/Impact and proposed correction per finding.
