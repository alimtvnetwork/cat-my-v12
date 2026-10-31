# 05 — Two Hundred Pattern-Search Layering Possibilities

**Status:** Draft, companion to files 01–03 of `03-pattern-search-and-ui-improvement`.
**Parent spec:** `.ai-memory/plans/completed/01-pattern-search-spec.md`.
**How to read this file:** 200 layering possibilities for pattern search, in 10
groups of 20, numbered continuously 1–200 so the count is auditable. They are
possibilities, not verified defects — each item must be checked against the
code before implementation. "Layer" here covers mask slots, editor rule layers,
region overlays, result graphics, and simulation layers.

## A. Mask slot model (1–20)

1. Mask slot count fixed at exactly 4 in Standard, unlimited in Modern, same array.
2. Empty slots render showing None, never collapse the list.
3. Index 0 on top for mask slots (vs editor index 0 = bottom) — documented per surface.
4. Selecting a mask shape creates it with default geometry inside the search region.
5. Selecting None removes the mask without deleting its last geometry (undoable).
6. Mask geometry clamped to the search region, not just to the image.
7. Mask drag/resize uses the same engine as search/pattern regions.
8. Each mask drawn in its own overlay token colour with its index label.
9. Mask labels stay readable at 40% zoom (minimum label size rule).
10. Mask slot dropdowns list None plus the shared catalogue, never a private copy.
11. A mask converted to another shape preserves centre and approximate size.
12. Mask handles swap with shape (rectangle 8, circle 4 plus centre, polygon vertices).
13. Mask Delete key clears only the selected mask layer.
14. Mask visibility toggle hides the overlay but keeps the mask applied (or clearly not — one rule).
15. Mask lock prevents transform but still allows selection and panel edits (or blocks both — one rule).
16. Mask opacity slider per slot for inspecting covered pattern areas.
17. Mask invert per slot (exclude vs include) with distinct visual treatment.
18. A mask region drawn on canvas auto-assigns the first empty slot.
19. Drawing a fifth mask in Standard prompts which slot to replace (never silent drop).
20. Mask slot order persists across mode switches without re-sorting.

## B. Ordering and z-index (21–40)

21. Search region always renders beneath pattern region (or above — one rule, documented).
22. Masks render above the search region and below the pattern region (stack order fixed).
23. Result graphics render above regions; grid/crosshair above results (toggle order).
24. Handles render above all region fills, never occluded by a sibling fill.
25. Labels render above handles when regions coincide (label collision rule).
26. Dimension lines render above fills but below handles.
27. Pin-1 markers render above the 24-box grid.
28. Tolerance zones render below pattern boxes, above the image.
29. The selected region always comes to front within its own layer class.
30. Dragging a region temporarily raises it to front, restores order on drop.
31. Z-order changes animate (no pop) or snap instantly (one rule).
32. Z-order survives zoom/pan changes (order is not view-dependent).
33. Z-order survives save/load round trips byte-for-byte.
34. Z-order conflicts between Modern-authored and Standard-authored stacks resolve by rule, not by load order.
35. Overlay canvas uses a single stacking context (no competing z-index wars between portals).
36. Modal dialogs render above canvases; canvas tooltips render above dialogs (one rule).
37. The Window menu lists panels in stack order, not creation order.
38. Minimized rail order follows stack order.
39. Floating palettes stack above docked panels; docked above canvas.
40. A "bring to front / send to back" action exists for every layer row.

## C. Visibility, lock, selection (41–60)

41. Visibility toggle per layer row with immediate canvas effect.
42. Hidden rules do not render overlays (and do not consume hit-tests).
43. Hidden layers still evaluate (or are skipped — one rule, surfaced in results).
44. Locked rules cannot be transformed; attempt logs layers.locked_transform_blocked.
45. Locked rules still allow visibility toggling (or not — one rule).
46. Single selection while the Rule Controller is open; multi-select disabled on mount.
47. Click selects the topmost region under the cursor; repeated clicks cycle down the stack.
48. Click on empty canvas deselects (Esc also deselects).
49. Selection highlight uses the region's own colour at full opacity, others dimmed.
50. Spotlight mode dims everything outside the selected region (blur 6px outer, 2px inner band).
51. Spotlight follows the mask silhouette when a mask exists, not the rectangle.
52. Preview modes Off / Selection / All with hotkey P.
53. Selection persists across tab switches within the tool panel.
54. Selection persists across Modern/Standard mode switches.
55. Selection clears when its region is deleted; focus moves to the next layer.
56. Multi-select (Cmd/Ctrl+Click, Shift+Click range) works in the layer list.
57. Multi-select drag moves all selected regions preserving relative offsets.
58. Group selection shows one bounding transform box for the group.
59. Invisible layers are skipped by Tab keyboard navigation.
60. A "show all / hide all" control exists for the layer list.

