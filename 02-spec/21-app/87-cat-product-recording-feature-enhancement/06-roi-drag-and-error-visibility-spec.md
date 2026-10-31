# 06 - ROI Drag Tracking & Error Model Visibility Specification

- **Specification ID**: `SPEC-87-06`
- **Module**: `AppRuntime / InspectionCanvas / ErrorManagement`
- **Status**: Verified Specification
- **Date**: 2026-10-31

---

## 1. Executive Summary

This specification governs CAD ROI interaction logging and error visibility:
1. **ROI Drag & Resize Metrics**: Recording start-to-end points, pixel coordinates `(x, y, w, h)`, end coordinates, deltas `(dx, dy, dw, dh)`, and explanation.
2. **Prominent Error Visibility**: An accessible Error Management trigger button on the top industrial navbar with live badge count and full diagnostic inspection modal.
3. **Automatic Error Bundling**: All active Split-DB errors are automatically serialized into the generated V6 and V7 prompts.
