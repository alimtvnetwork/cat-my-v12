const sessionHoveredKeys = new Set<string>();
let hoverDebounceTimer: number | null = null;
let lastHoverTimestamp = 0;

export interface HoverDeduplicationKeyParams {
  route: string;
  xpath: string;
}

export function computeHoverDeduplicationKey(params: HoverDeduplicationKeyParams): string {
  return `${params.route}:${params.xpath}`;
}

export function hasRecordedHoverTarget(key: string): boolean {
  return sessionHoveredKeys.has(key);
}

export function markHoverTargetAsRecorded(key: string): void {
  sessionHoveredKeys.add(key);
}

export function clearHoverDeduplicationCache(): void {
  sessionHoveredKeys.clear();

  if (hoverDebounceTimer !== null) {
    window.clearTimeout(hoverDebounceTimer);
    hoverDebounceTimer = null;
  }
}

export function getHoverDeduplicationCacheSize(): number {
  return sessionHoveredKeys.size;
}

export function cancelPendingHover(): void {
  if (hoverDebounceTimer !== null) {
    window.clearTimeout(hoverDebounceTimer);
    hoverDebounceTimer = null;
  }
}

export function getHoverDebounceTimer(): number | null {
  return hoverDebounceTimer;
}

export function setHoverDebounceTimer(timer: number | null): void {
  hoverDebounceTimer = timer;
}

export function getLastHoverTimestamp(): number {
  return lastHoverTimestamp;
}

export function setLastHoverTimestamp(ts: number): void {
  lastHoverTimestamp = ts;
}

export function isTargetInteractive(el: HTMLElement | null): boolean {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  const tagName = el.tagName.toLowerCase();
  const interactiveTags = ["button", "a", "input", "select", "textarea", "summary"];

  if (interactiveTags.includes(tagName)) {
    return true;
  }

  const role = el.getAttribute("role");
  const interactiveRoles = [
    "button",
    "link",
    "menuitem",
    "tab",
    "checkbox",
    "radio",
    "switch",
    "combobox",
    "slider",
  ];

  if (role && interactiveRoles.includes(role)) {
    return true;
  }

  if (
    el.hasAttribute("data-automation-id") ||
    el.hasAttribute("data-tour") ||
    el.hasAttribute("data-testid") ||
    el.hasAttribute("onclick")
  ) {
    return true;
  }

  if (typeof window !== "undefined") {
    try {
      const computed = window.getComputedStyle(el);

      if (computed.cursor === "pointer") {
        return true;
      }
    } catch {
      // Element may be detached or hidden
    }
  }

  const parentInteractive = el.closest<HTMLElement>(
    "button, a, [role='button'], [role='link'], [role='menuitem'], [role='tab'], input, select, textarea, [data-automation-id], [data-tour], [data-testid]",
  );

  return Boolean(parentInteractive && parentInteractive !== el);
}

export function resolveInteractiveTarget(el: HTMLElement): HTMLElement {
  const ancestor = el.closest<HTMLElement>(
    "button, a, [role='button'], [role='link'], [role='menuitem'], [role='tab'], input, select, textarea, [data-automation-id], [data-tour], [data-testid]",
  );

  return ancestor || el;
}
