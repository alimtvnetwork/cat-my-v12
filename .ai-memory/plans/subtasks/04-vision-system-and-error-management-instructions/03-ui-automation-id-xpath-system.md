# Subtask 03: UI Automation Triad (Id, Name, XPath) Integration & Headless Actuator CLI

**Slug:** `03-ui-automation-id-xpath-system`  
**Status:** pending  
**Parent Spec:** `02-spec/21-app/04-vision-system-and-error-management-instructions/01-ui-window-controls-and-automation-spec.md`  
**Target Area:** `src/components/ui/`, `src/lib/automation/`, `scripts/`, `src/components/layout/`, `src/components/vision/`  
**Bounded Batch:** 6 files  

---

## 1. Context & Root Cause Analysis (RCA)

1. **Absence of Uniform Machine-Readable Selectors**:
   - The application relies heavily on dynamic CSS utility classes and Lucide SVG icons for buttons and interactive controls.
   - Automated end-to-end tests and autonomous AI agent actuators currently have to rely on brittle text matching, index-based querying, or unstable DOM hierarchies.
   - When text changes or localization is applied, tests fail unpredictably.

2. **Need for Standardized 3-Part Identity Triad**:
   - Every interactive control must expose three standardized DOM attributes:
     - `data-automation-id`: Unique, deterministic machine slug (e.g. `btn-window-minimize`, `btn-source-selector`, `btn-save-recipe`).
     - `data-automation-name`: Human-readable label matching user intent (e.g. `Minimize Window`, `Select Image Source`).
     - `data-automation-xpath`: Normalized semantic locator path (e.g. `//header//button[@id='btn-window-minimize']`).

3. **Missing Headless Actuator CLI**:
   - Developers and background AI agents require a standalone CLI script to inspect, query, and actuate elements headlessly via simple shell commands.

---

## 2. Target File Batch (6 Files)

| File Index | Relative File Path | Role in Subtask |
| :--- | :--- | :--- |
| 1 | `src/components/ui/button.tsx` | Extend `ButtonProps` to accept automation triad props and reflect them onto DOM elements. |
| 2 | `src/lib/automation/xpath.ts` | Utility library for generating normalized XPath strings and resolving DOM nodes by XPath/ID. |
| 3 | `src/lib/automation/__tests__/xpath.test.ts` | Unit tests verifying XPath normalization and DOM lookup functions. |
| 4 | `scripts/cli-ui-actuator.ts` | Standalone CLI script supporting `--list-elements`, `--click`, and `--fill` using automation identifiers. |
| 5 | `src/components/layout/WindowControlButtons.tsx` | Tag titlebar window controls with automation triad attributes. |
| 6 | `src/components/vision/workpiece/AnalyzeImageToolbar.tsx` | Tag camera and image source controls with automation triad attributes. |

---

## 3. Step-by-Step Implementation Plan

### Step 1: Extend Button Component with Automation Triad
- **Target File:** `src/components/ui/button.tsx`
- Add interface definitions:
  ```typescript
  export interface AutomationIdentityProps {
    readonly automationId?: string;
    readonly automationName?: string;
    readonly automationXPath?: string;
  }
  ```
- Extend `ButtonProps` with `AutomationIdentityProps`.
- In `Button` render logic, forward properties to DOM:
  ```tsx
  const {
    className,
    variant,
    size,
    asChild = false,
    automationId,
    automationName,
    automationXPath,
    ...props
  } = props;
  
  const resolvedXPath = automationXPath || (automationId ? `//button[@id='${automationId}']` : undefined);
  
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      id={automationId || props.id}
      aria-label={automationName || props["aria-label"]}
      data-automation-id={automationId}
      data-automation-name={automationName}
      data-automation-xpath={resolvedXPath}
      {...props}
    />
  );
  ```

### Step 2: Implement Runtime XPath Resolver
- **Target File:** `src/lib/automation/xpath.ts`
- Implement interfaces:
  ```typescript
  export interface XPathGenerationParams {
    readonly tagName: string;
    readonly id: string;
    readonly parentXPath?: string;
  }

  export interface AutomationQueryOptions {
    readonly rootElement?: Element | Document;
    readonly isVisibleOnly?: boolean;
  }

  export interface AutomationElementInfo {
    readonly id: string;
    readonly name: string;
    readonly xpath: string;
    readonly tagName: string;
    readonly isVisible: boolean;
  }
  ```
- Implement `generateNormalizedXPath(params: XPathGenerationParams): string`:
  - If `params.parentXPath` is provided, return `${params.parentXPath}//${params.tagName}[@id='${params.id}']`.
  - Else return `//${params.tagName}[@id='${params.id}']`.
