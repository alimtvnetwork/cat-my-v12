---
title: Vision Inspection App — Open Ambiguities Log
slug: vision-inspection-ambiguities
source: spec/21-app/01-initial-instructions.md
---

# Open Ambiguities — Vision Inspection App

Reserved by Plan 04 Step 8. Each unresolved question surfaced during spec authoring is filed here as `spec/22-app-issues/AI-<nn>-<slug>.md`. This overview tracks the shortlist so downstream steps have one place to look before assuming a default.

## Convention

- ID: `AI-01` … `AI-99` (Ambiguity Item).
- File per ambiguity: `AI-<nn>-<slug>.md` with sections: Context, Question, Options, Impact if Unresolved, Provisional Default, Owner, Status.
- Status: `open | provisional | resolved | wontfix`.

## Current Log

| ID    | Slug                    | Question                                                                      | Provisional Default                                        | Blocks                          |
| ----- | ----------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------- |
| AI-01 | shell-runtime           | Chromium-embed shell: Python+CEF, Tauri, or Electron?                         | `TBD — shell-agnostic UI`                                  | Step 9 (stack section), Step 11 |
| AI-02 | ai-validation-provider  | AI validation via Lovable AI Gateway or provider-agnostic HTTP?               | Provider-agnostic contract                                 | Step 40, Step 43                |
| AI-03 | worker-defaults         | Default `WorkerCount` × `BatchSize`?                                          | 8 × 3 (recorded in Step 5 digest)                          | Step 13, Step 24                |
| AI-04 | region-shapes-v1        | v1 shapes: rectangle + ellipse only, or include polygon/freeform?             | Rectangle + ellipse; polygon deferred                      | Step 27, Step 32                |
| AI-05 | rules-override-cascade  | Rules override: Task-only, or also Job-level cascade?                         | Task-only (matches Split-DB spec 05)                       | Step 20, Step 23                |
| AI-06 | capture-target-platform | Target OS: Windows-only, Linux-only, or both?                                 | Both, Windows primary                                      | Step 22 (naming), Step 39       |
| AI-07 | image-blob-store        | Where do captured images live: filesystem folders only, or object store?      | Filesystem folders per Step 17                             | Step 14, Step 17                |
| AI-08 | task-vs-job-terminology | Source uses "Program" (image 43); we lock "Task" — confirm rename in UI copy. | Rename to Task; keep "Program" as legacy alias in glossary | Step 25, Step 43                |

## Escalation

- `open` items must be either resolved or downgraded to `provisional` (with a written default) before their blocking step executes.
- Resolutions land as a new `98-changelog.md` entry when Phase F closes.
