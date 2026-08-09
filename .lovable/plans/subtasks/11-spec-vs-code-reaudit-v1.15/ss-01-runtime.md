# SS-01 — Runtime + Pipeline Re-Audit (v1.15)

Slug: runtime
Parent: 11-spec-vs-code-reaudit-v1.15
Status: pending
Created: 2026-07-12

## Scope

Audit `spec/21-app/09-runtime-processes.md`..`16-*.md` against:

- `app/supervisor/boot.py`
- `app/capture/{hardware_bridge,reference_driver,perf_harness,perf_harness_runner,pending_writer}.py`
- `app/capture/trigger/{base,software_timer,gpio_edge}.py`
- `app/dispatcher/{pool,snapshot,instruction_bundle,loop,lifecycle,results_writer}.py`
- `app/worker/runner.py`

## Checks

1. Five-process contract still holds after post-v1 additions.
2. `HardwareBridge` protocol has a spec anchor; if not, flag as orphan.
3. `ReferenceCaptureDriver` lifecycle (arm/trigger/disconnect/retry) matches spec fault semantics.
4. `perf_harness_runner` 77 fps SLO wired through `driver.trigger` — spec mentions the runner path.
5. Dispatcher lifecycle atomic transitions still match `spec/21-app/13-*` state chart.
6. New `E_HW_*` codes present in error taxonomy.

## Output

Findings → `.lovable/memory/audit/v1.15.0/20-runtime.md` with Severity/Impact/Proposed-correction.
