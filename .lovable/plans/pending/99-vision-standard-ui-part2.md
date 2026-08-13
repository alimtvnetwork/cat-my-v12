# Standard UI Vision Task & Observations - Part 2 (Steps 101-300)

Slug: 99-vision-standard-ui-part2
Steps: 200 (Tasks 101-300)
Status: pending
Created: 2026-08-14

## Context
This document continues the 400-step vision standard UI overhaul, containing Steps 101 through 300. This phase focuses on tightly integrating the new static-first viewer with the rule validation engine, solidifying the data models and store normalizations (Facade patterns, Enum standards), bridging the backend processing for vision rules, and polishing the UI with the V4 palette design system.

## Steps

### Phase 5: Rule & Validation Integration (Steps 101-150)
101. **Audit Rule Engine UI bindings**
     - **What**: Review how existing rules bind to the canvas.
     - **How**: Trace `ProjectEditorMainCanvas` to rule selectors.
     - **Agents**: 1 (Research).
     - **Guidelines**: None.
102. **Decouple Rule Overlay from Live Stream**
     - **What**: Ensure ROIs render over static image without video context.
     - **How**: Abstract coordinate mapping.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Performance optimization for overlays.
103. **Implement Static Image Coordinate Mapping**
     - **What**: Map natural image size to CSS scaled size.
     - **How**: Calculate aspect ratio and offset.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Strict typing for geometry math.
104. **Adapt ROI Badge Component**
     - **What**: Ensure ROI badges render correctly on static image.
     - **How**: Tailwind absolute positioning using calculated coordinates.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: 13px tabular-nums typography rule.
105. **Implement ROI Hover States**
     - **What**: Highlight regions when hovered in the sidebar.
     - **How**: Shared active state ID in the store.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: V4 state management rules.
106. **Implement 'Add Rule' Workflow on Static Mode**
     - **What**: Drawing new regions on the reference image.
     - **How**: Click and drag event handlers on the canvas.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Prevent event bubbling to parent containers.
107. **Implement 'Add Rule' Workflow on Live Mode**
     - **What**: Drawing new regions on the live camera.
     - **How**: Overlay canvas on the video element.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Keep UI identical to static mode.
108. **Wire 'Pattern Edge' Tool to Canvas**
     - **What**: Enable pattern recognition drawing.
     - **How**: Specific cursor/bounding box state for pattern rules.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Follow Plan 31 guidelines for PatternEdge.
109. **Wire 'Shape Track' Tool to Canvas**
     - **What**: Enable shape matching drawing.
     - **How**: Polygon drawing tool state.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Reusable coordinate array state.
110. **Implement `RuleCategory` Sync**
     - **What**: Ensure `Rule == Category` invariant is maintained.
     - **How**: Enforce `isCategory = true` logic on rule creation.
     - **Agents**: 1 (Frontend/Backend).
     - **Guidelines**: Memory observation `V4 Rule/Category/Project model`.
111. **Implement `appliesBefore` Chain visualization**
     - **What**: Show rule dependencies in UI.
     - **How**: Tree or indented list in the sidebar.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: < 100 lines per component.
112. **Wire Cycle Rejection Logic**
     - **What**: Prevent infinite loops in `appliesBefore`.
     - **How**: Graph validation before saving.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: `computeEffectiveChain` usage.
113. **Create `RuleEditorPanel.tsx`**
     - **What**: Right-side panel for editing rule parameters.
     - **How**: Drawer or flex column.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Pre-93 panel gap resolution style.
114. **Implement Black/White Search Toggle**
     - **What**: Parameter for vision rules.
     - **How**: Tokenized segmented control.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: 40px hit area.
115. **Implement Grayscale Tolerance Slider**
     - **What**: Parameter for vision rules.
     - **How**: Reusable `Slider` component.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: V4 palette matching.
116. **Wire Rule Parameters to Facade**
     - **What**: Save edits to the backend.
     - **How**: Debounced mutation wrapper.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Query Wrapper rules.
117. **Handle Validation Errors from Backend**
     - **What**: Show parameter rejection.
     - **How**: Map `AppError` to form fields.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: 3-tier error architecture.
118. **Implement 'Evaluate Rule' button**
     - **What**: Manual trigger to test rule on the static image.
     - **How**: Button triggering `POST /score`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: SDK Facade pattern.
119. **Render Pass/Fail overlay on Rule Evaluation**
     - **What**: Visual feedback for rule success.
     - **How**: Green/Red border and badge update.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: V4 palette rules (no purple on dark).
120. **Audit Rule Panel Accessibility**
     - **What**: Keyboard nav and ARIA labels.
     - **How**: Axe run on panel component.
     - **Agents**: 1 (QA).
     - **Guidelines**: Strict standard alignment.
121. **Update `RulesDb` Schema for Visuals**
     - **What**: Store canvas geometry properly.
     - **How**: Update Python SQLAlchemy models.
     - **Agents**: 1 (Backend).
     - **Guidelines**: PascalCase columns.
