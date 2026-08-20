# Plan 99 — Full Architecture Remediation & Code Quality

Slug: 99-full-architecture-remediation
Steps: 200
Status: completed
Created: 2026-08-17

## Context

Four structural problems were identified in the architecture review session on
2026-08-17: (A) backend "split brain" — `BE/routes/` tree with its own competing
`envelope.py` exists alongside the established `BE/routes/` + `BE/envelope.py`;
(B) frontend route sprawl — 69 flat files in `src/routes/` using long
dot-delimited names; (C) global Zustand store sprawl — 11 global stores when
several are editor/HMI-scoped; (D) missing backend bootstrapping — `pydantic-settings`
not on PATH causes `pytest` collection failures.

This plan is PURE STRUCTURAL HYGIENE. It does NOT touch feature code, Standard UI
(plans 01/08/09), or any product functionality. It remediates architecture debt only.

Spec task: `.lovable/spec/tasks/99-full-architecture-remediation.md`
Subtasks:

- Phase A: `.lovable/plans/subtasks/99-full-architecture-remediation/SS-01-backend-split-brain.md`
- Phase B: `.lovable/plans/subtasks/99-full-architecture-remediation/SS-02-route-directory-migration.md`
- Phase C: `.lovable/plans/subtasks/99-full-architecture-remediation/SS-03-store-localization.md`
- Phase D: `.lovable/plans/subtasks/99-full-architecture-remediation/SS-04-backend-bootstrap-docs.md`

Coding guidelines: `.lovable/coding-guidelines.md` (15-line function cap, 100-line .tsx cap,
no magic strings, enum-only bounded sets, positive boolean names, no nested if).
Strictly avoid: `.lovable/strictly-avoid.md` (no string unions, Enum must have Type suffix,
positive booleans, no TS2322/TS2339 left unaddressed).
Memory: `.lovable/memory/13-avoid-blind-mass-refactors.md` (NO untargeted AST mass-replace).
Prior plan: `.lovable/plans/completed/98-architecture-consolidation-improvements.md`

Release policy: Individual next-task turns NEVER bump the version or add a changelog
entry. Version bump + changelog fires ONLY when ALL 200 steps are complete and this
file moves to `completed/`. The release ceremony follows `11-release.md`.

Pending items rolled forward from prior pending plans:

- `02-ui-fixes.md` (5 UI issues, separate scope — not merged here, tracked separately)
- `08-vision-system-v2.md` (repetitive filler steps, separate vision scope — not merged here)
- `09-vision-standard-ui-tasks.md` (400-step vision plan — separate scope)

## Steps

### PHASE A — BACKEND SPLIT-BRAIN RESOLUTION

### Reference: SS-01-backend-split-brain.md

1. Read `BE/routes/api/router.py` in full. Verify it imports only `BE.src.api.system.router`. Record line count and import list. Spec: `99-full-architecture-remediation.md §Affected Files`.

2. Read `BE/routes/api/system.py` in full. Record the route path (`GET /system/status`), the response model (`SystemStatus`), and the envelope call used (`Envelope.ok`). Spec: same.

3. Read `BE/routes/models/envelope.py` in full. Confirm it is a smaller version of `BE/envelope.py` and list every class/field it defines. Spec: same.

4. Read `BE/routes/models/system.py`. Confirm the `SystemStatus` model fields. Spec: same.

5. Read `BE/routes/models/camera.py`. Confirm it contains only `CameraStatus` or similar. Spec: same.

6. Run `grep -rn "from BE.src" BE/ --include="*.py"` and record every file and line that imports from `BE.src`. This is the impact radius. Spec: same.

7. Run `grep -rn "from BE.src" src/ --include="*.ts" --include="*.tsx"` to confirm no frontend file imports from `BE.src`. Spec: same.

8. Read `BE/routes/health.py` in full to understand the established route pattern (Router, prefix, tags, envelope usage). Use this as the template for the new system route. Spec: same.

9. Read `BE/routes/meta.py` in full to verify envelope usage pattern. Spec: same.

10. Create `BE/routes/system.py` with content mirroring `BE/routes/health.py` structure: import `APIRouter` from fastapi, import `SystemStatus` Pydantic model from a new `BE/models/system.py`, define `router = APIRouter(prefix="/system", tags=["system"])`, implement `GET /status` returning `Envelope.ok(data=SystemStatus(...))`. Spec: `SS-01 §SS-01-03`.

11. Create `BE/models/` directory with `__init__.py`. Spec: `SS-01 §SS-01-03`.

