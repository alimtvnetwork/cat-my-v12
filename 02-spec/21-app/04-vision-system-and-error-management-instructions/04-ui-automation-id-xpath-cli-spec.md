# UI Automation Identity (Id, Name, XPath) & Headless CLI Actuator Specification
# Directory: 02-spec/21-app/04-vision-system-and-error-management-instructions/04-ui-automation-id-xpath-cli-spec.md
# Status: draft

## 1. UI Automation Triad: Id, Name, XPath

Every interactive element rendered in the application DOM—including titlebar controls, menu triggers, action buttons, mode switches, canvas tool anchors, and modal controls—must expose a 3-part automation identity contract:

1. **Identifier `Id` (`id` / `data-automation-id`)**:
   - Unique, deterministic slug identifier (e.g. `btn-window-minimize`, `btn-save-recipe`, `btn-run-simulation`, `btn-pin1-tune`).
2. **Human-Readable `Name` (`aria-label` / `data-automation-name`)**:
   - Descriptive title matching the visible text or accessible label (e.g. `Save Recipe`, `Minimize Window`, `Pocket 2 [Empty Defect]`, `Greyscale Pattern Matching`).
3. **Normalized Hierarchical `XPath` (`data-automation-xpath`)**:
   - Stable semantic DOM locator path enabling direct headless targeting (e.g. `//header//button[@id='btn-save-recipe']`, `//aside//div[@data-automation-id='tool-greyscale-threshold']`).

---

## 2. Dynamic XPath & Automation Registry Helper

### 2.1 Schema Contract (`src/utils/automation-registry.ts`)
A lightweight, zero-overhead helper attaches standardized automation attributes across common UI primitives:

```typescript
export interface AutomationIdentity {
  readonly id: string;
  readonly name: string;
  readonly xpath: string;
}

export function createAutomationAttributes(params: {
  readonly id: string;
  readonly name: string;
  readonly parentPath?: string;
}): Record<string, string> {
  const xpath = params.parentPath 
    ? `${params.parentPath}//button[@id='${params.id}']`
    : `//button[@id='${params.id}']`;

  return {
    "id": params.id,
    "aria-label": params.name,
    "data-automation-id": params.id,
    "data-automation-name": params.name,
    "data-automation-xpath": xpath,
  };
}
```

---

## 3. Headless CLI Actuator Engine (`scripts/cli-ui-actuator.ts`)

The system introduces a compiled CLI automation driver allowing agents and automated testing scripts to inspect and interact with any screen element:

### 3.1 Actuator CLI Syntax
```bash
# Query all interactive buttons on the active page
bun run scripts/cli-ui-actuator.ts --list-elements

# Click an element by its automation ID
bun run scripts/cli-ui-actuator.ts --click --id="btn-save-recipe"

# Click an element by its XPath locator
bun run scripts/cli-ui-actuator.ts --click --xpath="//button[@id='btn-window-minimize']"

# Type text into an input field by ID
bun run scripts/cli-ui-actuator.ts --fill --id="input-rule-name" --value="IC Orientation Rule"

# Capture visual state verification screenshot
bun run scripts/cli-ui-actuator.ts --screenshot --out="reports/evidence/save-click.png"
```

### 3.2 Error Containment & Exit Protocol
- If the target element is not found within a 5-second timeout, the actuator returns exit code 1 with a JSON error payload citing the attempted XPath, current URL, and candidate element IDs found on the page.
- On success, the actuator returns exit code 0 and outputs the executed action duration and element bounding box.