- Implement `resolveElementByXPath(xpath: string, options?: AutomationQueryOptions): Element | null`:
  - Uses `document.evaluate(xpath, root, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue`.
- Implement `queryAutomationElements(options?: AutomationQueryOptions): AutomationElementInfo[]`:
  - Queries all elements with `[data-automation-id]`.
  - Extracts id, name, xpath, tagName, and visibility flag.

### Step 3: Author Unit Tests for Automation Utilities
- **Target File:** `src/lib/automation/__tests__/xpath.test.ts`
- Test `generateNormalizedXPath` with and without parent paths.
- Test `resolveElementByXPath` finding mounted elements.
- Test `queryAutomationElements` finding elements tagged with `data-automation-id`.

### Step 4: Author Headless CLI Actuator Script
- **Target File:** `scripts/cli-ui-actuator.ts`
- Supports command-line execution:
  - `--list-elements`: Scans page and prints JSON list of active automation targets.
  - `--click --id=<id>`: Clicks element matching `data-automation-id`.
  - `--click --xpath=<xpath>`: Clicks element matching XPath.
  - `--fill --id=<id> --value=<text>`: Types text into input field.
  - `--screenshot --out=<path>`: Captures page state for verification evidence.
- Returns exit code 0 on success, exit code 1 with structured JSON error report on failure.

### Step 5: Tag Window Controls
- **Target File:** `src/components/layout/WindowControlButtons.tsx`
- Attach automation props to buttons:
  - Minimize: `data-automation-id="btn-window-minimize"`, `data-automation-name="Minimize Window"`, `data-automation-xpath="//header//button[@id='btn-window-minimize']"`
  - Maximize: `data-automation-id="btn-window-maximize"`, `data-automation-name="Maximize Window"`, `data-automation-xpath="//header//button[@id='btn-window-maximize']"`
  - Close: `data-automation-id="btn-window-close"`, `data-automation-name="Close Application"`, `data-automation-xpath="//header//button[@id='btn-window-close']"`
  - Exit Dialog Confirm: `data-automation-id="btn-confirm-exit"`, `data-automation-name="Confirm Application Exit"`
  - Exit Dialog Cancel: `data-automation-id="btn-cancel-exit"`, `data-automation-name="Cancel Application Exit"`

### Step 6: Tag Camera & Image Source Controls
- **Target File:** `src/components/vision/workpiece/AnalyzeImageToolbar.tsx`
- Attach automation props:
  - Source Selector Trigger: `data-automation-id="btn-source-selector"`, `data-automation-name="Select Image Source"`
  - Live Camera Item: `data-automation-id="item-live-camera"`, `data-automation-name="Live Camera Feed"`
  - Upload Image Button: `data-automation-id="btn-upload-image"`, `data-automation-name="Upload Custom Image"`

---

## 4. Strict Coding Guidelines Verification

1. **Strict Positive Booleans**:
   - `isVisible`, `isVisibleOnly`, `hasAutomationId`, `hasCustomXPath`.
   - Never use `isHidden` or `isNotVisible`.
2. **Parameter Structs**:
   - Functions with multiple parameters use `XPathGenerationParams`, `AutomationQueryOptions`.
3. **Vertical Line Gaps**:
   - Mandatory blank lines before `if`, after `}`, before `return`.
4. **Disjoint Boundary**:
   - Strictly confined to the 6 specified files.

---

## 5. Acceptance Criteria

- [ ] **AC-01**: `ButtonProps` in `src/components/ui/button.tsx` forwards `data-automation-id`, `data-automation-name`, and `data-automation-xpath` to DOM.
- [ ] **AC-02**: `src/lib/automation/xpath.ts` produces deterministic normalized XPath locators.
- [ ] **AC-03**: `scripts/cli-ui-actuator.ts` can list elements and execute click/fill commands with structured output.
- [ ] **AC-04**: `WindowControlButtons.tsx` controls are all tagged with standardized automation identifiers.
- [ ] **AC-05**: `AnalyzeImageToolbar.tsx` source controls are all tagged with standardized automation identifiers.
- [ ] **AC-06**: All unit tests in `src/lib/automation/__tests__/xpath.test.ts` pass cleanly.