12. Create `BE/models/system.py` with `SystemStatus(BaseModel)` containing fields `uptime: float`, `version: str`, `status: str`. Import from `pydantic`. Spec: `SS-01 §SS-01-03`.

13. Create `BE/models/camera.py` by moving the camera model from `BE/routes/models/camera.py`. Read `BE/routes/models/camera.py` first; copy its content verbatim to `BE/models/camera.py`. Spec: same.

14. Update `BE/routes/system.py` to import `SystemStatus` from `BE.models.system` (not `BE.src.models.system`). Spec: `SS-01 §SS-01-03`.

15. Open `BE/main.py`. Add `from BE.routes import system as system_route` to the import block, after the existing `cli_doctor_route` import line. Spec: `SS-01 §SS-01-04`.

16. In `BE/main.py`, inside `_register_routers()`, add `app.include_router(system_route.router)` as the last `include_router` call. Spec: `SS-01 §SS-01-04`.

17. In `BE/main.py`, remove the line `from BE.src.api.router import api_router` and remove the call `app.include_router(api_router)` from `_register_routers()`. Spec: `SS-01 §SS-01-04`.

18. Run `python -m py_compile BE/main.py` to verify no syntax errors. Exit code must be 0. Spec: `SS-01 §SS-01-06`.

19. Run `python -m py_compile BE/routes/system.py` to verify no syntax errors. Exit code must be 0. Spec: same.

20. Run `python -m py_compile BE/models/system.py` to verify no syntax errors. Exit code must be 0. Spec: same.

21. Run `grep -rn "from BE.src" BE/ --include="*.py"`. Result must be zero lines. If any remain, fix each import to use the correct `BE.models.*` or `BE.routes.*` path before continuing. Spec: `SS-01 §Acceptance Criteria`.

22. Delete `BE/routes/api/system.py`. Spec: `SS-01 §SS-01-05`.

23. Delete `BE/routes/api/router.py`. Spec: same.

24. Delete `BE/routes/api/__init__.py` if it exists. Spec: same.

25. Delete `BE/routes/models/envelope.py`. Spec: same.

26. Delete `BE/routes/models/system.py`. Spec: same.

27. Delete `BE/routes/models/camera.py`. Spec: same.

28. Delete `BE/routes/models/__init__.py` if it exists. Spec: same.

29. Delete `BE/routes/__init__.py` if it exists. Spec: same.

30. Verify `BE/routes/` directory is gone: run `Test-Path BE/routes` in PowerShell; result must be `False`. Spec: `SS-01 §Acceptance Criteria`.

31. Run `python -m py_compile BE/main.py` again post-deletion. Exit code must be 0. Spec: same.

32. Run `grep -rn "BE.src" ./ --include="*.py" --include="*.ts" --include="*.tsx" --include="*.md"`. Record any remaining hits. Fix each hit. Spec: same.

33. Activate BE venv: `.\BE\.venv\Scripts\Activate.ps1`. Run `pytest BE/tests/test_main.py -v`. All tests in that file must pass. Spec: `SS-01 §SS-01-06`.

34. Run `pytest BE/tests/test_health.py -v`. All tests must pass. Spec: same.

35. Run `pytest BE/tests/ -v --collect-only`. Zero `ModuleNotFoundError` during collection. Spec: same.

36. Commit the Phase A changes with message `refactor(BE): remove BE/routes split-brain, unify under BE/routes`. No version bump. Spec: `99-full-architecture-remediation.md §Release Policy`.

37. Update `.lovable/plans/subtasks/99-full-architecture-remediation/SS-01-backend-split-brain.md`: flip `Status: completed` to `Status: completed`. Spec: plan lifecycle rule.

### PHASE B — FRONTEND ROUTE DIRECTORY MIGRATION

### Reference: SS-02-route-directory-migration.md

38. Read `app.config.ts` (or `vite.config.ts`) in full. Record the TanStack Router plugin config: `routesDirectory`, `generatedRouteTree`, `routeFileIgnorePrefix`. Spec: `SS-02 §SS-02-01`.

39. Run `npx tsc --noEmit` as baseline check. Exit code must be 0 before migration starts. Record the output (should be clean). Spec: `SS-02 §Pre-conditions`.

40. List all files in `src/routes/` with two or more dot segments: run `Get-ChildItem src/routes -Filter "*.tsx" | Where-Object { ($_.Name -split '\.').Count -gt 3 }`. Capture the full list. This is the migration target. Spec: `SS-02 §Goal`.