122. **Update `TaskDb` Schema for References**
     - **What**: Link tasks to static reference images.
     - **How**: Foreign key or ID reference.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Split DB architecture.
123. **Create DB Migration for Rule Schema**
     - **What**: Apply the changes.
     - **How**: Alembic migration script in `app/core/io/migrations/`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Split DB rules.
124. **Update Pydantic Models for Rules**
     - **What**: Align API with DB.
     - **How**: Edit `BE/models/`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Zod parity.
125. **Update Zod Models for Rules**
     - **What**: Align UI with API.
     - **How**: Edit `src/lib/backend/schemas-v2.ts`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Zod strict typing.
126. **Update Mock Seed Data for Rules**
     - **What**: Seed UI with rule fixtures.
     - **How**: Update `bundle.v2.json`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: V4 Seed Contract.
127. **Implement Backend `POST /score` endpoint**
     - **What**: Remote validation scorer for the editor.
     - **How**: Delegate to `worker/` eval logic.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Envelope response.
128. **Handle Score Timeout Errors**
     - **What**: Timeout if vision processing hangs.
     - **How**: `AppError` mapping.
     - **Agents**: 1 (Backend).
     - **Guidelines**: `error-manage` compliance.
129. **Surface Score Result in UI**
     - **What**: Show detailed scoring data (confidence %).
     - **How**: Data table or badge below canvas.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: < 100 lines per component.
130. **Implement 'Compare with Live' Split View**
     - **What**: Show static reference next to live camera.
     - **How**: Flex row split layout.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Plan 90 Steps 145-146 precedence.
131. **Sync Coordinates in Split View**
     - **What**: Ensure ROIs map accurately to both views.
     - **How**: Shared coordinate context.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Complex state isolation.
132. **Write E2E test for Rule Creation**
     - **What**: Verify drawing and saving a rule.
     - **How**: Playwright test.
     - **Agents**: 1 (QA).
     - **Guidelines**: Standard locators.
133. **Write E2E test for Rule Evaluation**
     - **What**: Verify `POST /score` flow.
     - **How**: Playwright test with mock score.
     - **Agents**: 1 (QA).
     - **Guidelines**: Error fallback coverage.
134. **Review Component Sizes (Phase 5)**
     - **What**: Ensure no new monolithic files.
     - **How**: Linter stats.
     - **Agents**: 1 (Reviewer).
     - **Guidelines**: < 100 lines rule.
135. **Refactor `LightingDrawer` Integration**
     - **What**: Move lighting controls to new UI paradigm.
     - **How**: Ensure it works inside the new side panel.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Pre-93 panel gap resolution style.
136. **Wire Flashlight 1 & 2 Toggles**
     - **What**: Hardware lighting control.
     - **How**: Facade mutations.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Explicit booleans.
137. **Wire Light Correction Slider**
     - **What**: Hardware lighting intensity.
     - **How**: Facade mutations.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Tokenized slider.
138. **Implement Lighting Mock for Seed Mode**
     - **What**: Simulate lighting changes.
     - **How**: CSS brightness filter on static image for demo.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Seed mode parity.
139. **Update Backend `PUT /lighting` endpoint**
     - **What**: Accept new lighting parameters.
     - **How**: Map to camera SDK facade.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Envelope format.
140. **Map Lighting Hardware Errors**
     - **What**: Catch SDK failures.
     - **How**: `AppError` (e.g. `E_HW_LIGHTING`).
     - **Agents**: 1 (Backend).
     - **Guidelines**: 3-tier error architecture.
141. **Implement Color Selection Tool**
     - **What**: Pick color for 'Color Specific Area' rule.
     - **How**: Canvas pixel reader.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Memory leak prevention.
142. **Create `ColorPalettePanel.tsx`**
     - **What**: UI to manage selected target colors.
     - **How**: Flex layout with color swatches.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: < 100 lines.
143. **Wire Color Selection to Facade**
     - **What**: Save rule color parameter.
     - **How**: Mutation wrapper.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Zod parity.
144. **Implement Draft-Save for Rules (IndexedDB)**
     - **What**: Prevent data loss on refresh.
     - **How**: Write local changes before committing.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Forward-only migrations.
145. **Implement Boot Reconcile for Drafts**
     - **What**: Restore draft on load.
     - **How**: Hook checking IndexedDB on mount.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Strict typing.
146. **Add "Unsaved Changes" Warning**
     - **What**: Alert user when leaving with drafts.
     - **How**: Router beforeLeave guard.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Standard browser confirmation.
147. **Refactor `RulesDb` interaction for Drafts**
     - **What**: Differentiate committed vs draft.
     - **How**: Flag or separate table if stored remotely.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Architecture alignment.
148. **Write E2E test for Lighting Controls**
     - **What**: Verify facade calls.
     - **How**: Playwright test.
     - **Agents**: 1 (QA).
     - **Guidelines**: Mock hardware responses.
