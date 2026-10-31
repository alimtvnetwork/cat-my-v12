# Consistency report

Date: 2026-10-31. Module 81. Slug `pattern-search-and-ui-improvement`.

## Checked

- Confirmed cause is unsaved paint boxes. Catalog row L041 is the only
  confirmed row. Rows I001–I100 and L001–L200 except L041 stay a catalog.
- Spec 55 stays in place as the analysis slot. This module does not
  delete or rewrite it.
- Open V2 questions in `03-v2-enhancement-open-decisions` and
  `04-plan77-dispatch` are not answered here.
- Square ROI applies to this pattern ROI only.
- Version stays `4.113.9` from `version.json`. The status line reads
  `APP_VERSION_INFO.version`.
- Paths in this module are repo-relative.
- The luminance path used is BT.601 inside `applyLuminanceFilter`.

## Result

The tester, the canvas pin, and the standard pattern tool now write
`referenceBoxes` and the search region. The source menu is the portaled
dropdown. `run.ps1` and `run.sh` skip a second app window when that
window is already open.