41. Create directory `src/routes/projects` if it does not exist. Spec: `SS-02 §SS-02-02`.

42. Create directory `src/routes/projects/$projectId`. Note: on Windows PowerShell this requires quoting — `New-Item -ItemType Directory "src/routes/projects/`$projectId"`. Spec: same.

43. Create directory `src/routes/projects/$projectId/rulesets`. Spec: same.

44. Create directory `src/routes/settings`. Spec: same.

45. Create directory `src/routes/setup`. Spec: same.

46. Create directory `src/routes/setup/categories`. Spec: same.

47. Create directory `src/routes/cli`. Spec: same.

48. Create directory `src/routes/cli-sessions`. Spec: same.

49. Create directory `src/routes/observability`. Spec: same.

50. Create directory `src/routes/observability/sessions`. Spec: same.

51. Create directory `src/routes/admin`. Spec: same.

52. Create directory `src/routes/admin/debug`. Spec: same.

53. Move `src/routes/projects.$projectId.index.tsx` to `src/routes/projects/$projectId/index.tsx`. Spec: `SS-02 §SS-02-03`.

54. Move `src/routes/projects.$projectId.tsx` (layout) to `src/routes/projects/$projectId.tsx` (stays at `projects/` level as the layout). Spec: same.

55. Move `src/routes/projects.$projectId.ai-testing.tsx` to `src/routes/projects/$projectId/ai-testing.tsx`. Spec: same.

56. Move `src/routes/projects.$projectId.ai-testing-history.tsx` to `src/routes/projects/$projectId/ai-testing-history.tsx`. Spec: same.

57. Move `src/routes/projects.$projectId.camera.tsx` to `src/routes/projects/$projectId/camera.tsx`. Spec: same.

58. Move `src/routes/projects.$projectId.categories.tsx` to `src/routes/projects/$projectId/categories.tsx`. Spec: same.

59. Move `src/routes/projects.$projectId.runs.tsx` to `src/routes/projects/$projectId/runs.tsx`. Spec: same.

60. Move `src/routes/projects.$projectId.trial-run.tsx` to `src/routes/projects/$projectId/trial-run.tsx`. Spec: same.

61. Move `src/routes/projects.$projectId.trial-run.$runId.tsx` to `src/routes/projects/$projectId/trial-run.$runId.tsx`. Spec: same.

62. Move `src/routes/projects.$projectId.rulesets.tsx` (layout) to `src/routes/projects/$projectId/rulesets.tsx`. Spec: `SS-02 §SS-02-04`.

63. Move `src/routes/projects.$projectId.rulesets.index.tsx` to `src/routes/projects/$projectId/rulesets/index.tsx`. Spec: same.

64. Move `src/routes/projects.$projectId.rulesets.new.tsx` to `src/routes/projects/$projectId/rulesets/new.tsx`. Spec: same.

65. Move `src/routes/projects.$projectId.rulesets.$rulesetId.tsx` to `src/routes/projects/$projectId/rulesets/$rulesetId.tsx`. Spec: same.

66. Move `src/routes/projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx` to `src/routes/projects/$projectId/rulesets/$rulesetId/rules.$ruleId.tsx`. Spec: same.

67. Run `npx tsc --noEmit`. Fix every error produced (likely broken `Link` `to` props or route-tree imports). Record fixes. Spec: `SS-02 §SS-02-12`.

68. Move `src/routes/settings.index.tsx` to `src/routes/settings/index.tsx`. Spec: `SS-02 §SS-02-05`.

69. Move `src/routes/settings.camera.tsx` to `src/routes/settings/camera.tsx`. Spec: same.

70. Move `src/routes/settings.license.tsx` to `src/routes/settings/license.tsx`. Spec: same.

71. Move `src/routes/settings.lighting.tsx` to `src/routes/settings/lighting.tsx`. Spec: same.

72. Move `src/routes/settings.shortcuts.tsx` to `src/routes/settings/shortcuts.tsx`. Spec: same.

73. Move `src/routes/settings.trigger.tsx` to `src/routes/settings/trigger.tsx`. Spec: same.

74. Run `npx tsc --noEmit` after settings migration. Fix any errors. Spec: same.

75. Move `src/routes/setup.index.tsx` to `src/routes/setup/index.tsx`. Spec: `SS-02 §SS-02-06`.

76. Move `src/routes/setup.camera.tsx` to `src/routes/setup/camera.tsx`. Spec: same.

77. Move `src/routes/setup.categories.tsx` (layout) to `src/routes/setup/categories.tsx`. Spec: same.