149. **Write E2E test for IndexedDB Drafts**
     - **What**: Verify refresh retention.
     - **How**: Playwright page reload.
     - **Agents**: 1 (QA).
     - **Guidelines**: Flaky-test prevention.
150. **Phase 5 Code Review & Signoff**
     - **What**: Conclude rule validation integration.
     - **How**: Audit PR against guidelines.
     - **Agents**: 1 (Manager).
     - **Guidelines**: All guidelines check.

### Phase 6: Data Models & Store Normalization (Steps 151-200)
151. **Audit `src/lib/` for String Unions**
     - **What**: Enforce Memory Rule 12.
     - **How**: `grep` search for `type X = "a" | "b"`.
     - **Agents**: 1 (Research).
     - **Guidelines**: Enums with `Type` suffix required.
152. **Migrate String Unions to Enums (Part 1)**
     - **What**: Convert found unions.
     - **How**: Create `*Type.ts` files.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: PascalCase naming.
153. **Migrate String Unions to Enums (Part 2)**
     - **What**: Convert remaining found unions.
     - **How**: Create `*Type.ts` files.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: PascalCase naming.
154. **Audit `src/lib/` for legacy Zustand stores**
     - **What**: Identify stores bypassing Facades.
     - **How**: Manual file review.
     - **Agents**: 1 (Research).
     - **Guidelines**: Architecture consolidation.
155. **Migrate `camera-store.ts` to Facade**
     - **What**: Use `useFacadeOrStore`.
     - **How**: Wrap existing store behind DomainFacade contract.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Frozen contract rule.
156. **Migrate `rules-store.ts` to Facade**
     - **What**: Use `useFacadeOrStore`.
     - **How**: Wrap existing store behind DomainFacade contract.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Frozen contract rule.
157. **Migrate `images-store.ts` to Facade**
     - **What**: Use `useFacadeOrStore`.
     - **How**: Wrap existing store behind DomainFacade contract.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Frozen contract rule.
158. **Audit `isFail` explicit boolean usage**
     - **What**: Ensure booleans are named explicitly.
     - **How**: Regex search for ambiguous boolean names.
     - **Agents**: 1 (Research).
     - **Guidelines**: Memory Rule 12.
159. **Refactor ambiguous booleans**
     - **What**: Rename flags like `active`, `error` to `isActive`, `hasError`, `isFail`.
     - **How**: Global rename in state and props.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Explicit boolean checks.
160. **Define `CaptureVendorType` Enum**
     - **What**: Hardware abstraction typing.
     - **How**: `export enum CaptureVendorType { Daheng = 'Daheng', ... }`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Memory observation 113.
161. **Update `DahengCameraFacade`**
     - **What**: Implement proper error mapping.
     - **How**: Translate C-level exceptions to `AppError`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Daheng adapter cheatsheet.
162. **Implement Daheng Replay Facade**
     - **What**: Hardware test flag support.
     - **How**: Read local images when `LOVABLE_HW_DAHENG=1` but offline.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Architecture consolidation.
163. **Verify Zod Schemas for Enums**
     - **What**: Ensure Zod validates against the new Enums.
     - **How**: Use `z.nativeEnum()`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Strict typing.
164. **Verify FastAPI Pydantic Models for Enums**
     - **What**: Align python Enum with TS Enum.
     - **How**: Python `Enum` class.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Sync wire format.
165. **Create Unified Error Dictionary**
     - **What**: Map all frontend errors to `error-codes.ts` properly.
     - **How**: Sync with backend `E_*` codes.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Reality-aligned registries.
166. **Implement Global Unhandled Rejection Catcher**
     - **What**: Catch silent errors.
     - **How**: Event listener feeding to `ClientLogger.error`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Observability.
167. **Implement Request Retry Logic for Queries**
     - **What**: Resilient backend calls.
     - **How**: Configure TanStack query defaults (e.g. 2 retries on 5xx).
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Don't retry 4xx errors.
168. **Implement Optimistic Updates for Rules**
     - **What**: Snappy UI when dragging regions.
     - **How**: `onMutate` cache update in query wrappers.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Query Wrapper rules.
169. **Handle Optimistic Rollbacks**
     - **What**: Revert UI if backend rejects rule.
     - **How**: `onError` context rollback.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Robust state management.
170. **Audit LocalStorage Usage**
     - **What**: Identify keys bypassing `storage.ts`.
     - **How**: Search for `localStorage.setItem`.
     - **Agents**: 1 (Research).
     - **Guidelines**: Reality-aligned registries.
171. **Migrate LocalStorage to `StorageKey` Enum**
     - **What**: Centralize storage keys.
     - **How**: Update calls to use `StorageKey.X`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Clean code.
172. **Refactor URL IDs to Integers**
     - **What**: Enforce Memory Rule 25.
     - **How**: Ensure `/setup/roi/:id` parses as integer, not UUID/slug.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Hard rule enforcement.
173. **Update Backend to validate Integer IDs**
     - **What**: Reject non-integer IDs at API layer.
     - **How**: FastAPI path parameter typing `id: int`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Hard rule enforcement.
