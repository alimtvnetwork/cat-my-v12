---
name: read-memory-enhanced
description: Memory retrieval, git history inspection, and project context ingestion workflow for Antigravity agents.
---

# Memory Retrieval & Ingestion Workflow

## Purpose
Ingests and internalizes project identity, specifications, conventions, active plans, recent git commit history, and Root Cause Analysis (RCA) records before beginning any task.

## Mandatory Steps
1. Inspect last 10 git commits via `git log -n 10 --stat` and analyze file diffs.
2. Read `.lovable/what-to-read.md` first as the authoritative priority list.
3. Verify root `readme.md` is strictly lowercase (auto-fix if necessary).
4. Survey `.lovable/`, `spec/`, and application codebase end-to-end.
5. Ingest CODE RED rules, naming conventions, error-handling contracts, and active DB schemas.
6. Verify active pending plans in `.lovable/plans/pending/` and cross-verify with disk.
7. Confirm zero violations against `.lovable/strictly-avoid.md`.