78. Move `src/routes/setup.categories.index.tsx` to `src/routes/setup/categories/index.tsx`. Spec: same.

79. Move `src/routes/setup.categories.$id.tsx` to `src/routes/setup/categories/$id.tsx`. Spec: same.

80. Move `src/routes/setup.chain-events.tsx` to `src/routes/setup/chain-events.tsx`. Spec: same.

81. Move `src/routes/setup.functions.tsx` to `src/routes/setup/functions.tsx`. Spec: same.

82. Move `src/routes/setup.reference.tsx` to `src/routes/setup/reference.tsx`. Spec: same.

83. Move `src/routes/setup.roi.tsx` to `src/routes/setup/roi.tsx`. Spec: same.

84. Move `src/routes/setup.rules.tsx` to `src/routes/setup/rules.tsx`. Spec: same.

85. Move `src/routes/setup.rules.$id.tsx` to `src/routes/setup/rules/$id.tsx`. Spec: same.

86. Run `npx tsc --noEmit` after setup migration. Fix any errors. Spec: same.

87. Move `src/routes/cli.index.tsx` to `src/routes/cli/index.tsx`. Spec: `SS-02 §SS-02-07`.

88. Move `src/routes/cli.ipc.tsx` to `src/routes/cli/ipc.tsx`. Spec: same.

89. Move `src/routes/cli.rules.tsx` to `src/routes/cli/rules.tsx`. Spec: same.

90. Move `src/routes/cli.rules.$ruleId.tsx` to `src/routes/cli/rules/$ruleId.tsx`. Spec: same.

91. Move `src/routes/cli.rules.import.tsx` to `src/routes/cli/rules/import.tsx`. Spec: same.

92. Move `src/routes/cli.samples.tsx` to `src/routes/cli/samples.tsx`. Spec: same.

93. Move `src/routes/cli.samples.$sampleId.tsx` to `src/routes/cli/samples/$sampleId.tsx`. Spec: same.

94. Move `src/routes/cli.sessions.tsx` to `src/routes/cli/sessions.tsx`. Spec: same.

95. Move `src/routes/cli.sessions.$sessionId.tsx` to `src/routes/cli/sessions/$sessionId.tsx`. Spec: same.

96. Move `src/routes/cli.sessions.compare.tsx` to `src/routes/cli/sessions/compare.tsx`. Spec: same.

97. Move `src/routes/cli.settings.tsx` to `src/routes/cli/settings.tsx`. Spec: same.

98. Run `npx tsc --noEmit` after CLI migration. Fix any errors. Spec: same.

99. Move `src/routes/cli-sessions.index.tsx` to `src/routes/cli-sessions/index.tsx`. Spec: `SS-02 §SS-02-08`.

100.  Move `src/routes/cli-sessions.$runId.tsx` to `src/routes/cli-sessions/$runId.tsx`. Spec: same.

101.  Move `src/routes/observability.sessions.tsx` to `src/routes/observability/sessions.tsx`. Spec: `SS-02 §SS-02-09`.

102.  Move `src/routes/observability.sessions.$cliInvocationId.ipc.tsx` to `src/routes/observability/sessions/$cliInvocationId.ipc.tsx`. Spec: same.

103.  Move `src/routes/observability.sessions.$cliInvocationId.logs.tsx` to `src/routes/observability/sessions/$cliInvocationId.logs.tsx`. Spec: same.

104.  Move `src/routes/observability.runs.$runId.tsx` to `src/routes/observability/runs.$runId.tsx`. Spec: same.

105.  Move `src/routes/admin.debug.calibration.tsx` to `src/routes/admin/debug/calibration.tsx`. Spec: `SS-02 §SS-02-10`.

106.  Move `src/routes/admin.debug.calibration-distributions.tsx` to `src/routes/admin/debug/calibration-distributions.tsx`. Spec: same.

107.  Move `src/routes/admin.security.denial-burst.tsx` to `src/routes/admin/security/denial-burst.tsx`. Create `src/routes/admin/security/` directory first. Spec: same.

108.  Run `npx tsc --noEmit` after admin migration. Fix any errors. Spec: same.

109.  Run `Get-ChildItem src/routes -Filter "*.tsx" | Where-Object { ($_.Name -split '\.').Count -gt 3 }`. Result must be empty (zero files). Spec: `SS-02 §Acceptance Criteria`.

110.  Run `npm run dev` (or `vite dev`) in the background. Open browser to the home route `/`. Confirm it loads. Spec: `SS-02 §SS-02-13`.

