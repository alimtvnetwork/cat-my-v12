# SS-03 — Cluster reference images

**Parent plan:** `.lovable/plans/pending/01-learn-tools-images.md` (step 3/15)
**Status:** done — 2026-07-09

## Method

Per-image features extracted with PIL: dimensions, orientation, 32×32 mean RGB,
capture timestamp (from filename), file size. Grouped by time gap >25 s, then
sub-split by file-size step-change within a group.

## Result — 3 clusters (50 images)

### Cluster A — Overview shots (n=32, 17:25:21 → 17:28:17)

Files `20260629_172521.jpg` … `20260629_172753.jpg`.
Landscape 4000×3000. Mean tone `#6d6e6d`. File size ~3–4 MB (lower JPEG
entropy → wider framing / less fine detail). Sequential 3–20 s intervals →
looks like a continuous walk-around of a subject.

### Cluster B — Detail / close-ups (n=11, 17:28:46 → 17:30:19)

Files `20260629_172809.jpg` … `20260629_173019.jpg`.
Same 4000×3000 landscape but file size jumps to ~7–9 MB and mean tone drops
to `#5b5c5b` (darker) → closer crops, more surface detail, tighter framing.

### Cluster C — Second subject / angle set (n=7, 17:31:11 → 17:32:26)

Files `20260629_173111.jpg` … `20260629_173226.jpg` (includes the
externalized `20260629_173118.jpg`).
Separated from B by a 52 s gap. Largest files (~8–10 MB), tone `#727373`.
Behavior: pause → resume → new sequence, consistent with a second subject or
second batch of the same subject from a different angle set.

## Important reality check

Every image is a **photograph of a physical subject**, not a UI screenshot.
This invalidates the original plan's assumption that steps 5 (typography),
6/7 (UI components/iconography), and 9 (screen types) can be extracted from
these files. Flagged for user decision — see chat message for step 3.
Downstream steps will be re-scoped based on the user's answer before step 4
executes.

## Provenance

- 49 files under `assets/tools-images/`
- 1 externalized file staged at `/tmp/img-analysis/20260629_173118.jpg`
  (see SS-02).
