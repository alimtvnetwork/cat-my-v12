# Specification 82: Professional CLI Runner (`run.ps1`)

## Overview & Visual Design
The development launcher `run.ps1` must match the visual polish and ergonomic standard of the `gitmap` CLI:
- Double-lined ANSI box banner displaying product name, version, and core service URLs.
- Padded status indicators with colored glyphs:
  - `✓ [ok]` in green for completed stages.
  - `↓ [pull]` in cyan for dependency updates.
  - `⚡ [run]` in yellow for active listeners.
  - `● [sup]` in magenta for background supervisor threads.
- Clean process monitoring loop that detects browser window closure or backend exit, performing immediate cleanup of listening ports and subprocesses without hanging.

## Banner Format Example
```text
  [cat]  CAT iVISION  v4.113.12  — Autonomous Industrial Inspection System
  ────────────────────────────────────────────────────────────────────────────
  ● Backend URL:    http://127.0.0.1:8787
  ● Frontend URL:   http://127.0.0.1:5173
  ● Mode:           Industrial Inspection HMI (Chromium Embedded App)
  ● Branch:         main (1a03ea3)
  ────────────────────────────────────────────────────────────────────────────
```
