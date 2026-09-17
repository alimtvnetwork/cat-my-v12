---
name: backend-mode-toggle-and-sdk-facade
description: Architecture and workflows for backend mode toggle, SDK facades, BE directory, and dev launchers (Command 40 / Plan 88).
---

# Backend Mode Toggle & SDK Facade Architecture

## Overview
Governs dual runtime architecture (Seed mode vs Backend mode) and vendor SDK encapsulation.

## Key Invariants
1. `BE/` at repository root hosts FastAPI backend services.
2. `sdk/` contains raw vendor SDK binaries and manuals — NEVER edit in place.
3. `BE/sdk_facade/` provides clean facade wrappers for backend use.
4. `src/lib/sdk-facade/` / domain facades provide frontend abstractions.
5. Mode toggle lives on the homepage and Settings, persisting backend base URL (`http://localhost:8787` default).
6. Write gate: all mutating actions must pass `runBackendWrite` in `src/lib/data-source/gate.ts`.