## D. Drag, resize, transform (61–80)

61. Drag body moves; drag handle resizes; drag rotation handle rotates (where rotation exists).
62. Corner handles resize two axes; edge handles one axis.
63. Shift-drag preserves aspect on every region type.
64. Arrow keys nudge 1px; Shift+arrow nudges 10px.
65. Resize clamps to image bounds; drag clamps to image bounds.
66. Minimum size enforced from the shared shape definition per shape.
67. Geometry updates shared settings live, throttled to animation frames.
68. Numeric fields and canvas stay bidirectionally synced during drag.
69. Anchor point does not drift when zoomed (geometry stored in image pixels).
70. Rotation handle sits 20px above the box with 15-degree snap.
71. Rotation of a pattern region rotates its box constellation with it.
72. Rotation of a mask rotates the mask, not the parent search region.
73. Freeform drawing belongs to mask editing only, not to region creation.
74. Rubber-band drawing creates a region on mouse-up with handles immediately visible.
75. A drawn region auto-selects on creation.
76. Resize from a corner keeps the opposite corner fixed.
77. Resize from an edge keeps the opposite edge fixed.
78. Dragging a child mask inside its parent moves only the mask.
79. Dragging a parent search region moves its masks with it (or leaves them — one rule).
80. Transform operations are undoable as single steps (drag = one undo, not per-pixel).

## E. Overlap and stacking conflicts (81–100)

81. Coincident region edges show both borders (offset or dashed second border).
82. Fully overlapping regions remain individually selectable via click-cycling.
83. Overlapping handles merge visually but stay individually hittable (24px hit areas).
84. A mask fully covering the pattern region warns the operator (pattern invisible).
85. A pattern region outside its search region warns (nothing outside search is searched).
86. A search region outside the image is clamped, never silently shrunk without notice.
87. Overlapping masks combine by union, intersection, or priority (one rule).
88. Overlapping mask plus image-region blocks resolve by documented precedence.
89. Result graphics for overlapping detections do not double-count.
90. Two regions with identical geometry get distinct labels (index suffix).
91. Label chips offset when they would overlap (stacked chips, not hidden).
92. Dimension lines for overlapping regions offset to avoid crossing text.
93. The 24-box grid inside an overlapped pattern region still renders per box.
94. Tolerance zones of overlapping regions blend (alpha compositing rule).
95. Clicking an overlap zone selects by documented priority (topmost wins).
96. Right-click on an overlap opens a layer picker for that point.
97. Overlap warnings appear in the panel, not only on canvas.
98. Overlap state is computed in image space, never screen space.
99. Overlap checks run on drop, not continuously during drag (performance).
100. Overlap warnings clear automatically when regions separate.

## F. Cross-UI sync (101–120)

101. One masks array shared by Modern and Standard; no per-UI copy.
102. Modern-authored more-than-4 masks open in Standard as first four plus notice (never silent drop).
103. Standard-authored 4 masks open in Modern unchanged and in order.
104. Layer renames in one UI appear in the other immediately.
105. Visibility toggles sync across UIs.
106. Lock state syncs across UIs.
107. Selection syncs across UIs (same region selected after switch).
108. Active tab syncs across UIs (mode switch preserves tab).
109. In-progress drags survive mode switches (no re-mount reset).
110. Undo stacks are per-document, not per-UI (switch does not clear undo).
111. Shape catalogue additions appear in both UIs with zero extra edits.
112. Colour tokens are semantic; no hardcoded hex in either UI's layer rendering.
113. Layer thumbnails render from shape bbox in both UIs.
114. Layer row height 36px in both UIs (same anatomy).
115. Drag handles identical size and hit area in both UIs.
116. Keyboard shortcuts identical for layer operations in both UIs.
117. Error codes identical (E_LAYER_REORDER_FAILED etc.) in both UIs.
118. Layer counts in headers agree between UIs (same source of truth).
119. A layer deleted in one UI disappears in the other without refresh.
120. Mode switch never reorders layers.

## G. Persistence and migration (121–140)

121. Layers persist in stack order with explicit indices.
122. Layer order persists per program, not globally.
123. Layer persistence versioned; old files migrate on load.
124. Migration from flat regions to {shape, geometry} preserves geometry exactly.
125. Migration from maskRegions-only data restores domain masks (no silent loss).
126. Pre-contract regions (unknown recorded space) convert with Space B default plus review flag.
127. Fully out-of-bounds regions on load error visibly, never load as empty slices.
128. Deleted layers are soft-deleted until save (undo restores them).
129. Layer persistence survives app restart without localStorage surgery.
130. Stale persisted layout (off-screen maximized panels) resets with one action.
131. Two panel persistence keys (palette vs workspace) merge without clobbering.
132. Layer export includes order, visibility, lock, geometry, colour.
133. Layer import validates shape kinds against the shared catalogue.
134. Import of unknown shape kinds warns and skips, never crashes.
135. Layer duplication copies geometry plus visibility, resets lock to unlocked.
136. Layer copy/paste across programs preserves order position (paste above selection).
137. Autosave writes layer order on every reorder, not only on OK.
138. Cancel discards layer-order changes made in the session.
139. OK commits layer-order changes for the whole panel stack (nested panels each commit).
140. Layer history (who reordered what, when) is recorded for audit.

