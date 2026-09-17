# Learned Memory: Read Memory Enhanced & Context Ingestion

**Date:** 2026-09-17  
**Slug:** read-memory-enhanced  
**Version:** 2.1.0  
**Status:** Ingested & Verified  

---

## 1. Repository Knowledge Base Metrics
- Total markdown files in `spec/`: 879 files across 26 major modules (`01-spec-authoring-guide` through `25-app-audit`).
- Total markdown files in `.lovable/`: 697 files across memory, plans, prompts, issues, and spec commands.
- Total memory files in `.lovable/memory/`: 134 markdown files.
- Consolidated guidelines in `spec/17-consolidated-guidelines/`: 33 policy documents.
- Spec authoring files in `spec/01-spec-authoring-guide/`: 17 guideline documents.
- Issues tracked in `.lovable/issues/`: 35 issue tracking records.
- CI/CD issues in `.lovable/cicd-issues/`: 0 files (folder absent on disk, CI remediation tracked in pending plan).
- Open ambiguities in `.lovable/ambiguity-questions/01-new-ambiguity/`: 0 blocking ambiguities.
- Resolved ambiguities in `.lovable/ambiguity-questions/02-ambiguity-resolved/`: 1 resolved record (`01-code-need-to-follow-guidelines.md`).
- Active pending plan in `.lovable/plans/pending/`: 1 plan (`02-cicd-remediation.md`) with 4 active subtasks (`SS-01` to `SS-04`).

---

## 2. Recent Git Evolution (Last 10 Commits)
1. `9ccdeee`: Complete standard mode grayscale styling and navigation consistency, eliminate duplicate navigation headers, update stale setup-reference and setup-roi baselines.
2. `b1580c2`: Fixed standard UI issues across vision components, catalog grid, detail panel, inspection tool dispatchers.
3. `99e987e`: Coding guidelines fix - decomposed monolithic python functions (steps 191-200 in subtask 10).
4. `4d160fd`: Coding guidelines fix - flattened nested ifs and guard clauses across TS and Python (subtasks 08, 09).
5. `a31e817`: Coding guidelines fix - resolved python banned identifiers, typescript swallowed catches, and except handlers (subtasks 05, 06, 07).
6. `424be01`: Coding guidelines fix - resolved enums, nullable booleans, and banned identifiers (subtasks 03, 04).
7. `9f0e3d8`: Coding guidelines fix - resolved inverted booleans across frontend and backend (subtasks 01, 02).
8. `a0b82fb`: Added coding guideline audit and enforcement plan v4 with 10 subtasks.
9. `ddcb26c`: Updates to strictly-avoid.md, spec acceptance criteria, and envelope schema.
10. `9253c00`: Updates to frame artifact and retention writers.

---

## 3. Core Architectural Contracts
- **Dual Runtime**: Seamless toggle between Seed mode (offline JSON fixtures + facades) and Backend mode (`http://localhost:8787` FastAPI).
- **Write Gate**: All mutating actions must pass `runBackendWrite` in `src/lib/data-source/gate.ts`.
- **SDK Facade**: Vendor SDKs in `sdk/` are immutable; interactions flow strictly through `BE/sdk_facade/` and frontend domain facades.
- **Universal Response Envelope**: Every backend response adheres to `{ Status: { IsSuccess, IsFailed, Code, Message }, Attributes, Results, Errors }`.
- **Compound Keys**: Strict requirement to use `KeyboardKeyType.isEnterOrSpace(key)` rather than chaining conditions (`||`).
- **Database Architecture**: Split-DB pattern (RootDb, TaskDb, RulesDb) with PascalCase tables/columns and integer autoincrement primary keys `{TableName}Id`.