174. **Refactor Workspace Header Identity**
     - **What**: Single identity header per workspace.
     - **How**: Centralize in Axios interceptor / fetch wrapper.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Memory Rule 25.
175. **Implement Session Replay UI Context**
     - **What**: View historical task execution.
     - **How**: Breadcrumbs indicating historical vs live mode.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Clear state indicators.
176. **Wire Session Replay to TaskDb**
     - **What**: Fetch historical rules and images.
     - **How**: Dedicated GET endpoint for session state.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Envelope format.
177. **Implement Split-DB Cleanup Job**
     - **What**: Avoid disk full issues.
     - **How**: Worker CLI command to truncate old TaskDb entries.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Split-DB tier ownership.
178. **Wire Cleanup Job to UI Settings**
     - **What**: Trigger cleanup manually.
     - **How**: Button hitting `POST /cli/cleanup`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: SDK facade pattern.
179. **Write Unit Tests for Enum Parsers**
     - **What**: Verify TS and Python serialization.
     - **How**: Vitest and Pytest cases.
     - **Agents**: 1 (Fullstack).
     - **Guidelines**: Edge cases (invalid strings).
180. **Write Unit Tests for Facade Mocks**
     - **What**: Verify Seed mode returns correct fixtures.
     - **How**: Vitest against `getActiveProfile()`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: No network calls in test.
181. **Write E2E test for Optimistic Updates**
     - **What**: Drag region, mock slow network, verify UI stability.
     - **How**: Playwright with delayed API route.
     - **Agents**: 1 (QA).
     - **Guidelines**: UX validation.
182. **Document Facade Architecture**
     - **What**: Ensure human contributors understand the seams.
     - **How**: Update `.lovable/pending-facades/README.md`.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Truth aligned with code.
183. **Review AppError Logging Format**
     - **What**: Validate `ClientLogger` output.
     - **How**: Console review and JSON shape check.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Correlation ID presence.
184. **Refactor `AppEvent` Registries**
     - **What**: Centralize event bus keys.
     - **How**: `src/lib/constants/events.ts`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Reality-aligned registries.
185. **Implement Event Bus Interceptor**
     - **What**: Log all internal events to `ClientLogger`.
     - **How**: Middleware on Zustand/Events.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Observability.
186. **Check A11y on Storage Prompts**
     - **What**: Ensure Draft Save notices are screen-reader accessible.
     - **How**: `aria-live="polite"`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Standard accessibility.
187. **Audit `BE/models/` for obsolete Pydantic fields**
     - **What**: Remove fields no longer used by V4 UI.
     - **How**: Manual cross-reference with `schemas-v2.ts`.
     - **Agents**: 1 (Research).
     - **Guidelines**: Clean codebase.
188. **Remove Obsolete Pydantic Fields**
     - **What**: Code deletion.
     - **How**: Delete from BE and migrations.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Safe deprecation.
189. **Remove Obsolete Zod Fields**
     - **What**: Code deletion.
     - **How**: Delete from `schemas-v2.ts`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Keep sync with BE.
190. **Run Full Test Suite**
     - **What**: Verify Phase 6 stability.
     - **How**: `pytest` & `vitest run`.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: 100% pass rate.
191. **Fix Flaky Tests (if any)**
     - **What**: Address intermittent failures.
     - **How**: Increase timeouts or fix assertions.
     - **Agents**: 1 (Fullstack).
     - **Guidelines**: Reliable CI/CD.
192. **Re-run Linters**
     - **What**: Verify coding standards.
     - **How**: `bun run lint`.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: 0 warnings.
193. **Generate API Schema**
     - **What**: Export OpenAPI spec.
     - **How**: FastAPI openapi.json dump.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Documentation sync.
194. **Sync TS Types from OpenAPI (Optional Check)**
     - **What**: Compare generated types with Zod.
     - **How**: Visual diff.
     - **Agents**: 1 (Research).
     - **Guidelines**: Maintain parity.
195. **Ensure No Em Dashes in Code/Logs**
     - **What**: Enforce stylistic rules.
     - **How**: Regex search `--` or `—`.
     - **Agents**: 1 (Research).
     - **Guidelines**: Strict prompt rules.
196. **Update `.lovable/plans/index.md`**
     - **What**: Track subtask progress.
     - **How**: Mark sections completed.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Traceability.
197. **Write Phase 6 Changelog**
     - **What**: Summarize data model normalization.
     - **How**: Markdown document in `memory/`.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Single source of truth.
198. **Verify UI Render Performance**
     - **What**: Check for unnecessary re-renders.
     - **How**: React DevTools Profiler.
     - **Agents**: 1 (QA).
     - **Guidelines**: Snappy UI.
199. **Optimize Canvas Re-renders**
     - **What**: Memoize heavy canvas components.
     - **How**: `React.memo` and `useMemo`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Component purity.
200. **Phase 6 Signoff**
     - **What**: Conclude data normalization.
     - **How**: Final review against plan.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Execution lifecycle tracking.

