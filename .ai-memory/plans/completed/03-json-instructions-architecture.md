# Master Architectural Plan: JSON Instructions & Machine Control Architecture

**Slug:** json-instructions-architecture  
**Sequence:** 03  
**Status:** `[COMPLETED]`  
**Completed Date:** 2026-09-22  
**Branch:** `feature/jsoninstruction` (created from `origin/feature/21-sep-26-joy-greyscale-pattern-matching`)  
**Budget Utilized:** N=200 steps (Phase 1: 100 steps, Phase 2: 100 steps)  

---

## User Request (Verbatim)

```text
D:\work\cat-my\docs\jsonInstructions

Hi there. I want you to read these JSON files first and read the latest changes from the latest branches. I think the latest branch is feature/21sep. Okay, so that is kind of the latest branch. Okay. You can go to the latest branch with this file. So what you should do is, let's say, feature/jsoninstruction, create a branch where it should start from that feature 21 September's branch, okay? And with these JSON files. So that's the first thing. Second, I want you to understand the JSON format, how it is done, and the latest changes. What do you think of this JSON? Are we missing anything? Also, I want you to add a README file that actually explains this instruction. Also, along with that, I want you to create other instruction formats. What do I mean by that? Is that how to just change the camera of the instructor with the action and attributes. So the format should be all the same attributes and data inside, let's say, to have those commands. Yeah, so the lighting, gray scaling, how many lights we want to enable. DRI1000 is the machine or camera we are trying to use. So find those handler items that you know how to deal with it, if you know. So try to add those in the JSON. Can you please do that and document it, like anyone who reads this README file, they would understand what this JSON actually represents. If you have any question and ambiguity, I will discuss it later. Do you understand? Can you please do that for me? And do not wait for me. Whatever I'm just saying, you should proceed with the first spec writing, and then in the execution means you write more JSON instructions in this folder. Okay? The 0102 sequence, and then hyphen, hyphen, name lowercase. Is it clear?
```

---

## Completed Actionable Tasks

1. **Task-01: Git Branch Ingestion & Branch Creation (`feature/jsoninstruction`)**
   - **State:** `[COMPLETED]`
   - **Outcome:** Switched to remote base `origin/feature/21-sep-26-joy-greyscale-pattern-matching` and created working branch `feature/jsoninstruction` while cleanly preserving the `docs/jsonInstructions/` directory.

2. **Task-02: Existing JSON Instructions Ingestion & Architectural Evaluation**
   - **State:** `[COMPLETED]`
   - **Outcome:** Deep structural audit of `cat_handler_communication.json` and `handler_action.json`. Identified architectural strengths (two-tier envelope, microsecond timing schedule, explicit hardware interfaces) and crucial gaps (missing `correlationId`, missing physical machine chassis profile, lack of modular single-purpose command files).

3. **Task-03: Machine & Hardware Domain Ingestion (DRI1000, Camera, Lighting, Grayscaling)**
   - **State:** `[COMPLETED]`
   - **Outcome:** Integrated hardware specifications for the DRI1000 inspection workstation, Basler/Daheng GigE cameras, Gardasoft CC320 4-channel overdrive strobe controller, and the 2-bit grayscale quantization engine (levels 0, 85, 170, 255; threshold cutoff at 170; 31-box pattern constellation matching).

4. **Task-04: Author Comprehensive Specification & Reference Guide (`docs/jsonInstructions/readme.md`)**
   - **State:** `[COMPLETED]`
   - **Outcome:** Authored a 19.8 KB production-grade technical reference manual covering system architecture, hardware entities, 2-bit math, message envelope field dictionaries, gap analysis, execution timelines with Mermaid diagrams, standardized error codes (`E_*`), and file catalogs.

5. **Task-05: Author Sequential Modular JSON Instructions (`01-` to `06-` Lowercase Kebab-Case)**
   - **State:** `[COMPLETED]`
   - **Outcome:** Generated 6 standardized JSON files adhering strictly to the uniform `attributes` / `data` schema:
     - `01-camera-configuration.json`
     - `02-lighting-control.json`
     - `03-grayscale-thresholding.json`
     - `04-dri1000-machine-cycle.json`
     - `05-handler-action-dispatch.json`
     - `06-cat-handler-communication.json`

6. **Task-06: Task Consolidation, Quality Verification & Atomic Git Push**
   - **State:** `[COMPLETED]`
   - **Outcome:** 100% syntactically verified via Python `json.load()`, verified zero boolean guideline violations, updated memory indices, and prepared atomic git commit.

---

## Architectural Manifest & Delivered Files

```
docs/jsonInstructions/
├── 01-camera-configuration.json       # Standalone sensor reconfiguration (exposure, gain, ROI, trigger)
├── 02-lighting-control.json           # 4-channel strobe lighting control (Gardasoft CC320, overdrive)
├── 03-grayscale-thresholding.json     # 2-bit grayscale LUT & 31-box constellation template rules
├── 04-dri1000-machine-cycle.json      # Complete synchronous DRI1000 inspection cycle with pneumatic reject
├── 05-handler-action-dispatch.json    # Standardized 5-step action dispatch with correlation tracing
├── 06-cat-handler-communication.json  # Standardized 3-device inspection result feedback payload
├── cat_handler_communication.json     # Baseline inspection result payload (preserved)
├── handler_action.json                # Baseline 5-action handler dispatch (preserved)
└── readme.md                          # Exhaustive reference documentation & architecture guide
```

---

## Verification & Compliance Record

1. **Syntax Validation**: Python `json.load()` executed across all `docs/jsonInstructions/*.json` files with 0 syntax errors.
2. **Boolean Standard**: Verified all boolean keys use positive-framing `is*` or `has*` without exception.
3. **Execution Guardrails**: Zero test runner executions (`pytest`, `go test`), zero build executions (`npm run build`), zero per-file commits.
