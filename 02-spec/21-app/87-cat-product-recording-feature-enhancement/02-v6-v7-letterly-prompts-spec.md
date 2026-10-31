# 02 - V6 & V7 Letterly Prompt Specifications

- **Specification ID**: `SPEC-87-02`
- **Module**: `AppRuntime / BugRecorder / PromptSynthesis`
- **Status**: Verified Specification
- **Date**: 2026-10-31

---

## 1. Executive Summary

This specification establishes the automated Markdown prompt synthesizers for the CAT Product Recording feature, modeling prompts directly after GitMap's canonical Letterly prompt architecture.

---

## 2. Prompt Formats

### 2.1 V6 Prompt Structure (Tree Swarm & Hyphen Atomic Commits)
- **Top Header**: N-step budget, Tree Swarm Hierarchy (`A=3, H=2, Capacity=6`), and Secrets Gate.
- **5 Mandatory Pillars**:
  1. Strategic Intent & Systems Reasoning
  2. Scope Boundaries (In-Scope vs. Excluded)
  3. Non-Negotiable Constraints & Negative Guardrails
  4. Blast Radius & Dependency Topology
  5. Multi-Agent Concurrency Topology
- **Step Breakdown**: Sequential event table capturing user actions, timestamps, XPaths, and target components.
- **IDE File References**:
  `[step-<NN>-<action>-<component>](file;<absolute-path>)`
- **Non-Asset Storage Invariant**:
  `> [!IMPORTANT] Never save these diagnostic screenshots inside the codebase or assets/ directory. These artifacts exist strictly in .logs/ for AI diagnosis and ephemeral learning.`

### 2.2 V7 Prompt Structure (Dual Operating Mode & Bot Governance)
- **Dual Operating Modes**: Option 1 (Time-restricted window) & Option 2 (Unrestricted).
- **Automation Bot Governance**: Single-user AI bot identity standards.
- **Telemetry & Diagnostic Context**: SQLite Split-DB errors with full tracebacks.