## H. Overlay rendering and compositing (141–160)

141. Overlays drawn ON the preview surface, never in separate panels.
142. All overlays render in one composited pass per frame (no partial repaints).
143. Verdict overlays use canvas-drawn hex/rgba (explicit oklch exception).
144. 16:9 preview wells with 1px frame, square corners, bg-ca-viewport.
145. Empty states use diagonal hatch plus muted mono text, never a blank box.
146. Grid paper background (32px) only on the pattern canvas, not on result views.
147. L-bracket corner reticles (10px) on verdict boxes.
148. Empty pockets dashed slate [3,3]; filled pockets solid.
149. HUD badges 16px, roundRect r=3, bold 8.5px monospace.
150. Dimension lines yellow rgba(250,204,21,0.85) with px plus mm labels.
151. Pin-1 overlays: cyan dashed target circle, green/red detected ring.
152. 24-box grid: per-box pass/fail strokes, X marks on failures.
153. Overlay opacity scales with zoom (thin lines stay visible at 40%).
154. Overlay text never scales with zoom (constant screen size).
155. Canvas backing store uses DPR; CSS size stays layout size.
156. Overlay hit-testing uses the inverse ImageToScreen transform.
157. Overlays clip to the viewport; overflow never scrolls the page.
158. Overlay rendering pauses while a modal dialog captures the pointer.
159. Screenshot/export captures overlays exactly as displayed.
160. Overlay colours follow the adjudicated pattern-screen mapping (file 03 §10.2).

## I. Simulation layering (161–180)

161. Simulation layers live in sim-local space; never merge into real rule layers.
162. Sim pocket order follows tape direction (left-to-right feed).
163. Sim verdict boxes stack above pocket fills, below HUD badges.
164. Sim frame jitter translates image content only, never overlays.
165. Sim empty-pocket placeholders render even when no chip is present.
166. Sim rule tree (pin-1, pattern) renders as its own layer list, separate from real rules.
167. Sim layer visibility toggles do not affect real rule visibility.
168. Sim layer reorder (if added) never reorders real rules.
169. Sim 24-box grid overlays align to pocket centres, not canvas origin.
170. Sim dimension lines use pocket-local coordinates.
171. Sim playback layers (raw vs analyzed) toggle without rebuilding the stack.
172. Sim result panel rows map 1:1 to sim layers by id.
173. Sim layer ids never collide with real rule ids.
174. Sim layers clear on exit; real layers untouched.
175. Sim multi-pocket slicing layers (tape strips) render as guides, not as masks.
176. Sim phaseCorrelate shift indicators render as arrows on the affected layer.
177. Sim grayscale preview layer toggles independently of the match layer.
178. Sim frame counter layer shows current frame / total frames.
179. Sim layer opacity for the analyzed overlay is adjustable.
180. Sim export includes the layer stack used for that run.

## J. Diagnostics, errors, edge cases (181–200)

181. Layer reorder failure surfaces E_LAYER_REORDER_FAILED with the layer id.
182. Merge incompatibility surfaces E_LAYER_MERGE_INCOMPATIBLE with both kinds.
183. Empty group warns W_LAYER_GROUP_EMPTY instead of creating it.
184. Every layer operation logs id, before-order, after-order.
185. A layer integrity check runs on load (duplicate ids, broken indices, orphan masks).
186. Orphan masks (parent search region deleted) are flagged, not silently kept.
187. Circular group membership is rejected at creation.
188. Maximum layer count is defined per surface (Standard masks = 4; editor = documented cap or none).
189. Exceeding the cap warns before creating, never after.
190. Layer operations on a locked parent are blocked with a named reason.
191. Layer operations during an active run are queued or blocked (one rule).
192. Layer state during simulation playback is read-only for real layers.
193. A "reset layer order" action restores creation order.
194. A layer diff view shows order changes before OK commits them.
195. Layer search/filter by name works in lists longer than 20 rows.
196. Layer list virtualizes beyond 100 rows (no render cost per row).
197. Layer thumbnails regenerate when geometry changes.
198. Layer names validate (non-empty, unique within program, or auto-suffixed).
199. Layer delete requires no confirmation for empty masks, confirmation for pattern regions (one rule).
200. Layering possibilities are reviewed against this list before any layer-system refactor ships.
