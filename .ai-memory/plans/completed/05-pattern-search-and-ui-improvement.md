# Plan — 05-pattern-search-and-ui-improvement

Slug: pattern-search-and-ui-improvement
Spec: 02-spec/21-app/05-pattern-search-and-ui-improvement/01-architecture-spec.md
Status: COMPLETED across all 8 sequential phases.

## Overview

Comprehensive stabilization and performance optimization of CAT Vision SMT pattern search, carrier tape pocket segmentation, Photoshop-style layer interaction, Chromium `--app` window controls, menu performance, and runner script discipline.

---

## Subtasks & Outcomes

- 01-rca-and-discovery — Forensic root cause analysis covering all 10 reported failure modes: pattern box persistence, wide rectangular ROI in guided simulation, empty carrier tape pocket rendering, grayscale/luminance distortion, rotation search instability, menu dropdown positioning collision, window control sandbox constraints, run script browser duplication, version display omissions, and layer movement inversion.
  Slug: pattern-search-and-ui-improvement - Task 01
  Status: COMPLETED

- 02-author-100-ui-and-200-pattern-improvements — Author the exhaustive catalog containing 100 UI improvements and 200 pattern-search layering possibilities, enumerated and prioritized with concrete technical impact scores and implementation references.
  Slug: pattern-search-and-ui-improvement - Task 02
  Status: COMPLETED

- 03-architecture-spec-authoring — Author formal architectural specifications defining coordinate space normalization, the 1:1 Square ROI Contract, Mermaid sequence diagrams for workpiece vs carrier simulation, zero-transform menu portal contracts, and SplitDB error envelopes.
  Slug: pattern-search-and-ui-improvement - Task 03
  Status: COMPLETED

- 04-fix-carrier-simulation-and-square-roi — Remediate carrier tape simulation and square ROI constraints. Enforce square ROI in `usePatternMatchingRule.ts` and `VisualToolWorkpieceCanvas.tsx`, suppress pattern boxes over empty pocket cavities, add interactive floating in-canvas toolbar in `PatternMatchCanvas.tsx`, enable pocket click hit-testing in `CarrierTapeSimulationCanvas.tsx`, and widen Pin 1 search kernel with decoupled Rule 2 diagnostics in `carrier-tape-evaluator.ts`.
  Slug: pattern-search-and-ui-improvement - Task 04
  Status: COMPLETED

- 05-fix-greyscale-pattern-matcher — Overhaul luminance and pattern matching pipeline in `luminance-quantizer.ts`, `white-box-marking.ts`, and `pattern-matcher.ts`. Standardize on ITU-R BT.709 with linear gamma expansion LUT, fix 2-bit quantization contrast crushing, stabilize rotation search around Pin 1 angle, and ensure pattern boxes are saved and parsed without coordinate loss in `RuleToolConfigPanel.tsx` and `workpiece-rule-analyzer.ts`.
  Slug: pattern-search-and-ui-improvement - Task 05
  Status: COMPLETED

- 06-fix-ui-menu-and-window-controls — Resolve UI menu dropdown glitch and window control sandbox restrictions. Strip conflicting CSS transform classes from `dropdown-menu.tsx`, set `modal={false}` on source dropdown in `AnalyzeImageToolbar.tsx`, wire honest window controls in `WindowControlButtons.tsx`, fix layer reordering direction physics in `PhotoshopLayersPanel.tsx`, and add "New Region / Rectangle" button.
  Slug: pattern-search-and-ui-improvement - Task 06
  Status: COMPLETED

- 07-optimize-run-scripts-and-version-display — Optimize `run.ps1` and `run.sh` to enforce single-instance browser execution, pre-warm `/cat-logo.svg` route assets, and display `APP_VERSION_INFO.version` badge prominently across `/run` and HMI industrial headers.
  Slug: pattern-search-and-ui-improvement - Task 07
  Status: COMPLETED

- 08-verification-and-gitmap-commit — Execute full test verification suite (`workpiece-rule-analyzer.test.ts`, `luminance-quantizer.test.ts`, `default-rules-eval.test.ts`, `pocket-portability.test.ts`, `test-presets.test.ts`), verify zero regressions, update registries, and commit cleanly via GitMap hyphen-separated atomic batches.
  Slug: pattern-search-and-ui-improvement - Task 08
  Status: COMPLETED
