# Implementation Guide Specification: Pattern Search, Geometry, Layering & UI Improvements

Document ID: `05-05-PAT-LAY-GUIDE`  
Version: `1.0.0`  
Status: `Approved for Implementation`  
Scope: Step-by-step code modification blueprints for vision rules, geometry math, carrier tape simulation, window chrome, and developer run scripts.

---

## 1. Overview & Architectural Objectives

This document serves as the master implementation blueprint for the critical fixes identified in the pattern search, carrier tape simulation, Photoshop layering, and UI subsystem. Every section below contains an exact architectural analysis, the target source file (specified as a relative Git path), the exact problem signature, and a drop-in code implementation blueprint.

### Invariant Rules
- **Strict Boolean Standards**: Only `is` and `has` prefixes are permitted (e.g. `isLocked`, `isVisible`, `hasSquareLock`).
- **Relative Git Paths**: All file references use forward slashes and repository-relative roots (e.g. `src/lib/vision/...`).
- **Zero Harm / Zero Regressions**: Non-destructive refactoring; existing APIs, tool codes, and serialization models remain backward-compatible.

---

## 2. Blueprint 1: Saving Pattern Boxes (`RuleToolConfigPanel.tsx` & `StandardGreyscalePatternMatchingTool.tsx`)

### 2.1 Problem Analysis
When configuring a pattern matching rule, `WhiteBoxMarkingTool` allows users to teach and position reference boxes. However, if the user exits or confirms, the resulting box constellation was not consistently written to `rule.params.referenceBoxes` and `rule.params.constellationJson`. 

In `StandardGreyscalePatternMatchingTool.tsx`, relative coordinates were partially mapped, but in `RuleToolConfigPanel.tsx`, missing properties caused `parseBoxesFromParams` to read an empty array, subsequently failing inspection with:
`"Pattern inspection is not configured: missing saved pattern boxes"`.

### 2.2 Blueprint: `src/components/vision/standard/tools/StandardGreyscalePatternMatchingTool.tsx`
Ensure `handleApply` packages all four canonical representations of the box constellation:
1. `referenceBoxes`: Absolute taught pixel boxes.
2. `constellation`: Array alias for legacy loaders.
3. `constellationJson`: Minified JSON string for persistence.
4. `referenceBoxesRelativeToPatternRegion`: Offset relative to ROI top-left origin `(box.x - patternRegion.x, box.y - patternRegion.y)`.

```typescript
// Location: src/components/vision/standard/tools/StandardGreyscalePatternMatchingTool.tsx
const handleApply = (pattern: FormulatedPatternGeometry): void => {
  const patternRegion = pattern.patternRegion;
  const referenceBoxesRelativeToPatternRegion = pattern.referenceBoxes.map((box) => ({
    ...box,
    x: Math.round(box.x - patternRegion.x),
    y: Math.round(box.y - patternRegion.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  }));

  props.onChange((prev) => ({
    ...prev,
    referenceBoxes: pattern.referenceBoxes,
    constellation: pattern.referenceBoxes,
    constellationJson: JSON.stringify(pattern.referenceBoxes),
    referenceBoxesRelativeToPatternRegion,
    patternRegion: { shape: ShapeType.Rectangle, geometry: patternRegion },
    searchRegion: { shape: ShapeType.Rectangle, geometry: pattern.searchRegion },
    tolerancePx: pattern.tolerancePx,
    marginPx: pattern.marginPx,
    threshold: pattern.threshold ?? (prev as any)?.threshold ?? 170,
    greyscaleLevel: pattern.threshold ?? (prev as any)?.threshold ?? 170,
    activeBoxCount: pattern.referenceBoxes.length,
    totalBoxCount: pattern.referenceBoxes.length,
  }));

  props.onOk?.();
};
```

### 2.3 Blueprint: `src/components/vision/workpiece/RuleToolConfigPanel.tsx`
In `RuleToolConfigPanel.tsx`, ensure `handleApplyPattern` synchronizes all box parameters directly onto the `EditorRule`:

