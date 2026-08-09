# Issue 10: Rules section header, reduce left padding + 4 UI proposals

## Context

> reduce the left padding and suggest 4 UI for this heading

User highlighted the "RULES · 4" sticky section header inside the Layers panel and asked for a tighter left gutter plus four alternative header treatments to pick from.

## Fix shipped

- `src/styles.css` `.editor-layer-section-head` left padding: `12px -> 6px`. Header now sits flush with the tab-strip gutter instead of appearing indented.

## Evidence

- Source: `assets/ui/60-rules-section-header.png` (user screenshot).
- Proposals rendered from a real HTML/CSS mockup:
  - v1 Minimal icon + count pill: `assets/ui-suggestions/02-rules-header-v1.png`
  - v2 Collapsible chevron + inline meta + Add: `assets/ui-suggestions/02-rules-header-v2.png`
  - v3 Accent stripe + filled purple count chip: `assets/ui-suggestions/02-rules-header-v3.png`
  - v4 Segmented tabs (Rules / Categories) inline: `assets/ui-suggestions/02-rules-header-v4.png`

## Status

Padding fix: shipped in v3.968.0. Header redesign: awaiting user pick.
