# 05 - Run Layout Condensation & Controller Blending Specification

- **Specification ID**: `SPEC-85-05`
- **Module**: `AppRuntime / Layout / RunHMI`
- **Status**: Verified Specification
- **Date**: 2026-10-31

---

## 1. Executive Summary

Inspection workstations run on high-resolution, wide-aspect industrial monitors where vertical screen height is at a premium. Wasted vertical space in bottom status bars directly reduces the visible workpiece inspection area. This specification defines:
1. **Bottom Bar Condensation**: Collapsing the 56px bottom bar in `WorkpieceAnalyzeWorkspace.tsx` into a minimal 18–20px status ticker.
2. **Right-Hand Controller Blending**: Relocating and blending the primary `RUN / TEST` actions directly into the sticky footer of `RuleRightToolbarPanel.tsx` next to `Test This Rule`.
3. **Telemetry Density**: Consolidating engine status, active camera/reference sources, rule count, and version information into a high-density, non-distracting telemetry strip.

---

## 2. Layout Transformation

### 2.1 Before vs. After Layout Comparison

```
+--------------------------------------------------------------+
| BEFORE:                                                      |
| [ Top Header Strip: 48px ]                                   |
| [ Left Sidebar ] [ Workpiece Canvas: Shrunken ] [ Right Rail]|
|                                                              |
| [ Bloated Bottom Action Bar: 56px ]                          |
|   ● Ready ... [ Big Green Floating RUN Button: 38px ]        |
+--------------------------------------------------------------+

+--------------------------------------------------------------+
| AFTER:                                                       |
| [ Top Header Strip: 48px ]                                   |
| [ Left Sidebar ] [ Workpiece Canvas: +56px Vertical Space! ] |
|                  [                                         ] |
|                  [ Right Rail: Sticky Action Bar           ] |
|                  [  ▶ RUN FULL INSPECTION (Primary)        ] |
|                  [  ▶ Test This Rule      (Secondary)      ] |
| [ Minimal Telemetry Ticker: 20px ]                           |
+--------------------------------------------------------------+
```

### 2.2 Right Rail Action Bar Specification (`RuleRightToolbarPanel.tsx`)
- **Primary Action**: `Run Full Inspection` (`bg-gradient-to-r from-emerald-500 to-teal-500 py-2 font-bold text-black shadow-lg shadow-emerald-500/20`).
- **Single Rule Test**: `Test This Rule` (`bg-slate-800 hover:bg-slate-700 text-cyan-300 py-1.5 border border-cyan-500/30`).
- **Delete / Safety Action**: `Delete Rule` (`text-rose-400/70 hover:text-rose-300`).

### 2.3 Minimal Status Ticker (`WorkpieceAnalyzeWorkspace.tsx`)
- Container: `h-[22px] px-3 border-t border-white/[0.06] bg-black/40 font-mono text-[10px] text-white/40 flex items-center justify-between`.
- Left Telemetry: Pulse indicator (`bg-emerald-400` / `bg-amber-400 animate-ping`), source status (`LIVE CAMERA` / `REF IMAGE`), active rules count, system version.
- Right Telemetry: Hidden file input for image import with micro trigger button (`text-[10px] py-0.5 px-2`).
