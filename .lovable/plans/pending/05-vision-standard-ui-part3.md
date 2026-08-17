# Standard UI Vision Task & Observations - Part 3 (Steps 301-400)

Slug: 99-vision-standard-ui-part3
Steps: 100 (Tasks 301-400)
Status: pending
Created: 2026-08-14

## Context

This document concludes the 400-step vision standard UI overhaul, containing Steps 301 through 400. This final phase covers deployment stability, data migrations, deep observability, performance profiling under load (77 fps targets), and the final documentation and delivery handoff ensuring all architecture observations have been definitively resolved.

## Steps

### Phase 9: Deployment, Migration & Final Seed Data (Steps 301-350)

301. **Audit Database Migration State**
     - **What**: Ensure SQLAlchemy models match `app/core/io/migrations`.
     - **How**: Run `alembic check` or diff models manually.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Zero uncommitted schema drifts.
302. **Finalize `RootDb` Migrations**
     - **What**: Create migration script for root database if any changes apply to jobs/tasks.
     - **How**: Alembic auto-generate.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Split-DB rules.
303. **Finalize `TaskDb` Migrations**
     - **What**: Create migration script for golden images and judgments.
     - **How**: Custom script for specific task DB shards.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Handle dynamically created SQLite files safely.
304. **Finalize `RulesDb` Migrations**
     - **What**: Create migration script for geometry bounds.
     - **How**: Custom script for specific rules DB shards.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Ensure immutable rule snapshots are not broken.
305. **Write Database Rollback Procedures**
     - **What**: Ensure `down` migrations are written safely.
     - **How**: Alembic downgrade logic.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Data safety for factory floors.
306. **Audit Seed Fixtures (`bundle.v2.json`)**
     - **What**: Final verification of mock data parity.
     - **How**: Run UI in pure seed mode and verify all workflows.
     - **Agents**: 1 (QA).
     - **Guidelines**: Seed contract.
307. **Add Boundary Cases to Seed Data**
     - **What**: Mock a failing camera and a disconnected backend.
     - **How**: New profiles in `bundle.v2.json` or query flag overrides.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Test edge cases visually.
308. **Test Seed Profile Switching**
     - **What**: Ensure toggling between active profiles works flawlessly.
     - **How**: E2E test swapping `getActiveProfile()` modes.
     - **Agents**: 1 (QA).
     - **Guidelines**: State resets on switch.
309. **Harden `/healthz` Backend Endpoint**
     - **What**: Deep health check for dependent services (camera SDK, TaskDB).
     - **How**: Expand `BE/routes/health.py` logic.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Standard health probe format.
310. **Implement Client-Side Health Polling**
     - **What**: Detect backend disconnects actively.
     - **How**: TanStack Query polling `/healthz` every 10s.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Minimal network overhead.
311. **Render 'Backend Disconnected' Overlay**
     - **What**: Hard block UI if backend dies.
     - **How**: Global top-level modal over the canvas.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: High priority Z-index.
312. **Implement Shell IPC (Inter-Process Communication)**
     - **What**: Bridge React UI to Chromium MV3 (or future Tauri) for OS events.
     - **How**: Abstraction layer `os-facade.ts`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Prepare for Tauri migration.
313. **Wire System File Dialogs**
     - **What**: Importing/Exporting rule sets natively.
     - **How**: OS Facade calling file picker API.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Security rules (local-first).
314. **Audit `pyproject.toml` dependencies**
     - **What**: Lock down exact package versions used in V4.
     - **How**: `uv lock`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Reproducible builds.
315. **Audit `package.json` dependencies**
     - **What**: Lock down exact package versions for UI.
     - **How**: `npm shrinkwrap` or exact version bumps.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Reproducible builds.
316. **Create Build Script for Chromium Shell**
     - **What**: Ensure `npm run build` pipes correctly into the MV3 shell dir.
     - **How**: Update build step in `package.json`.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: Seamless developer experience.
317. **Test Shell Packaging**
     - **What**: Load unpacked extension locally to verify.
     - **How**: Manual run in Chromium.
     - **Agents**: 1 (QA).
     - **Guidelines**: Environment realism.