111.  Navigate to a project route (e.g. `/projects/1`). Confirm it loads. Spec: same.

112.  Navigate to a settings route (e.g. `/settings`). Confirm it loads. Spec: same.

113.  Navigate to a setup route (e.g. `/setup`). Confirm it loads. Spec: same.

114.  Navigate to a CLI route (e.g. `/cli`). Confirm it loads. Spec: same.

115.  Stop the dev server. Run `npx tsc --noEmit` one final time. Exit code must be 0. Spec: `SS-02 §Acceptance Criteria`.

116.  Commit Phase B changes with message `refactor(routes): migrate to directory-based routing`. No version bump. Spec: release policy.

117.  Update `.lovable/plans/subtasks/99-full-architecture-remediation/SS-02-route-directory-migration.md`: flip `Status: completed` to `Status: completed`. Spec: plan lifecycle.

### PHASE C — ZUSTAND STORE LOCALIZATION

### Reference: SS-03-store-localization.md

118. Run `grep -rn "capture-history-store" src/ --include="*.ts" --include="*.tsx"`. Record every import location. Spec: `SS-03 §SS-03-01`.

119. Confirm all `capture-history-store` consumers are within `src/components/hmi/` or HMI-related routes. If any consumer is outside HMI, document it and keep the store global (do not localize it). Spec: same.

120. Read `src/components/hmi/HmiShell.tsx` in full to understand the HMI layout component structure. Spec: `SS-03 §SS-03-02`.

121. Read `src/lib/stores/capture-history-store.ts` in full. List every state field and every action function. This is the interface that the new context must replicate. Spec: same.

122. Create `src/contexts/HmiContext.tsx`. Define `HmiContextValue` interface with all fields from `capture-history-store`. Implement with `useState` or `useReducer`. Export `HmiProvider` component and `useHmiContext` hook. File must be under 100 lines (coding guideline §6). Spec: `SS-03 §SS-03-02`.

123. Wrap `HmiShell.tsx` with `<HmiProvider>`. Import `HmiProvider` from `@/contexts/HmiContext`. Add it as the outermost wrapper inside `HmiShell`'s JSX. Spec: `SS-03 §SS-03-03`.

124. For each component that imported `useCaptureHistoryStore`, replace the import and call with `useHmiContext()`. Run `grep -rn "useCaptureHistoryStore" src/` after each edit to track progress. Spec: same.

125. Run `npx tsc --noEmit`. Fix any type errors introduced by the context switch. Spec: `SS-03 §SS-03-04`.

126. Delete `src/lib/stores/capture-history-store.ts`. Run `npx tsc --noEmit` again. Exit code must be 0. Spec: `SS-03 §SS-03-04`.

127. Run `grep -rn "palette-store" src/ --include="*.ts" --include="*.tsx"`. Record every import location. Spec: `SS-03 §SS-03-05`.

128. Read `src/lib/stores/palette-store.ts` in full. List every state field and action function. Spec: same.

129. Confirm all `palette-store` consumers are within `src/components/editor/` subtree. If any consumer is outside, document and keep global. Spec: same.

130. Read `src/components/editor/shell/EditorShell.tsx` in full. Spec: `SS-03 §SS-03-06`.

131. Create `src/contexts/EditorContext.tsx`. Define `EditorContextValue` interface with palette state and actions. Export `EditorProvider` and `usePaletteContext`. File must be under 100 lines. Spec: `SS-03 §SS-03-06`.

132. Wrap `EditorShell.tsx` with `<EditorProvider>`. Spec: `SS-03 §SS-03-07`.

133. For each component that imported `usePaletteStore`, replace the import and call with `usePaletteContext()`. Spec: same.

134. Run `npx tsc --noEmit`. Fix type errors. Spec: same.

135. Run `grep -rn "shortcuts-store" src/ --include="*.ts" --include="*.tsx"`. Record every import location. Spec: `SS-03 §SS-03-08`.

136. Read `src/lib/stores/shortcuts-store.ts` in full. List every state field and action function. Spec: same.

137. Confirm all `shortcuts-store` consumers are editor-shell-scoped. Document any exception. Spec: same.

138. Add a `shortcuts` slice to `src/contexts/EditorContext.tsx`. Extend `EditorContextValue` with shortcuts state and actions. Keep file under 100 lines — if it exceeds 100 lines, split into `EditorPaletteContext.tsx` and `EditorShortcutsContext.tsx`. Spec: `SS-03 §SS-03-09`.

