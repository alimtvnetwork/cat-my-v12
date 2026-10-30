# Subtask 06: Bug Recording Exporter, Email/Supabase & 100-200 E2E Verification
# File: .ai-memory/plans/subtasks/04-vision-system-and-error-management-instructions/ss-06-email-supabase-reporting-e2e-tests.md
# Status: PENDING

## Objectives
1. Implement Bug Recording diagnostic bundler:
   - Packages SplitDB error history, canvas DOM snapshots, and active ruleset into an exportable zip/JSON bundle.
2. Implement Email notification dispatch service:
   - Configurable SMTP/HTTP endpoint with fallback mock transporter for offline environments.
3. Implement Supabase telemetry synchronizer:
   - Modeled after the Antigravity Tools architecture.
   - Supports user-configured Supabase URL/Key in Settings with safe local fallback.
4. Expand headless CLI test suite (`scripts/cli-ui-test-runner.ts`) to execute 100 to 200 automated verification test cases:
   - Window controls verification.
   - SplitDB error capture and Recipe self-healing DDL test.
   - UI Automation XPath targeting and clicking.
   - Zero layout shift on Menu hover.
   - Simulation 1s dwell duration and precision timing.
   - ROI locking and double-click unlock.
   - Multi-shape pattern tools (rect, square, circle).
   - Layers Panel z-index manipulation.
   - Grayscale binary thresholding.
   - Camera dropdown portal rendering.
   - Bug recording export and notification dispatch.

## Deliverables
- `src/services/telemetry/email-notifier.ts`
- `src/services/telemetry/supabase-client.ts`
- `src/components/recorder/BugReportModal.tsx`
- `scripts/cli-ui-test-runner.ts`