```typescript
// Location: src/components/vision/workpiece/RuleToolConfigPanel.tsx
const handleApplyPattern = (pattern: FormulatedPatternGeometry) => {
  const searchRegion: SearchRegion = pattern.searchRegion;
  const patternRegion: SearchRegion = pattern.patternRegion;
  const maskRegions: SearchRegion[] = pattern.maskRegions || [];

  const updatedParams: Record<string, any> = {
    ...(rule.params ?? {}),
    greyscaleLevel: pattern.threshold ?? 170,
    threshold: pattern.threshold ?? 170,
    minMatchPercent: pattern.minMatchPercent ?? 80,
    lumaTolerance: (rule.params as any)?.lumaTolerance ?? 32,
    marginPx: pattern.marginPx,
    tolerancePx: pattern.tolerancePx,
    activeBoxCount: pattern.referenceBoxes.length,
    totalBoxCount: pattern.referenceBoxes.length,
    referenceBoxes: pattern.referenceBoxes,
    constellation: pattern.referenceBoxes,
    constellationJson: JSON.stringify(pattern.referenceBoxes),
    referenceBoxesJson: JSON.stringify(pattern.referenceBoxes),
    searchRegion,
    patternRegion,
    maskRegions,
    searchRegionJson: JSON.stringify(searchRegion),
    patternRegionJson: JSON.stringify(patternRegion),
    maskRegionsJson: JSON.stringify(maskRegions),
    x: Math.round(pattern.x),
    y: Math.round(pattern.y),
    width: Math.round(pattern.width),
    height: Math.round(pattern.height),
  };

  const nextRule: EditorRule = {
    ...rule,
    x: Math.round(pattern.x),
    y: Math.round(pattern.y),
    width: Math.round(pattern.width),
    height: Math.round(pattern.height),
    params: updatedParams as any,
  };

  onUpdateRule(nextRule);
  onExit();
};
```

---

## 3. Blueprint 2: Local Pattern Box Parsing & Pocket-Relative Offsets (`workpiece-rule-analyzer.ts`)

### 3.1 Problem Analysis
During multi-pocket carrier tape inspection, the analyzer attempts to match taught boxes across multiple feeder cavities. If the taught rule belongs to Pocket 0, simply running the absolute coordinates on Pocket 1 results in checking empty space or incorrect chip regions. Furthermore, if `constellationJson` has minor syntax anomalies, the entire analysis crashes.

### 3.2 Blueprint: `src/lib/vision/workpiece-rule-analyzer.ts`
Implement robust fallback parsing and relative delta mapping:

```typescript
// Location: src/lib/vision/workpiece-rule-analyzer.ts
export function parseBoxesFromParams(
  toolParams?: Record<string, any>,
  ruleRoi?: { x: number; y: number; width: number; height: number },
): WhiteBoxMark[] {
  let list: any[] = [];

  // Priority 1: Serialized constellation JSON string
  if (typeof toolParams?.constellationJson === "string") {
    try {
      const parsed = JSON.parse(toolParams.constellationJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    } catch (err) {
      captureCorruptSavedJson("constellationJson", toolParams.constellationJson, err);
    }
  }

  // Priority 2: Direct referenceBoxes array
  if (list.length === 0 && Array.isArray(toolParams?.referenceBoxes) && toolParams.referenceBoxes.length > 0) {
    list = toolParams.referenceBoxes;
  }

  // Priority 3: Legacy constellation or patternBoxes
  if (list.length === 0 && Array.isArray(toolParams?.constellation) && toolParams.constellation.length > 0) {
    list = toolParams.constellation;
  }
  if (list.length === 0 && Array.isArray(toolParams?.patternBoxes) && toolParams.patternBoxes.length > 0) {
    list = toolParams.patternBoxes;
  }

  // Priority 4: Default Atmel 24-box generation if ROI exists
  if (list.length === 0 && ruleRoi && ruleRoi.width > 0 && ruleRoi.height > 0) {
    return getPatternBoxesForRegion(ruleRoi);
  }

  return list.map((b) => ({
    x: Math.round(Number(b.x)),
    y: Math.round(Number(b.y)),
    width: Math.max(4, Math.round(Number(b.width))),
    height: Math.max(4, Math.round(Number(b.height))),
    area: Math.max(16, Math.round(Number(b.width) * Number(b.height))),
    expectedLuma: typeof b.expectedLuma === "number" ? Math.round(b.expectedLuma) : undefined,
  }));
}
```

