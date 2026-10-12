# 06 — Preview Mechanisms

**Source of truth:** `src/components/**`, `src/routes/**`, verified 2026-10-13.

**The preview doctrine of this system:** a preview surface is a **16:9 well** (`aspect-video`) with a **1px `ca-border` frame, square corners, `bg-ca-viewport`**, and an absolutely-positioned status badge in the top-left. Overlays are drawn ON the surface (canvas or absolute divs), never in separate panels. Empty states use diagonal hatch + muted mono text — never a blank box.

---

## 6.1 Camera preview (`hmi/CameraPreview.tsx`)

Layout: grid of video surface + 320px slider rail.

- Surface: `relative bg-ca-viewport border border-ca-border overflow-hidden aspect-video` — **16:9, square corners, 1px frame**.
- Live: `<video className="w-full h-full object-contain bg-ca-panel">` with a computed CSS `filter: brightness()/contrast()/saturate()` from slider values.
- Offline: repeating 45° test pattern (`oklch(0.28 0.01 264)` / `oklch(0.22 0.01 264)`, 12/24px bands — see `04` hatch) + muted status text.
- Status badge (top-left): `absolute top-hmi-2 left-hmi-2 px-hmi-2 py-hmi-1 bg-ca-chrome text-ca-chrome-ink text-hmi-badge uppercase tracking-wider` — text "LIVE" vs "PREVIEW".
- No crosshairs, no scrims on this surface.

Sibling stubs:
- `LiveCameraViewer`: video stub at `opacity-50`, radial idle vignette `from-ca-panel to-ca-bg`, "No Signal Detected" card `rounded-xl bg-ca-bg/50 border backdrop-blur-sm`, `h-16 w-16 rounded-full` icon well. **The video element is an unwired stub** — do not treat it as functional.
- `CameraCaptureModal`: backdrop `bg-black/70` (no blur), panel `rounded-lg border bg-ca-panel shadow-xl max-w-lg`, surface `aspect-video rounded border bg-black`.

---

## 6.2 Conveyor / simulation preview

**`conveyor_inspection_preview.png` and `conveyor_inspection_30s.mp4` are unreferenced** — zero imports anywhere in the codebase. They are loose demo assets. **No inspection video player exists.** The functional analog is the simulated canvas:

`CarrierTapeSimulationCanvas.tsx`:
- Frame: `bg-ca-bg`; canvas 512×288 (16:9), `rounded border border-ca-border bg-black shadow-2xl`, max 690px wide.
- Verdict boxes drawn on canvas: PASS `#10b981` fill `rgba(16,185,129,0.08)` / FAIL `#ef4444` fill `rgba(239,68,68,0.10)`, lineWidth 2.0–3.0.
- Industrial corner-bracket reticles: 10px L-brackets at box corners.
- Empty pockets: dashed slate `[3,3]`.
- HUD badges: 16px, `roundRect` r=3, `bold 8.5px monospace`.
- Pin-1 overlays: cyan dashed target circle, green/red detected ring, Δ/θ telemetry badges.
- 24-box character grid with per-box pass/fail strokes and X marks.
- Dimension lines: yellow `rgba(250,204,21,0.85)` with labels like `Edge Width: 12.3mm (142px)`.

Siblings: `PatternMatchCanvas` (`aspect-video rounded border bg-black shadow-2xl`) · `DefectMatchCanvas` (`cursor-crosshair`) · `PatternCanvas` (32px grid paper + deep canvas shadow).

**Rule for a blind AI:** verdict overlays are canvas-drawn with hex/rgba (an explicit exception to the oklch rule — canvas 2D contexts predate the token system). Keep overlay line widths 2–3px, fills at 8–10% alpha.

---

## 6.3 Trial-run preview (`routes/projects/$projectId/trial-run.tsx`)

- Live Preview Area: `min-h-[400px] border border-ca-border rounded bg-[#0b0c10]`, staged image at **80% opacity**.
- Empty state: `ImageIcon size={48} opacity-20` + `text-sm font-mono uppercase` "Awaiting Image Source".
- CTA overlaid bottom-center: `px-8 py-4 rounded font-bold uppercase tracking-widest text-sm shadow-xl bg-ca-primary text-ca-bg hover:bg-ca-primary/90 hover:scale-105 active:scale-95 disabled:opacity-50`. **This is the documented exception to the no-scale rule** — a hero CTA may use `hover:scale-105 active:scale-95`. Do not generalize it to other buttons.
- Running state: CTA swaps to `w-4 h-4 border-2 border-ca-bg border-t-transparent rounded-full animate-spin`.
- Right rail: 340px history; run cards tinted `border-green-500/30 bg-green-500/5` (PASS) / `border-red-500/30 bg-red-500/5` (FAIL).
- Results page: summary banner `border-ca-ok/40 bg-ca-ok/5` (pass) or `border-ca-ng/40 bg-ca-ng/5` (fail); 40px `CheckCircle2`/`XCircle`; verdict chips `rounded-sm bg-ca-ok/10 text-ca-ok`; logs `bg-[#000]` with `text-[#0f0]` terminal-green `<pre>`; source image `max-h-[60vh] rounded-sm border object-contain`.

---