318. **Write Environment Setup Docs**
     - **What**: How to configure `LOVABLE_HW_DAHENG=1` safely.
     - **How**: Update `README.md`.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Onboarding efficiency.
319. **Write Hardware Troubleshooting Guide**
     - **What**: Common SDK faults and resolutions.
     - **How**: Add to `spec/21-app/`.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Operator support.
320. **Audit CI/CD Pipeline (if applicable)**
     - **What**: Ensure tests run correctly in GitHub Actions / local CI.
     - **How**: Review YAML configs.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: 100% test passing required.
321. **Review Zod Validation Overheads**
     - **What**: Ensure parsing large image history arrays doesn't lag.
     - **How**: Benchmark array parsing.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Snappy UI.
322. **Implement Zod Array Chunking (if needed)**
     - **What**: Prevent UI freezing on massive payload parsing.
     - **How**: Yield to event loop during large map/parse calls.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Advanced perf.
323. **Verify API Error Status Codes**
     - **What**: Ensure HTTP 4xx/5xx map accurately to Envelope states.
     - **How**: Automated test suite run.
     - **Agents**: 1 (QA).
     - **Guidelines**: Strict protocol compliance.
324. **Verify React Query Cache Invalidation**
     - **What**: Ensure creating a rule immediately updates the canvas.
     - **How**: Check mutation `onSuccess` invalidation keys.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Stale data prevention.
325. **Implement Data Prefetching on Hover**
     - **What**: Preload rule details when hovering a task.
     - **How**: `queryClient.prefetchQuery`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Perceived performance.
326. **Optimize Static Image Loading**
     - **What**: Use WEBP/optimized formats if backend provides them.
     - **How**: `picture` / `source` tags or direct headers.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Core Web Vitals optimization.
327. **Test Concurrent Camera Streams**
     - **What**: If multiple cameras exist, ensure UI handles switching cleanly.
     - **How**: Stream teardown on unmount.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Prevent memory leaks.
328. **Harden WebSocket / SSE (if used)**
     - **What**: Ensure auto-reconnect logic for live status streams.
     - **How**: Reconnecting event source wrappers.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Resilience.
329. **Verify Fallback to Polling**
     - **What**: If SSE fails, degrade gracefully to short-polling.
     - **How**: Network interceptor logic.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Resilience.
330. **Finalize Phase 9 Architecture Checks**
     - **What**: Linter, A11y, and Unit test passes.
     - **How**: Full script run.
     - **Agents**: 1 (Reviewer).
     - **Guidelines**: Zero warnings.
331. **Update Plan Tracker for Phase 9**
     - **What**: Mark migrations and deployment steps complete.
     - **How**: Update tracker markdown.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Traceability.
332. **Write Migration Playbook**
     - **What**: Instructions for applying the new DB schema on factory floor.
     - **How**: MarkDown doc.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Operational safety.
333. **Define Feature Flag for V4 UI (Optional)**
     - **What**: Ability to toggle between V3 and V4 UI if necessary.
     - **How**: Environment variable gating the router.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Safe rollout.
334. **Implement Global Reset Utility**
     - **What**: Button to wipe local state/IndexedDB if things go very wrong.
     - **How**: Dev-mode only "Nuke State" button.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Developer tooling.
335. **Add Production Strip for Dev Tools**
     - **What**: Ensure dev buttons don't compile into production bundle.
     - **How**: `import.meta.env.DEV` checks.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Security/Clean builds.
336. **Review All TODO/FIXME Comments**
     - **What**: Ensure no dangling critical tasks left in code.
     - **How**: Global grep for `TODO:`.
     - **Agents**: 1 (Research).
     - **Guidelines**: Clean codebase.
337. **Address identified TODOs**
     - **What**: Fix the minor issues.
     - **How**: Code edits.
     - **Agents**: 1 (Fullstack).
     - **Guidelines**: Complete the slice.
338. **Sanitize Test Artifacts**
     - **What**: Ensure snapshots and test databases don't leak into builds.
     - **How**: `npmignore` and `.gitignore` review.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: Security.