For pocket-relative translation across carrier tape cavities:
```typescript
// Inside analyzeRuleForPocket() in src/lib/vision/workpiece-rule-analyzer.ts
if (rawBoxes.length > 0 && authorPocket && authorPocket !== targetPocket) {
  const scaleX = targetPocket.width / Math.max(1, authorPocket.width);
  const scaleY = targetPocket.height / Math.max(1, authorPocket.height);

  transformedBoxes = rawBoxes.map((box) => ({
    ...box,
    x: Math.round(targetPocket.x + (box.x - authorPocket.x) * scaleX),
    y: Math.round(targetPocket.y + (box.y - authorPocket.y) * scaleY),
    width: Math.max(4, Math.round(box.width * scaleX)),
    height: Math.max(4, Math.round(box.height * scaleY)),
    area: Math.max(16, Math.round(box.width * box.height * scaleX * scaleY)),
  }));
} else {
  transformedBoxes = rawBoxes;
}
```

---

## 4. Blueprint 3: Square ROI Enforcement & Unoccupied Pocket Filtering (`usePatternMatchingRule.ts` & `VisualToolWorkpieceCanvas.tsx`)

### 4.1 Problem Analysis
In `usePatternMatchingRule.ts`, the default search region calculation used a ratio of `106 / 100`, which generated rectangular regions. For symmetric chip body pattern matching, square 1:1 geometry is mandatory. In `VisualToolWorkpieceCanvas.tsx`, pattern boxes were being drawn over empty cavities in carrier tape simulation mode.

### 4.2 Blueprint: `src/components/vision/standard/tools/pattern-matching/usePatternMatchingRule.ts`
Enforce 1:1 aspect ratio in default search region generation:

```typescript
// Location: src/components/vision/standard/tools/pattern-matching/usePatternMatchingRule.ts
export function createDefaultSearchRegion(width: number, height: number): SearchRegion {
  if (width <= 200 && height <= 200) {
    const minSide = Math.min(width, height);
    return {
      x: 0,
      y: 0,
      width: minSide,
      height: minSide,
    };
  }

  // Enforce strict square side dimension (1:1 aspect ratio)
  const targetSide = Math.round(Math.min(width * 0.45, height * 0.70, 320));
  const side = Math.max(32, targetSide);

  const x = Math.max(0, Math.round((width - side) / 2));
  const y = Math.max(0, Math.round((height - side) / 2));

  return {
    x,
    y,
    width: side,
    height: side,
  };
}
```

### 4.3 Blueprint: `src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx`
Filter out unoccupied pockets before rendering pattern box constellations:

```typescript
// Location: src/components/vision/workpiece/VisualToolWorkpieceCanvas.tsx
// Filter occupied pockets: pocket must not be designated empty
const occupiedTapePockets = tapeStripResult && tapeStripResult.totalPockets > 1
  ? tapeStripResult.pockets.filter((p) => !p.isEmpty && p.occupancy !== "empty")
  : [];

// When rendering pattern boxes in carrier tape simulation mode:
if (isRulePattern) {
  if (occupiedTapePockets.length > 0) {
    for (const pocket of occupiedTapePockets) {
      // Draw pattern boxes ONLY for occupied pockets
      drawPatternBoxConstellation(ctx, pocket, ruleBoxes);
    }
  } else if (!isAnalyzeMode) {
    // Single-device manual authoring mode: draw standard reference boxes
    drawPatternBoxConstellation(ctx, null, ruleBoxes);
  }
}
```