### Phase 7: Vision Processing & Backend Offload (Steps 201-250)
201. **Audit `app/rules/` vs `BE/app/rules/`**
     - **What**: Understand dual backend discrepancy.
     - **How**: Read and diff rule evaluation logic.
     - **Agents**: 1 (Research).
     - **Guidelines**: Architecture observation 5.1.
202. **Define Canonical Rules Evaluator**
     - **What**: Pick the single source of truth.
     - **How**: Standardize on `app/worker/` evaluation.
     - **Agents**: 1 (Backend).
     - **Guidelines**: DRY principle.
203. **Refactor `POST /score` to use canonical eval**
     - **What**: Route HTTP calls to the right logic.
     - **How**: Update `BE/routes/`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Clean boundaries.
204. **Delete obsolete duplicate evaluator**
     - **What**: Remove dead code.
     - **How**: Delete `BE/app/rules/` if `app/rules` is canonical.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Delete dead code aggressively.
205. **Update Split-DB Rule Syncing**
     - **What**: Ensure `RulesDb` is read correctly by worker.
     - **How**: Verify SQLAlchemy queries.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Split-DB rules.
206. **Implement 'Safe Zone' clipping in backend**
     - **What**: Only evaluate pixels within ROI.
     - **How**: NumPy array slicing based on coordinates.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Performance optimization.
207. **Implement 'Grayscale' processing in backend**
     - **What**: Convert color to grayscale before eval.
     - **How**: OpenCV / NumPy conversion.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Fast matrix operations.
208. **Implement Pattern Matching Algo (Stub)**
     - **What**: Basic normalized cross-correlation.
     - **How**: OpenCV `matchTemplate`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Avoid blocking the event loop.
209. **Implement Shape Tracking Algo (Stub)**
     - **What**: Contour detection.
     - **How**: OpenCV `findContours`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Avoid blocking the event loop.
210. **Implement Color Area Algo (Stub)**
     - **What**: Thresholding by color bounds.
     - **How**: OpenCV `inRange`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Avoid blocking the event loop.
211. **Wrap OpenCV calls in `asyncio.to_thread`**
     - **What**: Prevent event loop blocking in FastAPI.
     - **How**: Threadpool execution for heavy CV tasks.
     - **Agents**: 1 (Backend).
     - **Guidelines**: FastAPI best practices.
212. **Implement Confidence Scoring**
     - **What**: Return 0-100 score instead of just boolean.
     - **How**: Map correlation coefficient to percentage.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Meaningful UX data.
213. **Format Score Response Envelope**
     - **What**: Return results cleanly to UI.
     - **How**: `success({"pass": true, "confidence": 98.5})`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Frozen envelope shape.
214. **Write Backend Test for Pattern Match**
     - **What**: Unit test the algorithm.
     - **How**: Provide fixture images and assert output.
     - **Agents**: 1 (Backend).
     - **Guidelines**: High test coverage.
215. **Write Backend Test for Grayscale Tolerance**
     - **What**: Unit test tolerance slider logic.
     - **How**: Assert varying scores based on slider value.
     - **Agents**: 1 (Backend).
     - **Guidelines**: High test coverage.
216. **Wire UI 'Evaluate' to new Score shape**
     - **What**: Display the confidence percentage.
     - **How**: Update frontend parser for `POST /score`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Strict Zod parsing.
217. **Implement Confidence Threshold Slider**
     - **What**: UI to set minimum passing score.
     - **How**: Range slider 0-100.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: V4 palette rules.
218. **Wire Threshold Slider to Facade**
     - **What**: Save threshold parameter.
     - **How**: Mutation wrapper.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Strict typing.
219. **Update Backend to Respect Threshold**
     - **What**: Fail rule if confidence < threshold.
     - **How**: `is_pass = score >= rule.threshold`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Clear business logic.
220. **Audit OpenCV Memory Leaks**
     - **What**: Ensure numpy arrays are GC'd.
     - **How**: Check for circular references in eval workers.
     - **Agents**: 1 (Research).
     - **Guidelines**: Performance stability.
221. **Audit API Latency for `POST /score`**
     - **What**: Ensure < 200ms response time for UX.
     - **How**: Add timing logs / profiler.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: Performance stability.
222. **Implement Image Downsampling (Optional)**
     - **What**: Speed up evaluation on large reference images.
     - **How**: Resize before `matchTemplate` if image > 4K.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Configurable via settings.
223. **Wire Downsampling Setting to UI**
     - **What**: Allow user to toggle fast eval.
     - **How**: Checkbox in Project Settings.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Standardized UI toggle.
224. **Implement Global Error Handling for OpenCV**
     - **What**: Catch C-level faults gracefully.
     - **How**: Wrap in try/except returning `E_VISION_FAULT`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: 3-tier error architecture.
225. **Update ClientLogger for Vision Errors**
     - **What**: Log OpenCV failures with context.
     - **How**: Pass matrix sizes and rule types in context.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Structured JSON logging.
