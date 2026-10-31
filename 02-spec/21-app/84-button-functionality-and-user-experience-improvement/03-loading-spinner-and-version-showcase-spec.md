# 03 - Loading Spinner and Version Showcase Specification

## 1. Overview
This specification details the design, placement, visual styling, and lifecycle orchestration of the pre-hydration loading splash screen and dynamic version display.

---

## 2. Visual Design Contract

### 2.1 Aesthetic Archetype: Dark Industrial HMI
- **Background**: Deep obsidian slate (`#090d16`).
- **Brand Identity**: Cat Vision vector logo in cyan (`#06b6d4`) and amber (`#f59e0b`).
- **Typography**: System sans-serif / monospace fallback (`IBM Plex Mono`, `JetBrains Mono`, `system-ui`).
- **Accent Glow**: Subtle radial gradient backdrop in cyan-500/10 (`rgba(6, 182, 212, 0.08)`).

### 2.2 Spinner Physics & Animation
- **Concentric Dual Ring**:
  - Outer ring: `44px` diameter, `2.5px` border, `#1e293b` track with glowing cyan `#06b6d4` spinning arc (`animation: spin 1s linear infinite`).
  - Inner pulse: `20px` diameter, amber `#f59e0b` pulsing beacon (`animation: pulse 1.5s ease-in-out infinite`).

### 2.3 Version Showcase Badge
- Formatted pill badge: `v4.113.15` in cyan `#22d3ee`, surrounded by dark slate border (`border: 1px solid rgba(6, 182, 212, 0.3)`).
- Subtitle: `Autonomous Industrial Inspection System • HMI Embedded App`.

---

## 3. DOM & Hydration Implementation Architecture

### 3.1 Pre-Hydration HTML Injection
In `src/routes/__root.tsx`, the `RootShell` renders the static container:
```html
<div id="app-pre-hydration-splash" class="pre-splash-container">
  <div class="pre-splash-content">
    <div class="pre-splash-logo-wrap">
      <img src="/cat-logo.svg" alt="Cat Vision" class="pre-splash-logo" width="48" height="48" />
    </div>
    <div class="pre-splash-spinner-wrap">
      <div class="pre-splash-spinner"></div>
    </div>
    <div class="pre-splash-title">CAT iVISION</div>
    <div class="pre-splash-badge">v4.113.15</div>
    <div class="pre-splash-status">Initializing Industrial Inspection Engine…</div>
  </div>
</div>
```

### 3.2 Smooth Fade-Out & Teardown
A dedicated React hook (`useSplashDismissal`) fires after initial component mount:
1. Waits for React state stores and DOM readiness (`requestAnimationFrame`).
2. Adds class `.pre-splash-fade-out` (`opacity: 0; transition: opacity 250ms ease-out`).
3. Dispatches DOM unmount after `250ms`, removing `#app-pre-hydration-splash` from `document.body`.
