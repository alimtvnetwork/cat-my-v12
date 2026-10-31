# Subtask: 03-architecture-spec-authoring

Plan: .ai-memory/plans/pending/05-pattern-search-and-ui-improvement.md
Slug: pattern-search-and-ui-improvement - Task 03
Status: COMPLETE

## 1. Objectives & Scope

Author and formalize the complete architectural specification for CAT Vision SMT pattern search, carrier tape simulation, layer management, and desktop shell layout.

---

## 2. Deliverables & Architectural Contracts

Authored `02-spec/21-app/05-pattern-search-and-ui-improvement/01-architecture-spec.md` codifying:

1. **System Context & Topology**:
   - High-level Mermaid flowchart defining UI Shell, Vision Workspace, Algorithmic Core, and Storage Persistence pipelines.

2. **Coordinate Space Normalization**:
   - Mathematical mapping between Natural Camera Frame (`W_nat x H_nat`), Viewport Display Space (`W_disp x H_disp`), and Normalized Unit Space (`[0.0, 1.0]`).
   - Geometric rebasing equations scaling rules authored at `(W_auth, H_auth)` to runtime frames.

3. **Square ROI Contract**:
   - Mandatory isotropic constraint (`width === height`) for all pattern search and white-box marking tools.
   - Algorithmic clamping formula: `side = max(4, min(round(w), round(h)))`.

4. **Symmetrical Dual-Persistence Schema**:
   - Enforced schema requiring both array (`patternBoxes`, `referenceBoxes`, `constellation`) and serialized JSON (`patternBoxesJson`, `referenceBoxesJson`, `constellationJson`) persistence.

5. **Carrier Tape Simulation & Empty Pocket Gate**:
   - Mermaid sequence diagrams comparing discrete Workpiece Inspection vs Continuous Carrier Tape Simulation.
   - Gating invariant: Empty cavities strictly bypass pattern box rendering and yield calculations.

6. **UI Shell Layout & Window Controls**:
   - Zero-transform Popper portal contract for dropdown menus.
   - Chromium `--app` mode sandbox window management contract (loopback `POST /shutdown`, fullscreen toggle maximize, toast minimize).

7. **Photoshop Layers Panel Architecture**:
   - 4-Tier layer stack (`Z0: Base Image`, `Z1: Luma Shader`, `Z2: Tape Pockets`, `Z3: Pattern Constellation`).
   - Unification of visual array index ordering with canvas painter z-order.
