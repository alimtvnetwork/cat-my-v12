/**
 * UI Automation Identifier & XPath Engine
 *
 * Implements deterministic XPath generation, element resolution by XPath or ID,
 * and programmatic actuation support for CLI and automated E2E testing.
 */

export interface AutomationTriad {
  readonly id: string;
  readonly "data-automation-id": string;
  readonly "data-automation-name": string;
  readonly "data-automation-xpath": string;
}

/**
 * Computes a standardized XPath string for a given HTML element.
 * Prioritizes id, data-automation-id, and data-testid before falling back to tag hierarchy.
 */
export function getElementXPath(el: HTMLElement): string {
  if (el.id) {
    return `//*[@id='${el.id}']`;
  }

  const automationId = el.getAttribute("data-automation-id");
  if (automationId) {
    return `//*[@data-automation-id='${automationId}']`;
  }

  const testId = el.getAttribute("data-testid");
  if (testId) {
    return `//*[@data-testid='${testId}']`;
  }

  const tagName = el.tagName.toLowerCase();
  const parent = el.parentElement;

  if (!parent || parent.tagName === "BODY" || parent.tagName === "HTML") {
    return `//${tagName}`;
  }

  const siblings = Array.from(parent.children).filter(
    (child) => child.tagName.toLowerCase() === tagName,
  );

  if (siblings.length === 1) {
    return `${getElementXPath(parent)}/${tagName}`;
  }

  const index = siblings.indexOf(el) + 1;
  return `${getElementXPath(parent)}/${tagName}[${index}]`;
}

/**
 * Resolves a single DOM element matching an XPath expression.
 */
export function resolveElementByXPath(
  xpath: string,
  root: Document | Element = document,
): HTMLElement | null {
  try {
    const doc = root instanceof Document ? root : root.ownerDocument || document;
    const result = doc.evaluate(
      xpath,
      root,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    );

    const node = result.singleNodeValue;
    return node instanceof HTMLElement ? node : null;
  } catch (err) {
    console.warn(`[automation/xpath] Failed to evaluate XPath: ${xpath}`, err);
    return null;
  }
}

/**
 * Attempts to resolve an element either by its ID (or data-automation-id)
 * or by full XPath expression.
 */
export function resolveElementByIdOrXPath(target: string): HTMLElement | null {
  if (!target) {
    return null;
  }

  // If starts with "//" or "(//", treat as XPath
  if (target.startsWith("//") || target.startsWith("(/") || target.startsWith(".")) {
    return resolveElementByXPath(target);
  }

  // Try direct DOM ID
  const elById = document.getElementById(target);
  if (elById) {
    return elById;
  }

  // Try query selector for data-automation-id
  const elByAutomationId = document.querySelector<HTMLElement>(
    `[data-automation-id="${target}"]`,
  );
  if (elByAutomationId) {
    return elByAutomationId;
  }

  // Fallback: try XPath with id
  return resolveElementByXPath(`//*[@id='${target}']`);
}

/**
 * Programmatically triggers a click event on an element targeted by XPath or ID.
 * Returns true if the target element was found and clicked, false otherwise.
 */
export function clickElementByXPathOrId(target: string): boolean {
  const el = resolveElementByIdOrXPath(target);

  if (!el) {
    console.warn(`[automation/actuator] Target element not found: ${target}`);
    return false;
  }

  // Scroll into view if needed
  el.scrollIntoView({ behavior: "instant", block: "nearest" });

  // Dispatch focus and click events
  el.focus?.();
  el.click();

  return true;
}

/**
 * Generates an AutomationTriad object for convenient spreading onto React components.
 */
export function generateAutomationTriad(
  elementId: string,
  displayName?: string,
  customXPath?: string,
): AutomationTriad {
  const name = displayName || elementId;
  const xpath = customXPath || `//button[@id='${elementId}']`;

  return {
    id: elementId,
    "data-automation-id": elementId,
    "data-automation-name": name,
    "data-automation-xpath": xpath,
  };
}