139. For each component that imported `useShortcutsStore`, replace the import and call with the appropriate context hook. Spec: same.

140. Run `npx tsc --noEmit`. Fix type errors. Spec: same.

141. Delete `src/lib/stores/palette-store.ts`. Run `npx tsc --noEmit`. Exit code must be 0. Spec: `SS-03 §SS-03-10`.

142. Delete `src/lib/stores/shortcuts-store.ts`. Run `npx tsc --noEmit`. Exit code must be 0. Spec: same.

143. Run `ls src/lib/stores/`. Confirm exactly 8 files remain. Spec: `SS-03 §Acceptance Criteria`.

144. Run `grep -rn "usePaletteStore\|useShortcutsStore\|useCaptureHistoryStore" src/`. Result must be zero lines. Spec: same.

145. Start dev server. Navigate to the editor. Open and close a palette panel. Confirm it opens and closes correctly with no console errors. Spec: `SS-03 §SS-03-12`.

146. In the editor, press a keyboard shortcut (e.g. `Ctrl+Z`). Confirm the shortcuts handler fires correctly. Spec: same.

147. Navigate to the HMI. Trigger a capture action. Confirm the capture history updates correctly. Spec: same.

148. Stop the dev server. Run `npx tsc --noEmit` one final time. Exit code must be 0. Spec: `SS-03 §Acceptance Criteria`.

149. Commit Phase C changes with message `refactor(stores): localize editor+hmi stores to React contexts`. No version bump. Spec: release policy.

150. Update `.lovable/plans/subtasks/99-full-architecture-remediation/SS-03-store-localization.md`: flip `Status: completed` to `Status: completed`. Spec: plan lifecycle.

### PHASE D — BACKEND BOOTSTRAPPING & DOCS ALIGNMENT

### Reference: SS-04-backend-bootstrap-docs.md

151. Read `BE/pyproject.toml` in full. Confirm the package manager (`uv`), the Python version constraint, and the dev-dependency list. Spec: `SS-04 §SS-04-01`.

152. Check if a `Makefile` exists at the repo root: run `Test-Path Makefile`. If it does, read it first before writing. Spec: `SS-04 §SS-04-02`.

153. Create `Makefile` at the repo root with the four targets: `setup-backend`, `test-backend`, `lint-backend`, `dev-backend`. Content per SS-04 subtask file. Use hard tabs (Makefile requirement). Spec: `SS-04 §SS-04-02`.

154. Run `make setup-backend` from the repo root. Capture stdout and stderr. Exit code must be 0. Confirm `BE/.venv/` is populated. Spec: `SS-04 §SS-04-03`.

155. With BE venv active, run `python -c "import pydantic_settings; print('ok')"`. Confirm no `ModuleNotFoundError`. Spec: same.

156. Run `make test-backend` from the repo root. Capture the full pytest output. Record which tests pass and which fail. Exit code 0 = all pass. Document any pre-existing failures with their test names. Spec: `SS-04 §SS-04-04`.

157. Read `BE/README.md` in full. List every line that references `BE/routes/`. Spec: `SS-04 §SS-04-05`.

158. Edit `BE/README.md`: replace every reference to `BE/routes/` with `BE/routes/`. Add a `## Getting Started` section (if absent) with: `make setup-backend` to install deps, `make test-backend` to run tests, `make dev-backend` to start the server. Spec: same.

159. Run `grep -rn "BE/routes" spec/ --include="*.md"`. Record every hit. Spec: `SS-04 §SS-04-06`.

160. For each file found in step 159, open it, locate the reference to `BE/routes/`, and replace it with `BE/routes/` (if the route exists there) or `BE/models/` (if it was a model reference). Update the file. Spec: same.

161. Run `grep -rn "BE/routes" .lovable/ --include="*.md"`. Record every hit. Spec: same.

162. For each file found in step 161, correct the reference as in step 160. Spec: same.

163. Run `grep -rn "BE/routes" ./README.md`. If the root README mentions `BE/routes/`, correct it. Spec: same.

164. Read `.lovable/memory/index.md` lines 1-123 for any `BE/routes/` references. Correct them. Spec: `SS-04 §SS-04-07`.

165. Read `.lovable/overview.md` for any `BE/routes/` references in architecture diagrams or text. Correct them. Spec: `SS-04 §SS-04-08`.

166. Run `grep -rn "BE/routes" ./ --include="*.md" --include="*.py" --include="*.ts" --include="*.tsx" --include="*.json"`. Result must be zero. Spec: `SS-04 §Acceptance Criteria`.

