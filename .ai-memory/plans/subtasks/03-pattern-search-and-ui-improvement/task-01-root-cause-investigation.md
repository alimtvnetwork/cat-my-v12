# Task 01 — Root-cause investigation

Slug: pattern-search-and-ui-improvement - Task 01

Status: DONE (31-Oct-26).

## Scope

Establish the root causes of the pattern-search, grayscale, luminance,
layering, ROI, and simulation failures before any code change.

## Evidence produced

- Three read-only research tracks (gitmap search only, no code touched):
  pattern pipeline and blast radius; specs and dependency mapping; UI/UX,
  installation, and run.
- Nine operator screenshots analyzed (prnt.sc links and findings in the
  spec readme).

## Findings (summary; full text in spec files 01–03)

- RC1: four coordinate spaces (1280x720 editor, 960x540 pattern, 512x288
  simulation, raw camera pixels), zero conversion between them.
- RC2: four disagreeing grayscale/luminance implementations, half-binarized
  threshold preview, fragmented threshold keys, sample/reference asymmetry.
- RC3: fragmented region model, matcher with no translation search,
  substring dispatch checking simulation before pattern ("greyscle" typo),
  31-box alias with no real data.
- Corrections: no prior root-cause document for this failure exists in the
  repo; "George" has zero hits anywhere (unattested); three distinct
  grayscales must not be conflated.

## Acceptance

- [x] Root causes stated with file:line evidence.
- [x] Screenshot findings folded into the spec readme.
- [x] Open questions recorded, not invented.