339. **Sanitize Python Build Artifacts**
     - **What**: Check `__pycache__` and `.pytest_cache`.
     - **How**: `.gitignore` review.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: Clean tree.
340. **Write E2E test for Database Resilience**
     - **What**: Start test, lock DB manually, ensure UI shows Error, unlock, ensure UI recovers.
     - **How**: Playwright with backend shell injection.
     - **Agents**: 1 (QA/Backend).
     - **Guidelines**: Robustness testing.
341. **Write E2E test for App Boot Sequence**
     - **What**: Verify `boot.py` through to UI fully ready state.
     - **How**: Playwright system test.
     - **Agents**: 1 (QA).
     - **Guidelines**: Flow testing.
342. **Conduct Security Scan on Dependencies**
     - **What**: `npm audit` and python `safety check`.
     - **How**: Run commands.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: Security.
343. **Update Vulnerable Packages**
     - **What**: Patch minor/patch versions to resolve audits.
     - **How**: Version bumps.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: Security.
344. **Verify Memory Rule 25 (Identity Header)**
     - **What**: Double check it is strictly applied to all routes.
     - **How**: Code inspection.
     - **Agents**: 1 (Reviewer).
     - **Guidelines**: Rule compliance.
345. **Verify Memory Rule 12 (Booleans & Enums)**
     - **What**: Final sweep for compliance.
     - **How**: Code inspection.
     - **Agents**: 1 (Reviewer).
     - **Guidelines**: Rule compliance.
346. **Verify Component Size Limits (< 100 Lines)**
     - **What**: Ensure no refactoring bloated files back up.
     - **How**: `wc -l` check on all TSX files.
     - **Agents**: 1 (Reviewer).
     - **Guidelines**: Strict prompt rules.
347. **Verify File Size Limits (< 300 Lines)**
     - **What**: Ensure backend and util files adhere.
     - **How**: `wc -l` check on all files.
     - **Agents**: 1 (Reviewer).
     - **Guidelines**: Strict prompt rules.
348. **Verify Split-DB Rules Maintained**
     - **What**: Ensure no cross-db joins crept into Python layer.
     - **How**: Code inspection.
     - **Agents**: 1 (Reviewer).
     - **Guidelines**: Architectural purity.
349. **Phase 9 Final Signoff**
     - **What**: Conclude migration and hardening phase.
     - **How**: Manager approval.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Workflow progress.
350. **Prepare for Performance Phase**
     - **What**: Setup benchmarking tools.
     - **How**: Install required profilers.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: Preparation.

### Phase 10: Performance, Observability & Final Delivery (Steps 351-400)

351. **Configure React DevTools Profiler**
     - **What**: Enable profiling in dev mode.
     - **How**: App configuration.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Perf.
352. **Run Render Bottleneck Analysis**
     - **What**: Identify components taking > 16ms to render.
     - **How**: Manual profiling session on the Canvas.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: 60 FPS target.
353. **Optimize identified bottlenecks**
     - **What**: Apply `useMemo` / `useCallback` strategically.
     - **How**: Refactor heavy calculation hooks.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Perf.
354. **Audit memory footprint of Canvas**
     - **What**: Ensure memory doesn't leak on rapid image swapping.
     - **How**: Chrome Heap Snapshot.
     - **Agents**: 1 (QA).
     - **Guidelines**: Long-running stability.
355. **Fix identified Canvas leaks**
     - **What**: Proper cleanup of object URLs, canvases, etc.
     - **How**: `useEffect` return functions.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Stability.
356. **Load Test the Evaluator Worker**
     - **What**: Simulate 77 fps load on backend `POST /score`.
     - **How**: Python script blasting requests locally.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Target spec speed.
357. **Optimize OpenCV Thread Pools**
     - **What**: Ensure thread pool size matches CPU cores.
     - **How**: FastAPI / Asyncio configuration.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Max throughput.
358. **Implement Backend Telemetry (Optional)**
     - **What**: Setup OpenTelemetry if requested.
     - **How**: FastAPI middleware.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Observability.
