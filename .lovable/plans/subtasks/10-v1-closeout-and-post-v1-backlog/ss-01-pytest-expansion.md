---
Slug: pytest-expansion
Status: pending
Created: 2026-07-12
Parent: 10-v1-closeout-and-post-v1-backlog
---

# SS-01 — Pytest expansion (consent + fps)

Goal: raise Tests area score by covering two v1 modules that currently rely only on integration/contract shims.

## Files touched

- `app/core/security/consent_sqlite.py` — issue / consume / expire lifecycle
- `app/capture/perf_harness.py` — `ca.capture.fps` metric emission
- `app/core/telemetry/metrics.py::ALLOWED_LABELS` — assert label registered

## Cases

1. `test_consent_issue_persisted` — issue grant, reopen DB, row present with expected purpose/destination/expires_at.
2. `test_consent_consume_marks_row` — consume grant, `consumed_at` populated, second consume raises `E_SEC_CONSENT_ALREADY_CONSUMED`.
3. `test_consent_expiry_rejects` — expired grant refuses consume with `E_SEC_CONSENT_EXPIRED`.
4. `test_fps_metric_emitted` — run harness for N frames, metric registry contains `ca.capture.fps` samples with p50/p95/p99 fields.
5. `test_fps_label_allowed` — `ca.capture.fps` present in `ALLOWED_LABELS`.

## Definition of done

- `pytest tests/unit/test_consent_sqlite.py tests/contract/test_perf_harness.py` all green.
- Total pytest count ≥ baseline + 5.
- Errors surface via typed `AppError` subclasses (per `.lovable/memory/03-error-manage.md`), never bare `Exception`.
