---
name: Plan 73 issue 17 repro
description: Measurement pass on top-nav hover jitter and padding density.
type: reference
---

# Issue 17 repro (Plan 73 step 4)

Route: `/setup` at 1280x1800, dark theme, dev build.

## What was measured

Script: `/tmp/browser/plan73/issue17_before.py`. For each `role=menuitem` in the Titlebar, capture `boundingBox` at rest, hover for 120ms, capture again.

```
Home    rest_w=50 hov_w=50 dx=0 dw=0
Project rest_w=57 hov_w=57 dx=0 dw=0
Setup   rest_w=49 hov_w=49 dx=0 dw=0
Rules   rest_w=48 hov_w=48 dx=0 dw=0
Test    rest_w=40 hov_w=40 dx=0 dw=0
Run     rest_w=38 hov_w=38 dx=0 dw=0
```

## Findings

1. Horizontal shift on hover: **zero** on every trigger. Plan 67 step 14 already pinned trigger height to `h-8` and used `transition-colors` only (`src/components/nav/TopMenuBar.tsx:285` and `:361`). The "items shift on hover" symptom the issue reports is NOT reproducible on top-nav in v3.484.0.
2. Padding density: triggers use `px-2` (8px) + `h-8` (32px), text `text-[0.8125rem]`. Item widths 38 to 57 px, gap effectively `gap-hmi-1` at `sm` (`Titlebar.tsx:72`). That is visibly compact; the "cramped" half of the complaint is still valid.
3. Breadcrumb sub-row uses `py-1` inside `var(--header-crumb-h)` (`AppBreadcrumb.tsx:122`). Hover class on links (`app-breadcrumb-link`) is defined in CSS, not measured here.

Screenshot: `/tmp/browser/plan73/17-before.png` (header at rest); `/tmp/browser/plan73/17-before/header_hover.png` (Home hovered). Visual diff shows only background color change, no layout shift.

## Root cause (one sentence)

Top-nav triggers no longer jitter, but their horizontal padding (`px-2`) and inter-item gap are dense enough that the hover wash reads as pinched, which is what the user still calls "cramped, small, feels broken".

## Minimum correct fix (step 5)

In `src/components/nav/TopMenuBar.tsx` at lines 285 and 361: change `px-2` to `px-3`, keep `h-8`, keep `transition-colors`. In `src/components/hmi/Titlebar.tsx:72`: replace `gap-hmi-1 sm:gap-hmi-2` on the right cluster with `gap-hmi-2 sm:gap-hmi-3` so the padding increase does not overflow. No other properties change; hover remains background+color transition only, so the zero-jitter measurement above stays zero after the fix.

## Verification (step 6)

Re-run `/tmp/browser/plan73/issue17_before.py` and assert every `dx==0 dw==0` (unchanged) and item widths grew by ~8px. Attach after-screenshot at `/tmp/browser/plan73/17-after.png`.
