# UI surface coverage for seeded data

Slug: ui-surface-coverage
Status: pending
Created: 2026-07-19
Parent: 86-ui-v4-json-seed-facade-completion

## Scope

Every visible V4 UI surface must render meaningful seeded data through a facade. Empty states remain available, but they are no longer the default result of missing seed coverage.

## Required coverage groups

- Home and Projects hub
- Projects list and Project editor sections
- Rules list, Categories tab, Rule Set editor, and Rule editor
- Properties, Layers, Tools, History, Swatches, Image, Grid, Brush, Type, Paragraph, CSS, and Adjust panes
- Camera and Mic settings surfaces
- Command Palette, settings actions, error surfaces, empty states, badges, and saved-state indicators

## Acceptance

Each surface has at least one deterministic route or test fixture that proves it can render populated data after seed fan-out.
