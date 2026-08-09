# SS-02 — Resolve externalized asset for local analysis

**Parent plan:** `.lovable/plans/pending/01-learn-tools-images.md` (step 2/15)
**Status:** done — 2026-07-09

## Root cause of the gap

`assets/tools-images/20260629_173118.jpg` was replaced by an `.asset.json`
pointer because the original exceeds the 10 MB in-repo asset limit. Any
downstream visual pass that only iterates the repo folder would silently
skip this file.

## Resolution

Fetched the binary from the preview host and staged it OUTSIDE the repo so
we don't retrigger the size-limit externalization.

- Pointer: `assets/tools-images/20260629_173118.jpg.asset.json`
- Asset ID: `275af50f-cbe2-4193-b385-933e17628678`
- Preview URL used: `https://id-preview--ca39d4c4-cddd-4c2e-b77f-74c2ded7bb5f.lovable.app/__l5e/assets-v1/275af50f-cbe2-4193-b385-933e17628678/20260629_173118.jpg`
- Local staged copy: `/tmp/img-analysis/20260629_173118.jpg`
- Verified: 10,552,187 bytes, JPEG 4000×3000 RGB (matches pointer `size` + `content_type`).

## Note for step 3

When enumerating references, use the union of:

1. `assets/tools-images/*.jpg` (49 files), plus
2. `/tmp/img-analysis/20260629_173118.jpg` (1 file).

Total = 50 images, matching the original upload count.
