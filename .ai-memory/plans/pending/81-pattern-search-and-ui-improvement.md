# Plan — 81-pattern-search-and-ui-improvement

Slug: pattern-search-and-ui-improvement
Spec: 02-spec/21-app/81-pattern-search-and-ui-improvement/readme.md
Status: implementation landed. Spec 55 remains the analysis slot.

## Subtasks

- 01-pull-heatmap — gitmap pull, then heatmap status before edits.
  Slug: pattern-search-and-ui-improvement - Task 01
- 02-spec-and-catalog — module 81 readme, root cause, consistency
  report, and the 100/200 catalog. One confirmed row: unsaved paint boxes.
  Slug: pattern-search-and-ui-improvement - Task 02
- 03-persist-boxes — write the Atmel 24-box set and the squared search
  region into rule.params. Rebase only when an authored frame is stored
  and the image size differs.
  Slug: pattern-search-and-ui-improvement - Task 03
- 04-square-roi-toolbar — pattern ROI starts square and unlocked.
  Toolbar sits inside the ROI.
  Slug: pattern-search-and-ui-improvement - Task 04
- 05-wire-luminance — greyscale slider and the tester both call
  applyLuminanceFilter on a copied buffer. BT.601.
  Slug: pattern-search-and-ui-improvement - Task 05
- 06-source-menu — one portaled source picker. Inline preset buttons removed.
  Slug: pattern-search-and-ui-improvement - Task 06
- 07-run-and-version — run.ps1 and run.sh skip a second browser.
  Status line shows version.json. Minimize leaves fullscreen without the
  browser-mode toast.
  Slug: pattern-search-and-ui-improvement - Task 07

## Out of scope

No version bump. No rewrite of spec 55. Open V2 ambiguities stay open.
The catalog is not an implementation queue.