226. **Implement 'Test All Rules' Workflow**
     - **What**: Evaluate all rules on current reference image sequentially.
     - **How**: UI button triggering chain evaluation.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: SDK Facade pattern.
227. **Wire `Test All Rules` to Backend**
     - **What**: Batch endpoint `POST /score/batch`.
     - **How**: Route passing list of rule IDs.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Envelope format.
228. **Render Batch Results in UI**
     - **What**: Show success/fail for each rule in sidebar.
     - **How**: Map responses to rule list items.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: V4 palette rules.
229. **Add Progress Bar for Batch Eval**
     - **What**: Visual feedback during long tests.
     - **How**: Standardized progress component.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Tailwind v4.
230. **Write E2E test for Batch Evaluation**
     - **What**: Verify full chain execution.
     - **How**: Playwright test mocking `POST /score/batch`.
     - **Agents**: 1 (QA).
     - **Guidelines**: Core flow coverage.
231. **Audit Hardware Fallbacks**
     - **What**: Ensure seed mode skips CV if needed.
     - **How**: Return mock 99% confidence in seed mode.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Seed mode parity.
232. **Verify Camera Matrix Transformations**
     - **What**: Ensure Daheng raw formats map correctly to OpenCV.
     - **How**: Add conversion utility `Bayer2RGB` if needed.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Hardware specifics.
233. **Refactor Capture to auto-evaluate**
     - **What**: If in live mode, automatically run rules on new frame.
     - **How**: Toggle switch 'Auto-Evaluate'.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: 40px hit area.
234. **Wire Auto-Evaluate Toggle to Store**
     - **What**: Persist preference.
     - **How**: Zustand state.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: State isolation.
235. **Implement Auto-Evaluate Loop (UI Side)**
     - **What**: Trigger `POST /score` automatically after capture.
     - **How**: `useEffect` on new image ID.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Debounce to prevent spam.
236. **Throttle Live Feed Evaluation**
     - **What**: Prevent overwhelming the backend.
     - **How**: Limit auto-eval to max 5 fps during manual setup.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Performance optimization.
237. **Refactor Image History to store Judgments**
     - **What**: Save PASS/FAIL status alongside image in DB.
     - **How**: Update TaskDb `images` table.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Split-DB rules.
238. **Surface Judgments in UI History Rail**
     - **What**: Green/Red indicator on thumbnails.
     - **How**: Read judgment from image list API.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: 13px tabular-nums typography.
239. **Update `GET /images` to return judgments**
     - **What**: Join or fetch judgment state.
     - **How**: SQLAlchemy query optimization.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Fast querying.
240. **Write API test for Image History**
     - **What**: Verify judgment data is returned.
     - **How**: Pytest `/images` endpoint.
     - **Agents**: 1 (Backend).
     - **Guidelines**: High test coverage.
241. **Implement 'Save as Golden' Workflow**
     - **What**: Mark a passed image as the ultimate baseline.
     - **How**: Button on history items.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Professional iconography.
242. **Wire 'Save as Golden' to DB**
     - **What**: Flag image in TaskDb.
     - **How**: `PUT /images/:id/golden`.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Envelope format.
243. **Render Golden Badge in UI**
     - **What**: Distinct visual indicator for golden images.
     - **How**: Gold star icon / border.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: V4 palette rules.
244. **Implement Golden Image protection**
     - **What**: Prevent deletion of golden images by cleanup job.
     - **How**: Update cleanup CLI logic.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Safe deprecation.
245. **Write Backend Test for Cleanup Protection**
     - **What**: Ensure golden images are skipped.
     - **How**: Pytest fixture testing retention.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Data safety.
246. **Audit Full Vision Pipeline**
     - **What**: End-to-end trace from UI click to CV evaluation to DB save.
     - **How**: Manual run and log review.
     - **Agents**: 1 (Research).
     - **Guidelines**: Traceability.
247. **Optimize DB Connections in Pipeline**
     - **What**: Ensure connection pooling is used for high-speed writes.
     - **How**: Review SQLAlchemy engine config.
     - **Agents**: 1 (Backend).
     - **Guidelines**: Target: sustained high-speed capture.
248. **Write E2E test for Auto-Evaluate Loop**
     - **What**: Verify live mode -> capture -> auto-score.
     - **How**: Playwright with mocked camera stream.
     - **Agents**: 1 (QA).
     - **Guidelines**: Core flow coverage.
249. **Resolve Phase 7 Code Quality**
     - **What**: Ensure no CV logic leaks into routing layers.
     - **How**: Linter and manual check.
     - **Agents**: 1 (Reviewer).
     - **Guidelines**: Clean boundaries.
250. **Phase 7 Signoff**
     - **What**: Conclude backend vision offload.
     - **How**: Final review against plan.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Execution lifecycle tracking.