---

## 5. Blueprint 4: Pin 1 Search Window & Independent Rule 2 Execution (`carrier-tape-evaluator.ts`)

### 5.1 Problem Analysis
In `carrier-tape-evaluator.ts`:
1. The Pin 1 search loop was bounded to a narrow `dx: -6..6, dy: -6..6` window (13x13 px), failing on shifted parts.
2. If Rule 1 (Pin 1) failed, Rule 2 (24-box pattern matching) was short-circuited and marked `isSkipped: true`. This prevented independent rule diagnosis and caused operators to miss marking defects on incorrectly oriented chips.

### 5.2 Blueprint: `src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts`
Expand Pin 1 search kernel to 32x32 px and decouple Rule 2 execution:

```typescript
// Location: src/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator.ts

// 1. Expand search window in analyzeRule1Pin1Real
export function analyzeRule1Pin1Real(
  buffer: PixelBufferInput,
  tolerances: MultiRuleToleranceParams,
): Rule1Pin1Result {
  const { rgba, width, height } = buffer;
  const quadrantCenters = [
    { name: "top-left", targetX: 41.0, targetY: 48.0, expectedAngle: -134.0 },
    { name: "top-right", targetX: 96.0, targetY: 49.0, expectedAngle: -44.0 },
    { name: "bottom-left", targetX: 40.0, targetY: 103.0, expectedAngle: 136.0 },
    { name: "bottom-right", targetX: 95.0, targetY: 104.0, expectedAngle: 46.0 },
  ];

  let bestHole: any = null;
  let minCoreLuma = Number.POSITIVE_INFINITY;

  // Adaptive window: expand from +/-6 to +/-15 px for reliable acquisition
  for (const q of quadrantCenters) {
    for (let dy = -15; dy <= 15; dy += 1) {
      for (let dx = -15; dx <= 15; dx += 1) {
        const px = Math.round(q.targetX + dx);
        const py = Math.round(q.targetY + dy);

        if (px < 6 || px >= width - 6 || py < 6 || py >= height - 6) {
          continue;
        }

        const centerIdx = (py * width + px) * 4;
        if (rgba[centerIdx + 3] < 128) continue;

        // ITU-R BT.709 Linear Luminance for dimple contrast
        let innerSum = 0;
        let innerCount = 0;
        for (let iy = -2; iy <= 2; iy += 1) {
          for (let ix = -2; ix <= 2; ix += 1) {
            if (ix * ix + iy * iy <= 5) {
              const pIdx = ((py + iy) * width + (px + ix)) * 4;
              if (rgba[pIdx + 3] >= 128) {
                innerSum += 0.2126 * rgba[pIdx] + 0.7152 * rgba[pIdx + 1] + 0.0722 * rgba[pIdx + 2];
                innerCount += 1;
              }
            }
          }
        }

        if (innerCount === 0) continue;
        const innerLuma = innerSum / innerCount;

        if (innerLuma < minCoreLuma) {
          minCoreLuma = innerLuma;
          bestHole = { x: px, y: py, quadrant: q.name, luma: innerLuma };
        }
      }
    }
  }

  // Return evaluated Pin 1 result
  const isPass = Boolean(bestHole && bestHole.quadrant === "top-left");
  return {
    isPass,
    detectedHoleX: bestHole?.x ?? 41.0,
    detectedHoleY: bestHole?.y ?? 48.0,
    quadrant: bestHole?.quadrant ?? "unknown",
  };
}

// 2. Decouple Rule 2 execution in evaluatePocket
export function evaluatePocket(
  pocket: PocketDef,
  tolerances: MultiRuleToleranceParams,
  pixelBuffer?: PixelBufferInput | null,
): PocketInspectionResult {
  const isRealPixelActive = Boolean(pixelBuffer && pixelBuffer.rgba && pixelBuffer.width > 0);

  if (pocket.occupancy === "empty") {
    return {
      pocketIndex: pocket.pocketIndex,
      occupancy: "empty",
      verdict: "EMPTY",
      failedRuleIndex: null,
      failedRuleName: null,
      failureReason: null,
      rule1Pin1: null,
      rule2Pattern: null,
      isRule2Skipped: false,
      isRealPixelAnalysis: isRealPixelActive,
    };
  }

  // Evaluate Rule 1: Pin 1 Orientation Rule
  const rule1 = isRealPixelActive && pixelBuffer
    ? analyzeRule1Pin1Real(pixelBuffer, tolerances)
    : evaluateRule1Pin1Synthetic(pocket, tolerances);

  // Independent Rule 2 Evaluation (Never short-circuit)
  const rule2 = isRealPixelActive && pixelBuffer
    ? analyzeRule2PatternReal(pixelBuffer, tolerances)
    : evaluateRule2PatternSynthetic(pocket, tolerances);

  const isAllPass = rule1.isPass && rule2.isPass;
  const failedRule = !rule1.isPass ? 1 : !rule2.isPass ? 2 : null;

  return {
    pocketIndex: pocket.pocketIndex,
    occupancy: "occupied",
    verdict: isAllPass ? "PASS" : "FAIL",
    failedRuleIndex: failedRule,
    failedRuleName: failedRule === 1 ? RULE_1_NAME : failedRule === 2 ? RULE_2_NAME : null,
    failureReason: !rule1.isPass ? "Pin 1 Orientation Mismatch" : !rule2.isPass ? "Pattern Match Score Below Threshold" : null,
    rule1Pin1: rule1,
    rule2Pattern: rule2,
    isRule2Skipped: false,
    isRealPixelAnalysis: isRealPixelActive,
  };
}
```

