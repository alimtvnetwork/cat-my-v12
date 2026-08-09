# SS-01 spec/21-app inventory

Parent: 22-blind-ai-spec-audit-21
Slug: spec21-inventory
Status: pending
Created: 2026-07-14

## Purpose

Produce a canonical inventory of every file under `spec/21-app/` at the time the audit starts, so the audit can guarantee one issue file per spec.

## Actions

1. `ls spec/21-app/*.md` → capture full list.
2. Split into groups by leading number range:
   - 01-09 grounding (initial instructions, authoring rules, glossary, overview, DB conventions digest, split-DB digest, seedable config digest, image index, folder layout check).
   - 10-17 architecture (app overview, system context, runtime processes, shared codebase, worker pattern, capture pipeline, processing pipeline, parallelism guarantees).
   - 20-27 persistence + config surface.
   - 30-39 UI surfaces.
   - 40-46 error, logging, observability, AI stub, security, testing, open questions.
   - 50-52 module map + Facade pattern.
   - 60-72 licensing, v2 vendor + contracts, rule bundle import/export, retention, persistence.
   - 97-99 acceptance, changelog, consistency report.
3. Emit `spec/25-app-audit/inventory.csv` with columns: `path,group,size_bytes,heading_count`.
4. Confirm every file appears in the plan's per-spec issue mapping.

## Verification

- `spec/25-app-audit/inventory.csv` exists and row count equals `ls spec/21-app/*.md | wc -l`.
- No file in `spec/21-app/` is missing from the plan.

## Blind-AI check

The inventory is the ONLY grouping the blind AI will trust; if a file is missing from it, the blind AI has no reason to implement that file.