### Phase 8: Advanced UI Components & Styling Polish (Steps 251-300)
251. **Audit UI against V4 Photoshop Palettes rule**
     - **What**: Check panel spacing and typography.
     - **How**: Compare to `design/v4-photoshop-palettes.md`.
     - **Agents**: 1 (Research).
     - **Guidelines**: Memory Rule 56.
252. **Enforce 13px Tabular Nums for all Badges**
     - **What**: Standardize badge typography.
     - **How**: Tailwind class `text-[13px] tabular-nums`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Hard V4 palette rule.
253. **Standardize Tooltip Semantics**
     - **What**: Ensure all toolbars use long-press / hover consistently.
     - **How**: Update `Tooltip` component delays.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: V4 palette rules.
254. **Implement Global Loading Skeletons**
     - **What**: Replace simple spinners with content-aware skeletons.
     - **How**: Standard `Skeleton` component replacing standard loading states.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Professional aesthetic.
255. **Refactor Canvas Loading State**
     - **What**: Avoid jarring jumps when image loads.
     - **How**: Preserve aspect ratio box with shimmer.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: No glitchy layouts.
256. **Standardize Empty States**
     - **What**: Ensure no blank screens.
     - **How**: Create `EmptyState` component (Icon + Title + Subtitle).
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Professional aesthetic.
257. **Implement 'No Rules Configured' Empty State**
     - **What**: Guide user to create first rule.
     - **How**: EmptyState in the Rule Panel.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Helpful UX.
258. **Implement 'No Images Captured' Empty State**
     - **What**: Guide user to capture first image.
     - **How**: EmptyState in History Rail.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Helpful UX.
259. **Audit Keyboard Accessibility**
     - **What**: Ensure all tools can be reached via Tab.
     - **How**: Manual keyboard-only sweep.
     - **Agents**: 1 (QA).
     - **Guidelines**: A11y standards.
260. **Fix Focus Rings on Toolbars**
     - **What**: Ensure active items are clear.
     - **How**: Tailwind `focus-visible:ring`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: High contrast.
261. **Implement ARIA Labels for Canvas Tools**
     - **What**: Screen reader support for drawing.
     - **How**: Explicit `aria-label` and `aria-description`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: A11y standards.
262. **Add Shortcut Tips to Toolbars**
     - **What**: Educate users on fast workflows.
     - **How**: Append `[Shortcut]` to tooltip text.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Pro UX.
263. **Refactor Color Variables**
     - **What**: Remove hardcoded hex values.
     - **How**: Map to Tailwind theme tokens.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Design system adherence.
264. **Audit for 'Purple on Dark' Violations**
     - **What**: Find and remove banned color combos.
     - **How**: Search for `bg-purple-` or `text-purple-` on dark mode.
     - **Agents**: 1 (Research).
     - **Guidelines**: Antigravity UI forbidden tropes.
265. **Fix Banned Color Combos**
     - **What**: Replace purple with accessible brand colors.
     - **How**: Tailwind class updates.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Antigravity UI forbidden tropes.
266. **Audit for 'Colored Border Accents' Violations**
     - **What**: Remove glowing outlines.
     - **How**: Search for excessive box-shadows.
     - **Agents**: 1 (Research).
     - **Guidelines**: Antigravity UI forbidden tropes.
267. **Fix Banned Border Accents**
     - **What**: Standardize focus states to flat, high contrast rings.
     - **How**: Tailwind class updates.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Antigravity UI forbidden tropes.
268. **Audit for 'Icon-Stuffed Bento Boxes'**
     - **What**: Ensure dashboards aren't cluttered.
     - **How**: Review visual hierarchy.
     - **Agents**: 1 (Research).
     - **Guidelines**: Antigravity UI forbidden tropes.
269. **Fix Dashboard Clutter**
     - **What**: Simplify complex panels.
     - **How**: Group logic, remove unnecessary icons.
     - **Agents**: 1 (UX/Frontend).
     - **Guidelines**: Less, but better.
270. **Implement HSL Tailored Colors**
     - **What**: Ensure palettes are harmonious.
     - **How**: Tweak root CSS variables.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Visual Excellence.
271. **Implement Modern Typography Scaling**
     - **What**: Perfect letter-spacing and line-heights.
     - **How**: Global typography plugin or CSS adjustments.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Visual Excellence.
272. **Refactor Modal Dialogs**
     - **What**: Ensure consistent overlays.
     - **How**: Centralize `Dialog` component styling.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Design system adherence.
273. **Implement Micro-Animations on Badges**
     - **What**: Smooth state transitions (Pass/Fail).
     - **How**: Framer Motion or Tailwind transitions.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Dynamic design.
274. **Implement Smooth Tool Switching**
     - **What**: Animate sidebar changes.
     - **How**: Crossfade between Rule / Lighting / Device panels.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Dynamic design.
275. **Implement Toaster Animation Polish**
     - **What**: Clean slide-in/out for errors.
     - **How**: Standardize toaster library config.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Professional aesthetic.
276. **Audit UI Responsiveness (1080p target)**
     - **What**: Ensure it works on standard factory monitors.
     - **How**: Emulate 1920x1080 and 1366x768 screens.
     - **Agents**: 1 (QA).
     - **Guidelines**: Layout constraints.