---

## 6. Blueprint 5: Eliminating Dropdown Transform Collision & Modal Lock (`dropdown-menu.tsx` & `AnalyzeImageToolbar.tsx`)

### 6.1 Problem Analysis
In `AnalyzeImageToolbar.tsx`, clicking the image source dropdown took 800ms-1200ms to open or appeared frozen.
Root Causes:
1. Radix `DropdownMenu` defaults to `modal={true}`, which sets `pointer-events: none` on `document.body` and recalculates scroll lock margins across the whole DOM.
2. In `dropdown-menu.tsx`, aggressive CSS animation classes `origin-(--radix-dropdown-menu-content-transform-origin)` and zoom transforms trigger layout recalculations inside GPU-accelerated canvas containers.

### 6.2 Blueprint: `src/components/vision/workpiece/AnalyzeImageToolbar.tsx`
Set `modal={false}` on the `<DropdownMenu>` instance:

```tsx
// Location: src/components/vision/workpiece/AnalyzeImageToolbar.tsx
<DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen} modal={false}>
  <DropdownMenuTrigger asChild>
    <button
      type="button"
      id="btn-camera-source-dropdown"
      data-automation-id="btn-camera-source-dropdown"
      data-automation-name="Camera Source Dropdown"
      className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 font-sans text-xs font-semibold text-white shadow-sm transition hover:border-cyan-400/40 hover:bg-white/10 active:scale-95"
    >
      {/* Trigger contents */}
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent
    align="start"
    sideOffset={6}
    className="z-50 min-w-[240px] rounded-xl border border-white/15 bg-[#0c1017]/95 p-1.5 shadow-2xl backdrop-blur-xl"
  >
    {/* Dropdown Items */}
  </DropdownMenuContent>
</DropdownMenu>
```

### 6.3 Blueprint: `src/components/ui/dropdown-menu.tsx`
Streamline animation classes to eliminate GPU transform origin collision:

```tsx
// Location: src/components/ui/dropdown-menu.tsx
const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg transition-opacity duration-150 data-[state=open]:opacity-100 data-[state=closed]:opacity-0",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
```

