# JSON schema and bundle design for UI seed data

Slug: json-schema-and-bundle
Status: pending
Created: 2026-07-19
Parent: 86-ui-v4-json-seed-facade-completion

## Scope

Design the canonical JSON seed bundle before implementation. The bundle must be deterministic, idempotent, and explicit about relationships so routes, Playwright, unit tests, and future real API migrations use the same data contract.

## Required slices

- profiles
- projects
- ruleSets
- rules
- categories
- cameras
- micSettings
- imageSamples
- swatches
- propertiesPresets
- settings
- commandPaletteEntries
- emptyStates
- errorScenarios
- visualStates

## Acceptance

Every slice has stable ids, foreign-key-style references, seeded timestamps where needed, and migration notes for how the facade can later replace JSON-backed data with endpoint-backed data.
