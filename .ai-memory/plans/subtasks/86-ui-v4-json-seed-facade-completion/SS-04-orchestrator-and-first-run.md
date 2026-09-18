# Seed orchestrator and first-run behavior

Slug: orchestrator-and-first-run
Status: pending
Created: 2026-07-19
Parent: 86-ui-v4-json-seed-facade-completion

## Scope

Implement a single seed orchestrator that reads JSON profiles and writes every facade in relationship-safe order. First-run behavior must seed the default profile only when the app has no existing project data, and it must not run during server prerender.

## Required order

1. Categories
2. Rules
3. Rule Sets
4. Cameras
5. Mic Settings
6. Swatches
7. Image Samples
8. Projects
9. Settings, command entries, empty-state examples, error scenarios, and visual states

## Acceptance

Running the same profile twice produces no duplicate rows and does not clobber user edits outside the targeted seed profile.