---

## 7. Blueprint 6: Safe Desktop Bridge Fallbacks (`WindowControlButtons.tsx`)

### 7.1 Problem Analysis
In browser `--app` mode, clicking Minimize showed a modal toast saying "Minimize is not available in browser mode". When running under Tauri, Electron, or custom web wrappers, the window controls must query native desktop bridges first, and gracefully fallback to fullscreen exit without unhandled errors.

### 7.2 Blueprint: `src/components/layout/WindowControlButtons.tsx`

```typescript
// Location: src/components/layout/WindowControlButtons.tsx
function resolveDesktopBridge(): DesktopApi | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  // 1. Direct window.desktopApi
  const direct = (window as unknown as { desktopApi?: DesktopApi }).desktopApi;
  if (direct) return direct;

  // 2. Tauri IPC Bridge
  const tauriWindow = (
    window as unknown as {
      __TAURI__?: {
        window?: {
          getCurrent?: () => {
            minimize?: () => void;
            toggleMaximize?: () => void;
            close?: () => void;
          };
        };
      };
    }
  ).__TAURI__?.window?.getCurrent?.();

  if (tauriWindow) {
    return {
      minimize: () => tauriWindow.minimize?.(),
      toggleMaximize: () => tauriWindow.toggleMaximize?.(),
      close: () => tauriWindow.close?.(),
    };
  }

  // 3. Electron preload IPC
  const electronApi = (window as unknown as { electronAPI?: DesktopApi }).electronAPI;
  if (electronApi) return electronApi;

  return undefined;
}

// In handleMinimize:
const handleMinimize = useCallback(() => {
  const desktopApi = resolveDesktopBridge();

  if (desktopApi?.minimize) {
    desktopApi.minimize();
    return;
  }

  // In browser --app mode: exit fullscreen as safe minimize fallback
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
    return;
  }

  window.dispatchEvent(new CustomEvent("cat-vision:window-minimize"));
  // Silent fallback: no jarring error toast
}, []);
```

---

## 8. Blueprint 7: Universal Application Version Badge (`StandardAppShell.tsx` & `titlebar-parts.tsx`)

### 8.1 Problem Analysis
When navigating to `/run` or individual workpiece inspection views, the application version number was invisible, leaving operators uncertain of which firmware/software build was running.

### 8.2 Blueprint: `src/components/layout/StandardAppShell.tsx` & `src/components/hmi/titlebar-parts.tsx`
Ensure the version badge renders consistently across all routes in both the app shell header and HMI titlebar cluster:

```tsx
// Location: src/components/layout/StandardAppShell.tsx
<div className="flex items-center gap-1.5 shrink-0">
  {pathname === "/" ? (
    <Link to="/" className="flex items-center gap-2">
      <img src="/cat-logo.svg" alt="Cat Vision" className="h-6 w-auto" />
      <span className="font-bold text-white tracking-tight">Cat Vision</span>
    </Link>
  ) : null}

  {/* Version badge displayed across EVERY route */}
  <button
    type="button"
    data-testid="version-badge-button"
    onClick={() => setIsVersionModalOpen(true)}
    title={`Released ${APP_VERSION_INFO.releaseDate} — Click for release details`}
    className="flex cursor-pointer items-center gap-1 rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-cyan-300 transition-all hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-white active:scale-95 shadow-[0_0_8px_rgba(34,211,238,0.2)]"
  >
    <span>{APP_VERSION_INFO.version}</span>
  </button>
</div>
```

---

## 9. Blueprint 8: Fixing Layer Movement Direction Inversion (`PhotoshopLayersPanel.tsx` & `WorkpieceAnalyzeWorkspace.tsx`)

### 9.1 Problem Analysis
In `WorkpieceAnalyzeWorkspace.tsx:1110`, the reorder handler implemented:
`const targetIdx = dir === "up" ? idx - 1 : idx + 1;`
However, `PhotoshopLayersPanel.tsx` renders layers sorted by descending z-index:
`const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);`
Where `zIndex` corresponds to the array index. 
Consequently, decrementing the array index (`idx - 1`) reduced the layer's z-index, causing the layer to move DOWN visually when the user clicked the UP button.