## 6.4 Image preview / lightbox

**No dedicated lightbox/zoom modal exists in the system.** Enlarged images live inside modal dialogs:

- Backdrops: `bg-black/60`–`bg-black/80` (blur only on small badges, not full backdrops).
- Panels: `rounded-lg border border-ca-border bg-ca-panel shadow-xl/2xl`.
- Dismiss: click-outside + Escape + X button (`rounded p-1 text-ca-ink-muted hover:text-ca-ink`).
- Zoom is inline (`ZoomableCanvas`): `overflow-hidden bg-ca-panel touch-none`, transform layer `transition-transform duration-75`, circular controls `w-10 h-10 rounded-full shadow-md opacity-80 hover:opacity-100`.

Thumbnails (`ImageHistoryRail`): `w-28 h-20 rounded-md border overflow-hidden`. Active: `border-ca-primary ring-2 ring-ca-primary/40`. Hover reveals `bg-black/50 opacity-0 → group-hover:opacity-100` scrim with a glass "Set Ref" button (`bg-white/20 hover:bg-white/40 backdrop-blur-sm`). Caption bar: `bg-black/70` with 9px/8px text.

---

## 6.5 ROI preview (four coexisting idioms — know which one you're copying)

### A. `setup/StandardRoiSetup.tsx` (Yeasin's industrial style — the current direction)

- Canvas: `w-[640px] h-[480px] border border-ca-border shadow-md bg-slate-900` on a pinstripe surround.
- ROI: `absolute border-2 border-emerald-400 bg-emerald-500/15` (solid 2px emerald, 15% fill), `transition-all duration-75`.
- Labels baked onto the canvas: top-left chip `text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 px-1 py-0.5 rounded border border-emerald-400/40` reading `ROI 01 [320x240]`; bottom-right coordinate chip at 9px.
- Circle variant: adds `rounded-full` + center dot; ring inner edge **dashed** `border-emerald-300`.
- Masks: `border-2 border-rose-500 bg-rose-600/30` with `MASK 0 (EXCLUDED)` chip.
- **No dimming outside the ROI.**

### B. `vision/RoiSelector.tsx` (legacy)

- `aspect-video rounded-lg border`. Tolerance zone: dashed `border-primary/50 bg-primary/5`. ROI: `border-2 border-primary bg-primary/20` with **four 8px corner handles** (`w-2 h-2 bg-primary`, `-ml-1/-mt-1` offsets, resize cursors).

### C. `vision/RuleDrawingOverlay.tsx` (rubber-band drawing)

- `absolute inset-0 z-40 cursor-crosshair`. PatternEdge: `border-2 border-yellow-400 bg-yellow-400/20`. ROI: `border-2 border-blue-400 bg-blue-400/20`. Hint pill: `bg-black/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm`.

### D. Editor canvas selection (blur-spotlight — the most advanced)

- Selection ring: 2px, `borderColor: ruleColor ?? "var(--ca-select, #8b5cf6)"`, opacity 0.85 (`SelectionOverlay.tsx:300`; also `AlignmentGuides.tsx:19`). Grabbed: adds `ring-2 ring-offset-2 ring-[var(--ca-focus)]`.
- **Reskin-leak trap:** the `#8b5cf6` fallback is a hardcoded purple — like `--shadow-hmi-glow` (see `01` §1.4), it will NOT follow a `--ca-primary` reskin. Replace the fallback when reskinning.
- 8 handles with 24px hit areas; inner `h-2 w-2 rounded-sm border-2 border-white bg-ca-select shadow-md`. Rotation handle 20px above the box, 15° snap.
- `animate-[editor-ripple_650ms_ease-out_forwards]` pulse on selection.
- **Spotlight:** the area OUTSIDE the ROI is dimmed/blurred via SVG mask (`SelectionOverlayBlurBackdrop.tsx`): `OUTER_BLUR_PX = 6`, `INNER_BAND_BLUR_PX = 2`. Skipped when "Sharpen preview" is on.
- Preview modes: Off / Selection / All (hotkey `P`).
- `RoiBadge` label tab at `-top-6`: 13px tabular-nums, white on colored tab; hover adds `ring-2 ring-ca-primary ring-offset-2 shadow-lg`.
- `SafeZoneOverlay`: dashed 4/4 rect at 10% insets + solid L corner brackets (strokeWidth 3).

**Recommendation for new work:** idiom A for setup flows, idiom D for editor canvases. B and C are legacy — do not extend them.

---

## 6.6 Checklist for a blind AI (previews)

- [ ] Preview surfaces: `aspect-video`, 1px `ca-border`, square corners, `bg-ca-viewport`.
- [ ] Status badge top-left: chrome bg, chrome ink, uppercase, badge type size.
- [ ] Empty state: 45° hatch + `opacity-20` icon + mono uppercase label. Never a blank box.
- [ ] Verdict overlays: 2–3px lines, 8–10% fills, PASS green / FAIL red, corner-bracket reticles.
- [ ] ROI: 2px solid + 15–20% fill + baked label chip (`ROI 01 [WxH]`). Spotlight blur optional (6px outer / 2px inner).
- [ ] No lightbox component exists — enlarged images go in dialogs.
