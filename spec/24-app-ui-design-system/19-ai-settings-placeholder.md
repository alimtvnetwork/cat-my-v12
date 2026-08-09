# 19 - AI Settings (v1 placeholder, blocked by Q20)

**Version:** 0.1 (placeholder)
**Owner:** Plan 64 (UI v2), step 14
**Status:** OUT OF SCOPE for v1. Fields BLOCKED by ambiguity Q20 in `.lovable/ambiguity-questions/01-ui-v2-open-questions.md`.

---

## Purpose

Reserve the "AI Settings" section so navigation and Project settings can link to it without breaking. The section renders a "Coming soon" panel until Q20 is answered.

## v1 UI

- Sidebar entry under Setup labelled `AI Settings` with a "Coming soon" chip.
- Route: `/setup/ai`.
- Body: a single card explaining that AI verification lands in a later plan, plus a link to `.lovable/ambiguity-questions/01-ui-v2-open-questions.md` Q20.

## Proposed fields (do NOT implement until Q20 is answered)

- `provider` enum: `LovableAiGateway` | `LocalOllama` | `OpenAiCompat` | `Disabled`.
- `model` string.
- `endpoint_url` (only when `OpenAiCompat`).
- `api_key_secret_ref` (Secrets tool reference; never inline).
- `confidence_threshold` 0..1.
- `fallback_on_error` bool.
- `redact_pii` bool.

## Not doing in v1

- No inference calls. No model discovery. No token usage tracking. No cost budget UI.

## Verification

- Playwright: navigate to `/setup/ai`, assert "Coming soon" panel renders and no network call is made.
