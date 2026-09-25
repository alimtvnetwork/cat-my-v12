# Testing strategy

Status: Draft (Plan 28)

## Test layers

| Layer       | Scope                                             | Tool                | Location                        |
| ----------- | ------------------------------------------------- | ------------------- | ------------------------------- |
| Unit        | IPC codec, envelope, backpressure LRU             | vitest / pytest     | `tests/unit/`                   |
| Contract    | Every method row in `05-ui-to-backend-map.md`     | pytest              | `tests/contract/`               |
| Integration | Worker boot + IPC round-trip + SQLite             | pytest              | `tests/integration/`            |
| E2E         | Playwright driving the shell against local worker | Python + Playwright | `tests/e2e/`                    |
| Perf        | Cold start, IPC RTT, capture FPS                  | pytest-benchmark    | `tests/perf/`                   |
| A11y        | axe-core per route                                | Playwright          | `tests/e2e/axe_a11y.py`         |
| Smoke       | Installer boots, `/healthz` green, one capture    | CI job per OS       | `.github/workflows/smoke-*.yml` |

## Coverage bar

- Every UI-map row: at least one contract test.
- Every `E_*` code: at least one test asserts it fires.
- Every migration: forward test on fresh DB.
- Boot lifecycle: full sequence log assertion (each stage line present).

## Missing-log-is-a-bug enforcement

Test harness parses `<log-dir>/*.log` after each E2E case and asserts each
expected `stage` line is present with `outcome ∈ {ok, warn, error}`. Missing
line fails the test.

## CI matrix

- OS: `windows-2022`, `macos-13`, `ubuntu-22.04`.
- Node 20 LTS, Python 3.13, Rust stable.
- Nightly job: full E2E + perf + a11y.
- PR job: unit + contract + one E2E smoke per OS.
