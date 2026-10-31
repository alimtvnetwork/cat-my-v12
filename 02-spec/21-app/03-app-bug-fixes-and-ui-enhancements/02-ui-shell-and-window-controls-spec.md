# UI Shell & Window Controls Specification
# Directory: 02-spec/21-app/03-app-bug-fixes-and-ui-enhancements/02-ui-shell-and-window-controls-spec.md
# Status: draft

## 1. Window Controls Header Architecture

Desktop HMI applications require native-feeling window management controls integrated into the persistent titlebar.

### 1.1 Control Buttons (Top-Right)
- **Minimize (`—`)**: Invokes desktop window minimize or minimizes UI to compact taskbar layer.
- **Window Layer / Maximize (`▢`)**: Toggles between maximized fullscreen and bordered windowed mode.
- **Close / Exit (`✕`)**: Closes active modal, or exits the desktop process cleanly.
- Visual token: Slate-400 icons with subtle red hover accents on Close (`hover:bg-rose-600 hover:text-white`) and standard slate hover accents on Minimize/Maximize (`hover:bg-white/[0.08]`).

### 1.2 Main Menu Exit Action
- Under the persistent top-left hamburger menu (`Menu`), add an **Exit Application** action button separated by a divider.
- Keyboard shortcut indicator: `Ctrl+Q` / `Alt+F4`.

### 1.3 Application Title & Clickable Version Modal
- Current title: `Control Automation` -> Updated to: **`Cat Vision, Cat I Vision`**.
- Next to the title, render a clickable badge displaying `v<SemVer>` (e.g. `v4.113.8`).
- Clicking the badge opens a lightweight dialog:
  - Application Name: CAT Vision (CAT iVISION)
  - Active Version: 4.113.8
  - Release Date: 2026-10-30
  - Commit Hash: `038f4b22`
  - Changelog summary & status readout