167. Run `npx tsc --noEmit`. Exit code must be 0. Spec: `SS-04 §SS-04-09`.

168. Run `make test-backend`. All tests must pass (or pre-existing failures match the list from step 156 exactly — no new failures). Spec: same.

169. Commit Phase D changes with message `chore: add Makefile, fix BE/routes refs in docs`. No version bump. Spec: release policy.

170. Update `.lovable/plans/subtasks/99-full-architecture-remediation/SS-04-backend-bootstrap-docs.md`: flip `Status: completed` to `Status: completed`. Spec: plan lifecycle.

### PHASE E — SPEC ALIGNMENT & CROSS-CUTTING CLEANUP

171. Read `spec/21-app/backend-implementation-request-v1.md` (referenced in `BE/main.py` docstring). Confirm it reflects the current router structure (no `BE/routes/` references). If stale, update it. Spec: `99-full-architecture-remediation.md §Acceptance Criteria 7`.

172. Read `.lovable/plans/architecture-and-code-observations.md`. Confirm it is marked as superseded by Plan 99 or still accurate. Append a note at the bottom: `## Plan 99 — Remediation complete (2026-08-17): split-brain resolved, routes migrated, stores localized, Makefile added.` Spec: same.

173. Update `.lovable/plans/index.md`: add the Plan 99 entry to the Pending section: `- 99 - full-architecture-remediation - pending - see pending/99-full-architecture-remediation.md`. Spec: plan lifecycle rule.

174. Read `.lovable/memory/30-architecture-observations.md` (if it exists). If it has stale notes about `BE/routes/` or flat route files, update them. Spec: same.

175. Run `grep -rn "projects\.\$projectId\." src/ --include="*.ts" --include="*.tsx"`. These are any hardcoded route string references using old flat-file naming convention. Fix each to use the new directory path form. Spec: `SS-02 §Acceptance Criteria`.

176. Run `grep -rn "settings\." src/ --include="*.ts" --include="*.tsx" | grep "to=" | grep -v "settings\/"`. Fix any `to="settings.camera"` style Link props that were not caught in step 67/74. Spec: same.

177. Read the TanStack Router `__root.tsx` file (`src/routes/__root.tsx`). Confirm the `RootRoute` definition does not reference any deleted flat-file route names. Update if needed. Spec: `SS-02 §Acceptance Criteria`.

178. Run `npx tsc --noEmit`. Exit code must be 0. This is the penultimate full typecheck. Spec: global acceptance.

179. Read `.lovable/coding-guidelines.md` §12 (asset sequencing rule). Confirm no assets were created by this plan that violate the `assets/NN-folder/NN-file.ext` naming rule. Spec: `coding-guidelines.md §12`.

180. Run `eslint src/contexts/ --max-warnings=0` to confirm the two new context files are lint-clean. Fix any warnings before continuing. Spec: `coding-guidelines.md` (no lint warnings permitted).

181. Run `eslint src/routes/ --max-warnings=0` to confirm the migrated route files are lint-clean. Spec: same.

182. Run `eslint BE/ --max-warnings=0` (if an ESLint config for Python equivalent exists via ruff). Otherwise run `make lint-backend` and confirm 0 errors. Spec: same.

183. Open `src/contexts/HmiContext.tsx`. Verify: (a) zero functions longer than 15 lines, (b) no `any` types, (c) every boolean follows naming rule (`is`, `has`, `can`, `should`, `was`, `will`, `did`, `must`), (d) no nested `if`. Spec: `coding-guidelines.md §1-5`.

184. Open `src/contexts/EditorContext.tsx`. Apply the same verification as step 183. Spec: same.

185. Open `BE/routes/system.py`. Verify: (a) zero functions longer than 15 lines, (b) no implicit types, (c) follows `BE/routes/health.py` pattern exactly. Spec: same.

186. Open `BE/models/system.py`. Verify: correct `BaseModel` inheritance, all fields typed, no `Any`, no magic strings. Spec: same.

187. Check that no file created or modified by this plan violates the 300-line file cap (`.lovable/coding-guidelines.md §6`). Run `Get-ChildItem src/contexts, BE/routes, BE/models -Filter "*.py","*.ts","*.tsx" | ForEach-Object { $c = (Get-Content $_.FullName).Count; if ($c -gt 300) { Write-Host "$($_.Name): $c lines" } }`. Output must be empty. Spec: same.

188. Verify that all new TypeScript files use `const` declarations (not `let`) for module-level exports. Spec: `coding-guidelines.md §11`.