359. **Wire `ClientLogger` to Backend (Optional)**
     - **What**: Send critical UI errors to backend log pipeline.
     - **How**: `POST /telemetry/log`.
     - **Agents**: 1 (Frontend/Backend).
     - **Guidelines**: Centralized logs.
360. **Define `POST /telemetry/log` Endpoint**
     - **What**: Receiver for client logs.
     - **How**: Fast, non-blocking route.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Observability.
361. **Implement UI Log Buffering**
     - **What**: Batch UI logs to prevent network spam.
     - **How**: Buffer array flushed every 5s or on error.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Network efficiency.
362. **Update Architecture Observation Document**
     - **What**: Mark `architecture-and-code-observations.md` items as resolved.
     - **How**: Strike-through or add [RESOLVED] tags to sections 5.1, 5.3, etc.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Keep historical context alive.
363. **Update `pending/98-architecture-consolidation-improvements.md`**
     - **What**: Cross off tasks completed by this mega-plan.
     - **How**: Markdown edits.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Traceability.
364. **Write V4 UI Developer Guide**
     - **What**: Explain the new patterns (Canvas orchestrator, ClientLogger).
     - **How**: `spec/02-coding-guidelines/04-v4-patterns.md`.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Onboarding.
365. **Document Global State Topology**
     - **What**: Map the new store + facade setup.
     - **How**: Add Mermaid diagram to docs.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Clarity.
366. **Document Zod / Backend Synchronization process**
     - **What**: Instructions on keeping types in sync.
     - **How**: Markdown in `/spec`.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Maintenance.
367. **Finalize Asset Delivery**
     - **What**: Ensure all SVGs and icons are optimized and in `public/`.
     - **How**: SVGO tool.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Performance.
368. **Review 'Clicking Camera' UX with Operator hat**
     - **What**: Manual walkthrough of the capture flow simulating a user.
     - **How**: Holistic UX review.
     - **Agents**: 1 (UX/Reviewer).
     - **Guidelines**: Professional feel.
369. **Refine Focus Peaking UX**
     - **What**: Polish the focus assist visuals.
     - **How**: Adjust high-pass filter strengths on UI canvas.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Pro capabilities.
370. **Refine Error Recovery UX**
     - **What**: Ensure recovering from a camera fault is 1 click.
     - **How**: "Retry Connection" button on empty state.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Operator efficiency.
371. **Run Full Visual Regression Suite (Final)**
     - **What**: Final lock-in of snapshots.
     - **How**: Playwright.
     - **Agents**: 1 (QA).
     - **Guidelines**: Quality.
372. **Run E2E Suite (Final)**
     - **What**: Ensure 100% pass on core flows.
     - **How**: Playwright.
     - **Agents**: 1 (QA).
     - **Guidelines**: Quality.
373. **Run Unit Test Suite (Final)**
     - **What**: Ensure logic purity.
     - **How**: Pytest / Vitest.
     - **Agents**: 1 (QA).
     - **Guidelines**: Quality.
374. **Run Axe A11y Suite (Final)**
     - **What**: Zero violations.
     - **How**: CLI command.
     - **Agents**: 1 (QA).
     - **Guidelines**: Quality.
375. **Compile Coverage Report**
     - **What**: Measure test coverage of new modules.
     - **How**: `vitest run --coverage`.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: Target > 80%.
376. **Add Coverage Badges to README (Optional)**
     - **What**: Polish project presentation.
     - **How**: Markdown.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: Professional repo.
377. **Generate Backend Spec Docs**
     - **What**: Re-export OpenAPI spec for final validation.
     - **How**: FastAPI script.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Up-to-date specs.
378. **Clean Temporary / Scratch files**
     - **What**: Remove any debugging logs or tmp artifacts.
     - **How**: Standard cleanup.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Clean tree.
379. **Draft Final PR / Merge Commit Message**
     - **What**: Comprehensive description of the 400-task overhaul.
     - **How**: `walkthrough.md` generation.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Contextual history.
