# Pattern Search and UI Improvement — Root-Cause Fix Spec

**Status:** Draft.
**Created:** 31-Oct-26.
**Branch:** `fix/4-oct-26-joy-optimization-and-project`.
**Parent spec:** `.ai-memory/plans/completed/01-pattern-search-spec.md` — the
authoritative pattern-search build spec. This folder does not re-derive that
screen; it fixes the layers underneath it that broke pattern search, plus the
reported UI, run, and installation defects.
**Plan:** `.ai-memory/plans/pending/03-pattern-search-and-ui-improvement.md`.
**Subtasks:** `.ai-memory/plans/subtasks/03-pattern-search-and-ui-improvement/`.

## Root causes (established 31-Oct-26, three research tracks)

- **RC1 — Four coordinate spaces, zero conversion.** Editor 1280x720
  (`IMAGE_BOUNDS`), pattern 960x540, simulation 512x288, raw camera pixels.
  No file converts between them. A region drawn in one space and evaluated in
  another lands in the wrong place. Simulation added the third space and a
  second evaluation path — that is when behavior changed.
- **RC2 — Grayscale is four disagreeing implementations.** Backend numpy
  fallback swaps red/blue weights on BGR images; the threshold preview is
  half-binarized; threshold resolves from a 6-key chain (170) vs pin-one 35
  vs hardcoded matcher 22 vs backend 40; the backend adjusts the sample but
  never the reference.
- **RC3 — The matcher cannot search, the model is fragmented, dispatch is
  substring-fragile.** The 24-box matcher measures luma only at expected
  positions (offsets hardcoded 0); one region concept has five
  representations; routing matches rule-name substrings (including the typo
  "greyscle simulation") and checks simulation before pattern; "31 box" data
  does not exist (alias of the 24-box table).

## Files in this folder

- `01-architecture-and-coordinate-unification.md` — RC1: canonical image
  space, conversion contract, zoom/pan purity, backend ROI intake,
  simulation isolation.
- `02-grayscale-luminance-matcher-and-dispatch.md` — RC2 + RC3: one luma
  function, one threshold, sample/reference symmetry, one region
  representation, a matcher that searches, deterministic dispatch, pin-one.
- `03-ui-install-and-run-improvements.md` — window controls, blank
  simulation render, menus, browser auto-open, version display, run
  efficiency, installation, layers, square ROI (new requirement), toolbars
  and icons, preview idioms, worker file boxes.
- `04-one-hundred-improvements.md` — 100 improvement possibilities, 10
  groups of 10, numbered 1–100.
- `05-two-hundred-pattern-search-layering-possibilities.md` — 200 layering
  possibilities, 10 groups of 20, numbered 1–200.

## Evidence base

- Three read-only research tracks (31-Oct-26): pattern pipeline and blast
  radius; specs and dependency mapping; UI/UX, installation, and run.
- Nine operator screenshots (prnt.sc, viewed 31-Oct-26, descriptions and
  links recorded here instead of image files because they arrived as links):
  - `73ZlAL4m8xuv` — mid-scan "ANALYZING IMAGE…", no error.
  - `dk5te8WiGgP6` — Res Mismatch 1042x403 vs calibrated 960x540; Rule 1
    Pin 1 Orientation FAIL 50%, Rule 2 FAIL 0%, workspace REJECTED.
  - `o8WD6e5hEeXV` — Rule 2 fails: "missing saved pattern boxes".
  - `pIwgGiDJeNgB` — same "missing saved pattern boxes" failure.
  - `TvS6NS8cnebo` — pattern region 868x174 / ROI 930x174 drawn larger
    than a 392x373 image; 49 pattern boxes spill into black canvas; LOCKED.
  - `TustaDh6yYPl` — simulation view blank render (event toolbar only).
  - `NTvwm5-V03gZ` — tool parameters visible (Threshold 151, Tolerance
    8px, Margin 8px, Target Count 1); controls exist, failure is upstream.
  - `9XRhmb31cI_S` — Pocket 5 strip source, first pocket empty; truncated
    Res Mismatch warning; stray tab behind the event toolbar.
  - `TYziH2M8bS0v` — menu glitch / exit view (same frame family as above).
- Recurring values: ROI X 49, Y 158, W 930, H 174; rules Pin 1
  Orientation T105 and Greyscale Pattern T102 DEMOSET.

## Must not contradict (priority order)

1. `.ai-memory/plans/completed/01-pattern-search-spec.md` §0 rules and §11
   acceptance criteria (DRY single source of truth, Modern UI untouched,
   presentation-only branching, exactly 4 fixed mask slots in Standard vs
   unlimited in Modern on the same array, never silently discard extra
   Modern layers, image-pixel geometry, §12 unknowns un-invented).
2. `02-spec/21-app/32-shape-model.md` (single geometry source of truth).
3. `02-spec/21-app/35-zoom-and-pan.md` (zoom/pan are pure view transforms).
4. `02-spec/21-app/62-rule-mask-image.md` (mask BT.601 contract).
5. `02-spec/24-app-ui-design-system/40-menu-anti-jitter.md` (no hover layout
   shift; MenuItem only primitive).
6. `02-spec/26-design-system-reverse-engineered/06-preview-mechanisms.md`
   (idiom A for setup, idiom D for editor; B and C legacy, do not extend;
   Standard Mode grayscale tokens are by design).
7. `02-spec/24-app-ui-design-system/04-rule-layers.md` plus
   `.ai-memory/plans/completed/35-ui-ux-photoshop-layers-overhaul.md`
   (editor stack index 0 = bottom; mask slots index 0 = top — scoped per
   surface, never merged).
8. `02-spec/22-app-issues/01-vision-inspection-ambiguities.md` (AI-01 shell
   unresolved, AI-04 shapes v1).
9. Repo `AGENTS.md` (Lovable-connected: never rewrite pushed history;
   strict is/has booleans; parameter structs; 5–8 file micro-batching).

## Open questions — ASK, DO NOT INVENT

- Who or what is "George" / the "Yasi and George release"? Zero hits in
  the repo (4,735 files searched). Do not cite it until the user identifies
  it.
- Square ROI scope: search region, pattern region, masks, or all three?
  Enforced at draw, resize, or validation time? File 03 §9 holds the
  question; it is a new requirement, not an existing invariant.
- Which grayscale path is reported broken — theme (by design), mask
  threshold, or pattern-match conversion? File 02 §10 gives the diagnostic
  to answer empirically.
- The parent spec §12 unknowns (Unit Time, zoom 100% reference, `1 - 000`
  semantics, Image Region purpose, Extract Colors, expander contents,
  Counts, view-mode icons) are carried forward unanswered.
- No prior root-cause document for pattern search breaking after
  simulation exists in the repo. The user's "mentioned several times"
  claim is not corroborated in any doc; prior root causes on record are
  adjacent UI issues only (Standard layout/buttons, menu jitter, handle
  lag, zoom reflow, CI test exclusion).

## Collisions with the in-flight 02-cicd-remediation task

- Do not touch `linter-scripts/` or `scripts/check-magic-strings.sh`.
- Coordinate on `BE/app/installer_path.py` (02 owns it; 03 workers own
  installer wrappers and `bin/*` only).
- Sequence `src/components/app-shell/` edits before SS-04 regenerates
  visual baselines.
- The active RC Heatmap task is `02-cicd-remediation`; 03 workers log
  their own touches and avoid its files.