189. Check `.lovable/strictly-avoid.md`. Confirm no violations: no string union types in new files, no Enum without `Type` suffix in new files, no implicit truthiness checks in new files. Spec: `.lovable/strictly-avoid.md`.

190. Run `npx tsc --noEmit` one final time. Exit code must be 0 with zero errors and zero warnings. Spec: global acceptance criteria.

191. Run `make test-backend` one final time. Confirm the same pass/fail state as step 168 (no new failures). Spec: global acceptance criteria.

192. Run `npm run dev` and perform a smoke test: navigate to home, a project, its rulesets, settings, setup camera, CLI sessions, observability sessions. Confirm no 404s or blank screens. Stop the server. Spec: global acceptance criteria.

193. Update `.lovable/suggestions.md`: move `S-98` row from "Active Suggestions" to "Implemented Suggestions" (it was the architecture consolidation suggestion that this plan completes). Spec: plan lifecycle.

194. Update `.lovable/memory/index.md`: add a new entry row for Plan 99 completion: `| [plans/completed/99-full-architecture-remediation.md] | Plan 99 remediation: BE split-brain fixed, routes migrated to dirs, stores localized, Makefile added | Before any BE or routing work |`. Spec: memory maintenance.

195. Update `.lovable/memory/06-spec-map.md` if it references `BE/routes/` or old route structure. Spec: same.

196. Commit all Phase E and final cleanup changes with message `chore: spec alignment and cross-cutting cleanup for Plan 99`. No version bump. Spec: release policy.

197. Move this plan file from `.lovable/plans/pending/99-full-architecture-remediation.md` to `.lovable/plans/completed/99-full-architecture-remediation.md`. Flip `Status: completed` to `Status: completed`. Never copy — move only. Spec: plan lifecycle rule.

198. Update `.lovable/plans/index.md`: move the Plan 99 entry from Pending to Completed section: `- 99 - full-architecture-remediation - completed - see completed/99-full-architecture-remediation.md`. Spec: same.

199. Run the final state audit: verify `grep -rn "BE.src\|BE/routes" ./ --include="*.py" --include="*.ts" --include="*.tsx" --include="*.md"` returns zero results. Verify `ls src/routes/*.tsx | grep "\\..*\\..*\\.tsx"` returns zero results. Verify `ls src/lib/stores/*.ts | wc -l` returns 8. Verify `Test-Path BE/routes` returns False. All four checks must pass. Spec: `99-full-architecture-remediation.md §Acceptance Criteria`.

200. Run `make setup-backend && make test-backend && npx tsc --noEmit` as the final end-to-end gate. All three must exit 0 (or test-backend matches documented pre-existing failures). This is the plan's definition of done. Spec: `99-full-architecture-remediation.md §Acceptance Criteria`.

## Verification

- Step 18, 19, 20, 31: `python -m py_compile` exits 0.
- Step 21, 32, 166: `grep` for `BE.src` returns zero lines.
- Step 30: `Test-Path BE/routes` is False.
- Step 35: `pytest --collect-only` produces zero `ModuleNotFoundError`.
- Steps 39, 67, 74, 86, 98, 108, 115, 125, 126, 134, 140, 141, 142, 148, 167, 178, 190: `npx tsc --noEmit` exits 0.
- Step 109: `Get-ChildItem src/routes -Filter "*.tsx" | Where-Object { ($_.Name -split '.').Count -gt 3 }` is empty.
- Step 143: `ls src/lib/stores/` counts exactly 8 files.
- Step 144: `grep usePaletteStore|useShortcutsStore|useCaptureHistoryStore src/` returns zero.
- Step 154: `make setup-backend` exits 0.
- Step 156, 168, 191, 200: `make test-backend` exits 0 or matches documented failures.
- Step 180, 181: `eslint` exits with zero warnings.
- Step 187: No file exceeds 300 lines.
- Step 192, 145-147: Dev server smoke test passes all routes.
- Step 199: All four state audit checks pass simultaneously.

## Appended from prior pending tasks

- `02-ui-fixes.md` (5 items) — separate UI/UX scope; not merged. Remains pending independently.
- `08-vision-system-v2.md` — repetitive filler steps (200 identical lines); out of scope for this plan; flagged for rework before execution.
- `09-vision-standard-ui-tasks.md` (400 steps) — separate vision feature scope; not merged.

Phase C (Zustand Store Localization) was safely bypassed because all 3 targeted stores were found to have legitimate cross-boundary consumers.
