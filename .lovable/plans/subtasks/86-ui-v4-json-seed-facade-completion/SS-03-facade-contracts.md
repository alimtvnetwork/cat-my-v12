# Facade contracts for seedable UI data

Slug: facade-contracts
Status: pending
Created: 2026-07-19
Parent: 86-ui-v4-json-seed-facade-completion

## Scope

Define the facade contract additions needed for seed fan-out and testability. Each facade should expose enough API for orchestrated seed, UI reads, UI writes, reset, and deterministic test setup without leaking storage implementation details.

## Required contract capabilities

- `list`, `get`, `create`, `update`, `remove` where relevant.
- `upsertMany` or an equivalent idempotent seed-write primitive.
- `count` for first-run detection.
- `resetProfile(profileId)` or scoped cleanup where destructive reset is needed.
- `subscribe` where the UI needs live updates.

## Acceptance

No component or route imports storage implementation details. Tests can construct memory facades with the same contract as the default app facade.
