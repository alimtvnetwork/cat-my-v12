---
Slug: seed-fixtures-per-screen
Parent: 82-plan100-ui-v4-100steps
Status: pending
Created: 2026-07-19
---

# Seed fixtures wired through the facade to every screen

## Goal

Every screen (Home, Projects, Setup, Rules, Test, Run, Settings) must have
testable seed data reachable through the facade. Fix "seeding values don't go
forward" complaint.

## Approach

- `src/lib/seed/index.ts` orchestrates seed for all facades in dependency order:
  swatches → categories → rules → rulesets → cameras → mic settings → projects
  (with references to rulesets + cameras) → image samples (sample PCB, carrier
  tape, blister pack, connector).
- Runs once on first boot; idempotent (guards on facade `.list().length === 0`).
- Adds `seed.reset()` dev command exposed in Command Palette.
- Seed sample images live under `src/assets/samples/` (existing carrier-tape-\*
  assets, plus new sample-pcb and blister-pack references via asset pointers).

## Verification

- Fresh boot → each hub tile lists non-zero counts.
- Rule Set editor renders a reference image + at least 2 rules.
- Test screen runs against seed samples.