277. **Fix Layout Overflow Issues**
     - **What**: Address clipping on small screens.
     - **How**: CSS `min-h-0`, `overflow-hidden` fixes.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Robust layout.
278. **Implement Fluid Component Sizing**
     - **What**: Flexbox scaling for the canvas.
     - **How**: `flex-1` with calculated aspect-ratios.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Responsive design.
279. **Write E2E test for Responsive Layout**
     - **What**: Verify no breakage at small viewports.
     - **How**: Playwright `setViewportSize`.
     - **Agents**: 1 (QA).
     - **Guidelines**: Visual regression.
280. **Run Axe Core A11y Suite**
     - **What**: Final automated check.
     - **How**: Playwright axe integration.
     - **Agents**: 1 (QA).
     - **Guidelines**: 100% compliance.
281. **Fix Remaining A11y Violations**
     - **What**: Address Axe findings.
     - **How**: DOM updates.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Zero-contrast tolerance.
282. **Run Visual Regression Suite**
     - **What**: Lock the new polished UI.
     - **How**: Update Playwright snapshots.
     - **Agents**: 1 (QA).
     - **Guidelines**: CI/CD stability.
283. **Audit against Design Directives**
     - **What**: Ensure the UI looks "premium".
     - **How**: Manual design review.
     - **Agents**: 1 (UX/Reviewer).
     - **Guidelines**: "Nothing is arbitrary".
284. **Refine Edge Cases in UI**
     - **What**: Polish hover states on disabled elements.
     - **How**: CSS `not(:disabled)` specific rules.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Pixel perfection.
285. **Refine Focus Management on Dialog Close**
     - **What**: Return focus to triggering element.
     - **How**: React ref management.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: A11y standards.
286. **Check for Hydration Mismatches**
     - **What**: Ensure SSR matches Client.
     - **How**: Review console logs on hard refresh.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: TanStack start best practices.
287. **Optimize Frontend Bundle Size**
     - **What**: Check for bloated imports (e.g. huge icons).
     - **How**: Vite bundle analyzer.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Fast load times.
288. **Configure Content-Visibility**
     - **What**: Improve render performance on large lists (History).
     - **How**: CSS `content-visibility: auto`.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Modern Web Guidance.
289. **Configure Fetch Priority**
     - **What**: Ensure reference image loads first.
     - **How**: `fetchpriority="high"` on canvas image.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Core Web Vitals optimization.
290. **Implement Error Boundaries for Skeletons**
     - **What**: Catch errors during loading state transitions.
     - **How**: Wrap Suspense with ErrorBoundary.
     - **Agents**: 1 (Frontend).
     - **Guidelines**: Error-manage rules.
291. **Perform Lighthouse Audit**
     - **What**: Measure UX metrics.
     - **How**: Chrome DevTools.
     - **Agents**: 1 (DevOps).
     - **Guidelines**: Green scores.
292. **Document UI Components (Storybook/Docs)**
     - **What**: Catalog new flexible components.
     - **How**: Update standard documentation files.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Codebase maintainability.
293. **Write Part 2 Walkthrough Artifact**
     - **What**: Summarize all changes.
     - **How**: Create `walkthrough.md`.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Clear communication.
294. **Update `spec/21-app/` Documentation**
     - **What**: Ensure specs match reality.
     - **How**: Markdown edits to vision specs.
     - **Agents**: 1 (Documentation).
     - **Guidelines**: Source of truth alignment.
295. **Commit Code Structure Review**
     - **What**: Ensure no guideline drift.
     - **How**: Final manual code review.
     - **Agents**: 1 (Reviewer).
     - **Guidelines**: Code red limits.
296. **Verify End-to-End Workflow**
     - **What**: Simulate an operator's shift.
     - **How**: Start app -> Set reference -> Add rules -> Connect camera -> Auto-eval -> Review golden.
     - **Agents**: 1 (QA).
     - **Guidelines**: UX validation.
297. **Address Edge-case: Camera Disconnect mid-eval**
     - **What**: Graceful degradation.
     - **How**: Test physical/mock disconnect during `POST /score`.
     - **Agents**: 1 (QA/Backend).
     - **Guidelines**: Robustness.
298. **Address Edge-case: DB locked errors**
     - **What**: SQLite concurrency handling.
     - **How**: Configure WAL mode and timeout (if not already).
     - **Agents**: 1 (Backend).
     - **Guidelines**: Scalability.
299. **Final Bug Bash**
     - **What**: Uncover any remaining glitches.
     - **How**: Exploratory testing.
     - **Agents**: 1 (QA).
     - **Guidelines**: High quality bar.
300. **Part 2 Signoff**
     - **What**: Conclude steps 101-300.
     - **How**: Final review and preparation for Part 3.
     - **Agents**: 1 (Manager).
     - **Guidelines**: Execution lifecycle tracking.

## End of Part 2