380. **Verify Plan 99 Completion Metrics**
     - **What**: Tally up completed tasks vs 400 total.
     - **How**: Markdown checkbox review.
     - **Agents**: 1 (Manager).
     - **Guidelines**: 100% execution.
381. **Create Final Video Demo / GIF (Simulated)**
     - **What**: Record the smooth "clicking camera" UX for stakeholders.
     - **How**: (Manual human step or recorded via Playwright).
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Proof of work.
382. **Present Walkthrough Artifact to User**
     - **What**: Show the completed UI overhaul.
     - **How**: Standard agent artifact.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Transparency.
383. **Solicit Final Design Feedback**
     - **What**: Ask operator/user if the UI now feels "flexible and professional".
     - **How**: Feedback loop.
     - **Agents**: 1 (Manager).
     - **Guidelines**: User satisfaction.
384. **Implement Final Tweaks**
     - **What**: Address any immediate feedback from step 383.
     - **How**: Fast iteration.
     - **Agents**: 1 (Fullstack).
     - **Guidelines**: Responsiveness.
385. **Lock Final Branch**
     - **What**: Ensure no more scope creep on Plan 99.
     - **How**: Push branch / prepare merge.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: Lovable git history rules.
386. **Update `.lovable/plans/index.md` to "Done"**
     - **What**: Move Plan 99 to completed section.
     - **How**: Markdown edit.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Process.
387. **Archive Plan 99 files**
     - **What**: Move the 3 part files to `.lovable/plans/done/`.
     - **How**: File system move.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Organization.
388. **Update `.lovable/memory/index.md`**
     - **What**: Add notes on architectural shifts solidified in this plan.
     - **How**: Add bullet points for Canonical Worker Eval and ClientLogger.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Registry accuracy.
389. **Close pending `architecture-and-code-observations.md` loops**
     - **What**: Link the fixes back to the original observation doc.
     - **How**: Documentation linking.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Traceability.
390. **Run project via `run.ps1` natively**
     - **What**: Final holistic test of the entry point.
     - **How**: Powershell execution.
     - **Agents**: 1 (QA).
     - **Guidelines**: Windows readiness.
391. **Verify Python Backend spins up properly**
     - **What**: Ensure `uvicorn` mounts the refactored endpoints.
     - **How**: API ping.
     - **Agents**: 1 (QA).
     - **Guidelines**: Startup validation.
392. **Verify Frontend spins up properly**
     - **What**: Ensure Vite dev server mounts without instanceof hazards crashing.
     - **How**: UI ping.
     - **Agents**: 1 (QA).
     - **Guidelines**: Startup validation.
393. **Execute final mock capture from UI**
     - **What**: One last click of the Capture Trigger button.
     - **How**: Manual/E2E step.
     - **Agents**: 1 (QA).
     - **Guidelines**: Target verification.
394. **Check logs for silent failures**
     - **What**: Ensure ClientLogger and Backend logs are clean.
     - **How**: Log review.
     - **Agents**: 1 (QA).
     - **Guidelines**: Zero silent errors.
395. **Ensure Lovable push compliance**
     - **What**: Ensure we didn't rebase or rewrite git history.
     - **How**: `git status` check.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: User rule compliance.
396. **Draft release notes for operators**
     - **What**: Friendly text explaining the new Flexible UI and Static Mode priority.
     - **How**: Markdown doc in `/docs`.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: User empathy.
397. **Prepare Handover summary**
     - **What**: Final breakdown for the next human/AI agent picking up the branch.
     - **How**: `handoff.md`.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Collaboration.
398. **Clear the Workspace**
     - **What**: Ensure no dangling scratch scripts exist.
     - **How**: Directory cleanup.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Clean tree.
399. **Final Self-Reflection**
     - **What**: Verify all 400 tasks meet the user's initial prompt directives (Flexible UI, professional, standard UI fixed).
     - **How**: Read-through and checklist.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Accountability.
400. **Plan 99 (Vision UI) Complete**
     - **What**: End of the 400-task blueprint.
     - **How**: Status update.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Mission accomplished.

## End of Part 3

## End of Plan 99 Blueprint
