/**
 * UI Automation Identifier & XPath Registry Helper.
 * Enforces the 3-part automation contract: id, name, and normalized xpath.
 * Enables deterministic headless CLI element targeting.
 */

export interface AutomationProps {
  id?: string;
  name?: string;
  xpath?: string;
  "data-automation-id"?: string;
  "data-automation-name"?: string;
  "data-automation-xpath"?: string;
}

export interface AutomationParams {
  id: string;
  name: string;
  xpath?: string;
  parentPath?: string;
  elementType?: string;
}

/**
 * Generates standardized automation attributes for any interactive DOM element.
 */
export function getAutomationAttrs(params: AutomationParams): AutomationProps {
  const elType = params.elementType || "button";
  const defaultXPath = params.parentPath
    ? `${params.parentPath}//${elType}[@id='${params.id}']`
    : `//${elType}[@id='${params.id}']`;
  const xpath = params.xpath || defaultXPath;

  return {
    id: params.id,
    name: params.name,
    xpath,
    "data-automation-id": params.id,
    "data-automation-name": params.name,
    "data-automation-xpath": xpath,
  };
}
