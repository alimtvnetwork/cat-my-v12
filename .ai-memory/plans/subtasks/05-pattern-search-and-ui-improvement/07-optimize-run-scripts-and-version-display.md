# Subtask: 07-optimize-run-scripts-and-version-display

Plan: .ai-memory/plans/pending/05-pattern-search-and-ui-improvement.md
Slug: pattern-search-and-ui-improvement - Task 07
Status: READY_FOR_IMPLEMENTATION

## 1. Objectives & Implementation Blueprint

Prevent duplicate browser instances during application launch, improve cold-start performance on the `/setup` route, and ensure the application version is visible across all primary production views.

---

## 2. Implementation Action Items

1. **Single-Instance Browser Launch Discipline**:
   - Files: `run.ps1`, `run.sh`, `packaging/desktop/start.ps1`
   - Actions:
     * Check if a Chromium or browser process is already running on the designated CAT Vision port prior to calling `Start-Process`.
     * Skip launching a secondary browser window if an app session is already active.

2. **Display Version Badge in /run Route**:
   - File: `src/routes/run.tsx`
   - Actions:
     * Import `APP_VERSION_INFO` from `@/lib/version-info`.
     * Render the SemVer badge in the top navigation header alongside system status indicators.

3. **Cold-Start Performance Optimization**:
   - File: `src/routes/setup.tsx`
   - Actions:
     * Lazy-load non-critical modals and heavy WASM modules.
     * Ensure sub-500ms initial screen transition.

---

## 3. Verification Criteria

- [ ] Executing `run.ps1` while the application is open does not open an unwanted duplicate browser window.
- [ ] Navigating to `/run` clearly displays the SemVer version badge.
- [ ] Cold start into `/setup` is responsive without noticeable lag.