### 9.2 Blueprint: `src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx`
Invert the direction calculation so that moving "up" increases array index (and z-index):

```typescript
// Location: src/components/vision/workpiece/WorkpieceAnalyzeWorkspace.tsx
onReorder: (id: string, dir: "up" | "down") => {
  const ownerRuleset = ruleOwnerById.get(id) ?? ruleset;
  if (!ownerRuleset) return;

  const ownerRules = ownerRuleset.id === ruleset?.id ? rules : (ownerRuleset.rules ?? []);
  const idx = ownerRules.findIndex((r) => r.id === id);
  if (idx === -1) return;

  // Correct direction physics:
  // Array index 0 is bottom (background).
  // Array index N-1 is top (highest z-index, top of Photoshop list).
  // Moving "up" means increasing array index towards N-1.
  const targetIdx = dir === "up" ? idx + 1 : idx - 1;
  if (targetIdx < 0 || targetIdx >= ownerRules.length) return;

  const next = [...ownerRules];
  const [moved] = next.splice(idx, 1);
  next.splice(targetIdx, 0, moved);

  updateRulesetRules(ownerRuleset.id, next);

  if (ownerRuleset.id === ruleset?.id) {
    useRulesStore.getState().replaceAll(next, selectedIds, []);
  }
},
```

---

## 10. Blueprint 9: Preventing Unwanted Browser Spawn (`run.ps1` & `run.sh`)

### 10.1 Problem Analysis
Running `run.ps1` or `run.sh` launched a Chromium window every single time, even if an inspection window was already active, creating clutter and duplicate processes.

### 10.2 Blueprint: `run.ps1`
Improve running instance detection by checking active processes before calling `Start-Process`:

```powershell
# Location: run.ps1
$alreadyOpen = $false
try {
    $existing = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^(chrome|msedge|chromium)\.exe$' }

    foreach ($proc in $existing) {
        if ($proc.CommandLine -and $proc.CommandLine -like "*$appNeedle*") {
            $alreadyOpen = $true
            break
        }
    }
} catch {
    $alreadyOpen = $false
}

if ($alreadyOpen) {
    Write-Host "Inspection window is already open. Skipping browser spawn."
    $chromeFound = $true
} else {
    foreach ($p in $chromePaths) {
        if (Test-Path $p) {
            $chromeProcess = Start-Process -PassThru -FilePath $p -ArgumentList $chromeArgs
            $jobs += $chromeProcess
            $chromeFound = $true
            break
        }
    }
}
```

### 10.3 Blueprint: `run.sh`
In `run.sh`, check `pgrep` for `--app=$URL`:

```bash
# Location: run.sh
if pgrep -af "chromium|chrome" 2>/dev/null | grep -F -- "--app=$URL" >/dev/null 2>&1; then
    echo "Inspection window is already open. Skipping a second browser."
elif command -v chromium &> /dev/null; then
    chromium --app="$URL" --start-fullscreen --user-data-dir="$PROFILE_DIR" --no-first-run --no-default-browser-check &
    PIDS+=("$!")
```

---

## 11. Verification Command Checklist

Run the following commands to verify all blueprints:
```bash
# 1. Verify unit tests for pattern geometry and squareness
bun test tests/unit/pinned-pattern-geometry.test.ts

# 2. Verify luminance quantizer unit tests
bun test src/lib/vision/__tests__/luminance-quantizer.test.ts

# 3. Verify workpiece rule analyzer test suite
bun test src/lib/vision/__tests__/workpiece-rule-analyzer.test.ts

# 4. Verify round hole detector tests
bun test src/components/vision/standard/tools/pin1-config/__tests__/round-hole-detector.test.ts

# 5. Typecheck repository
bun run typecheck
```
