# 05 - UI Telemetry, Spring Animation & Intelligent Hover Specification

- **Specification ID**: `SPEC-87-05`
- **Module**: `AppRuntime / BugRecorder / InteractionTelemetry`
- **Status**: Verified Specification
- **Date**: 2026-10-31

---

## 1. Executive Summary

This specification defines the enriched DOM interaction capture engine:
1. **CSS Style & Bounding Metrics**: Capture computed padding, margins, colors, background, border radius, font sizes, bounding rect coordinates, and distance from viewport edges.
2. **Element XPath**: Deterministic absolute and relative XPath derivation.
3. **Magic Spring Click Animation**: Renders an ephemeral physics-based spring ripple with step number badge at click coordinates `(clientX, clientY)` during active recording.
4. **Intelligent Hover Record Mode**:
   - Explicit toggle on floating HUD (`Hover Record`).
   - Restricts capture strictly to interactive elements (`button`, `a`, `role="button"`, `cursor: pointer`).
   - Deduplicates identical targets (records only once per element).
