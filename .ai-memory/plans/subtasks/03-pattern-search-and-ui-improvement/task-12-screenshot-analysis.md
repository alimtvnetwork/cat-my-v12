# Task 12 — Screenshot analysis

Slug: pattern-search-and-ui-improvement - Task 12

Status: DONE (31-Oct-26).

## Scope

Analyze the nine operator screenshots (sent as prnt.sc links) for menu
glitches, pattern-search failures, and simulation defects.

## Evidence produced

- Browser task viewed all 9 links successfully; nothing changed on the
  pages.
- Findings recorded in the spec readme (links plus one-line finding
  each), because the screenshots arrived as links, not uploads, so no
  PNG files were stored under assets/.

## Key findings (summary)

- Dominant thread: Res Mismatch warnings (1042x403, 392x373, truncated
  "10…" vs calibrated 960x540); ROI 930x174 drawn larger than the loaded
  image; 49 pattern boxes spilling into black canvas.
- Rule 2 fails with "missing saved pattern boxes"; 2/2 rules FAILED;
  workspace REJECTED.
- Simulation view blank render (event toolbar only).
- Tool parameters exist and render (Threshold 151, Tolerance 8px,
  Margin 8px, Target Count 1) — failure is upstream of the sliders.
- Menu dropdown delay does not show in stills; needs code investigation
  (Task 08). Red rectangles in the shots are the operator's own
  annotations, not app UI.

## Acceptance

- [x] All 9 screenshots viewed and findings recorded.
- [x] Findings connected to root causes (RC1 visible live in the ROI
  overflow shot).
