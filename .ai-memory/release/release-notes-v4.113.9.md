# Release Notes: Cat Vision v4.113.9

**Release Date:** October 30, 2026  
**Tag:** `v4.113.9`  
**Distribution:** Public Production Release (Draft: False)

---

## Executive Summary

Cat Vision `v4.113.9` delivers critical visual mapping and tool calibration enhancements for factory-floor optical inspection. It restores the interactive **Search Region (ROI)** bounding box with multi-point corner handles and freeform body dragging, provides direct **Pin 1 Orientation click-to-map reticle registration**, revives the **Greyscale Pattern Region boundary envelope**, and embeds the full **Visual Tool Tuning Workbench** modal directly into the workpiece workspace.

---

## Key Highlights & Resolved Issues

### 1. Interactive Vision Canvas Search Region (ROI)
* **Cyan Dashed Boundary**: Active rules render with high-visibility cyan dashed outlines (`#00e5ff`), translucent interior fills, and live dimension badges (`[RULE] SEARCH REGION · [W×H]`).
* **Four-Corner Resizing**: Restored interactive `nw`, `ne`, `sw`, and `se` grab handles with strict aspect enforcement when Square geometry is selected.
* **Body Drag & Relocate**: Clicking and dragging inside the search region smoothly translates the entire ROI across the workpiece with 1:1 mouse tracking.
* **Aspect Ratio Transformation Alignment**: Resolved coordinate drift between letterboxed image containment and client canvas coordinates through inverse metric scaling.

### 2. Pin 1 Orientation & Reticle Calibration
* **Direct Point Mapping**: Clicking anywhere within the search area or on the IC workpiece instantly registers the Pin 1 fiducial center (`centerX`, `centerY`).
* **Dynamic Reticle Dragging**: Live crosshair and target ring dragging with real-time coordinate updates in the right toolbar panel.
* **Telemetry Display**: Live angle, circularity, and nominal vs. detected position readouts.

### 3. Greyscale Pattern Matching & Constellation Envelopes
* **Inner Pattern Boundary**: Restored the dashed `PATTERN REGION · [W×H]` envelope enclosing character constellation marks.
* **Character Marking**: Individual character boxes display box numbers (`#1` through `#24`), character labels, and match status with click-to-toggle inclusion.

### 4. Full Visual Tuning Workbench Modal
* **Embedded Dispatcher**: Direct access via the **"Tune in Visual Workbench"** action button in parameter cards and the toolbar header `Sliders` shortcut.
* **White-Box Tuner**: Full interactive binarized threshold slider (0–255), tolerance jitter bands, and constellation geometry editor.
* **Pin 1 Marking Tool**: Fiducial circularity filters, dark dimple vs. light mark polarity selection, and shape measurement verification.

### 5. Multi-Channel Diagnostic Bug Reporting
* **Local ZIP Archives**: Comprehensive action logs, high-resolution snapshots, and runtime state dumps.
* **Telegram Bot API**: Direct export to private channels and operator chats via bot token and chat ID integration.
* **Email Dispatch**: Native mail client draft pre-population with error summaries.

---

## Quick Verification & Installation

### PowerShell
```powershell
irm https://raw.githubusercontent.com/alimtvnetwork/cat-my-v12/main/local-install.ps1 | iex
```

### Bash
```bash
curl -fsSL https://raw.githubusercontent.com/alimtvnetwork/cat-my-v12/main/local-install.sh | bash
```
