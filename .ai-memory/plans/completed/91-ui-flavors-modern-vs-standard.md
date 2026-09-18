---
status: completed
---

# Plan 91: Dual UI Flavors Integration (Modern vs Standard)

## Origin Prompt

The user explicitly requested a dual UI architecture that offers both a cutting-edge, dynamic design (Modern UI) and a classic, structured layout (Standard UI).

**Original User Prompt (Reconstructed):**

> "Make two types of UI: one for the Modern UI (which is the current dynamic UI), and then I will give you the designs for a Standard UI which you will integrate later on. The user must have the option to easily choose and toggle between the Standard and Modern UI. Crucially, each version of the UI (both Modern and Standard) must have its own independent Light and Dark theme versions."

---

## 1. Goal

To build a scalable architecture that decouples "UI Flavor" (Modern vs. Standard) from "Theme Variant" (Light vs. Dark), effectively supporting a 2x2 design matrix (Modern-Dark, Modern-Light, Standard-Dark, Standard-Light).

## 2. Completed Foundation (Phase 1)

We have already successfully laid the structural and state management groundwork for this feature:

- **State Store (`src/lib/ui-prefs-store.ts`)**: Expanded to include the `UiFlavor` type (`"standard" | "modern"`), alongside the existing `theme` property.
- **State Actions**: Added `setUiFlavor` and `toggleUiFlavor` to allow seamless transition.
- **UI Toggle (`src/components/theme/FlavorToggle.tsx`)**: Created an interactive toggle button (using a `Paintbrush` icon) that allows the user to switch between UI flavors dynamically.

## 3. Pending Implementation (Phase 2)

When the user provides the specific "Standard UI" layout instructions, the following steps must be executed:

- `[ ]` **Step 1: CSS Architecture Setup**
  Update `index.css` (and/or CSS modules) to handle `.flavor-standard` vs `.flavor-modern` classes on the `<body>` or root `<main>` tag, ensuring variables can diverge if necessary between the two layouts.
- `[ ]` **Step 2: Component Routing / Conditional Rendering**
  Modify the App Shell (`AppBreadcrumb`, `Rail`, `TopMenuBar`, etc.) to conditionally render the structural layout based on the `uiFlavor` state from `useUiPrefsStore()`.
- `[ ]` **Step 3: Standard UI Implementation (Light/Dark)**
  Implement the standard UI layouts provided by the user. Ensure semantic colors (`bg-ca-panel`, `text-ca-chrome-ink`, etc.) naturally inherit the light/dark theme variants without hardcoding hex values.
- `[ ]` **Step 4: Modern UI Refinement**
  Ensure the existing dynamic UI works flawlessly under the `.flavor-modern` namespace and maintains its high-quality aesthetics and micro-animations.
- `[ ]` **Step 5: Testing and Validation**
  Test all 4 combinations (Modern-Dark, Modern-Light, Standard-Dark, Standard-Light) to verify that the layouts do not break and the themes toggle cleanly without page reloads.

## 4. Execution Notes

- Maintain **strict separation of concerns**. Do not tightly couple a flavor to a theme (e.g., do not assume Standard is always Light).
- Utilize the `FlavorToggle` component for debugging and testing the layouts side-by-side during development.
