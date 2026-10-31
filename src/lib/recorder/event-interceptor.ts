import { useRecorderStore } from "./recorder-store";
import { captureScreenSnapshot } from "./screenshot-service";
import {
  type AddEventParams,
  type BoxModelMetrics,
  type ElementGeometry,
  type ElementTelemetry,
  type InteractionEvent,
  type StyleMetrics,
  type UiTelemetrySnapshot,
  type ViewportDistances,
  type XPathInfo,
  RecorderActorType,
  RecorderEventType,
} from "./types";
import {
  cancelPendingHover,
  clearHoverDeduplicationCache,
  computeHoverDeduplicationKey,
  getHoverDebounceTimer,
  getLastHoverTimestamp,
  hasRecordedHoverTarget,
  isTargetInteractive,
  markHoverTargetAsRecorded,
  resolveInteractiveTarget,
  setHoverDebounceTimer,
  setLastHoverTimestamp,
} from "./hover-dedup";

let isInterceptionActive = false;
let cleanupHandlers: (() => void) | null = null;

export interface RoiBoxCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoiDragStartParams {
  action: "move" | "resize";
  roi: RoiBoxCoordinates;
  element?: HTMLElement | null;
  handle?: string | null;
}

export interface RoiDragEndParams {
  action: "move" | "resize";
  startRoi: RoiBoxCoordinates;
  endRoi: RoiBoxCoordinates;
  element?: HTMLElement | null;
  handle?: string | null;
}

export interface SpringPulseDetail {
  id: string;
  x: number;
  y: number;
  stepNumber: number;
}

export interface ComprehensiveTelemetryParams {
  target: HTMLElement;
  stepNumber: number;
  clientX?: number;
  clientY?: number;
  fromRoute: string;
  toRoute: string;
  isHoverRecorded: boolean;
}

export interface ComprehensiveTelemetryResult {
  legacyTelemetry: ElementTelemetry;
  snapshotTelemetry: UiTelemetrySnapshot;
  xpath: string;
}

export function computeDeterministicXPath(element: Element | null): string {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const el = element as HTMLElement;

  const automationId = el.getAttribute("data-automation-id");

  if (automationId) {
    return `//*[@data-automation-id="${automationId}"]`;
  }

  if (el.id && !el.id.startsWith("radix-") && !el.id.startsWith(":r")) {
    return `//*[@id="${el.id}"]`;
  }

  const tourAttr = el.getAttribute("data-tour");

  if (tourAttr) {
    return `//*[@data-tour="${tourAttr}"]`;
  }

  const testIdAttr = el.getAttribute("data-testid");

  if (testIdAttr) {
    return `//*[@data-testid="${testIdAttr}"]`;
  }

  const paths: string[] = [];
  let current: Element | null = el;

  while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
    let index = 1;
    let sibling = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index += 1;
      }

      sibling = sibling.previousElementSibling;
    }

    const tag = current.tagName.toLowerCase();
    paths.unshift(`${tag}[${index}]`);
    current = current.parentElement;
  }

  return `/html/body/${paths.join("/")}`;
}

export function computeElementXPath(element: Element | null): string {
  return computeDeterministicXPath(element);
}

function resolveXPathStrategy(
  el: HTMLElement,
): "automation-id" | "id" | "tour" | "testid" | "structural" {
  if (el.hasAttribute("data-automation-id")) {
    return "automation-id";
  }

  if (el.id && !el.id.startsWith("radix-") && !el.id.startsWith(":r")) {
    return "id";
  }

  if (el.hasAttribute("data-tour")) {
    return "tour";
  }

  if (el.hasAttribute("data-testid")) {
    return "testid";
  }

  return "structural";
}

export function extractComprehensiveTelemetry(
  params: ComprehensiveTelemetryParams,
): ComprehensiveTelemetryResult {
  const { target, stepNumber, fromRoute, toRoute, isHoverRecorded } = params;
  const rect = target.getBoundingClientRect();
  const computed =
    typeof window !== "undefined"
      ? window.getComputedStyle(target)
      : ({} as CSSStyleDeclaration);

  const paddingTop = parseFloat(computed.paddingTop || "0") || 0;
  const paddingRight = parseFloat(computed.paddingRight || "0") || 0;
  const paddingBottom = parseFloat(computed.paddingBottom || "0") || 0;
  const paddingLeft = parseFloat(computed.paddingLeft || "0") || 0;

  const marginTop = parseFloat(computed.marginTop || "0") || 0;
  const marginRight = parseFloat(computed.marginRight || "0") || 0;
  const marginBottom = parseFloat(computed.marginBottom || "0") || 0;
  const marginLeft = parseFloat(computed.marginLeft || "0") || 0;

  const borderWidth = parseFloat(computed.borderTopWidth || computed.borderWidth || "0") || 0;
  const borderRadius = computed.borderRadius || "0px";
  const marginStr = `${computed.marginTop || "0px"} ${computed.marginRight || "0px"} ${computed.marginBottom || "0px"} ${computed.marginLeft || "0px"}`;
  const borderStr = computed.border || `${borderWidth}px solid ${computed.borderColor || "transparent"}`;

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 1080;

  const clientX =
    typeof params.clientX === "number"
      ? params.clientX
      : Math.round(rect.left + rect.width / 2);
  const clientY =
    typeof params.clientY === "number"
      ? params.clientY
      : Math.round(rect.top + rect.height / 2);

  const geometry: ElementGeometry = {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    clientX,
    clientY,
  };

  const viewport: ViewportDistances = {
    distanceToViewportTop: Math.round(rect.top),
    distanceToViewportRight: Math.round(viewportWidth - rect.right),
    distanceToViewportBottom: Math.round(viewportHeight - rect.bottom),
    distanceToViewportLeft: Math.round(rect.left),
    top: Math.round(rect.top),
    right: Math.round(viewportWidth - rect.right),
    bottom: Math.round(viewportHeight - rect.bottom),
    left: Math.round(rect.left),
  };

  const boxModel: BoxModelMetrics = {
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    borderWidth,
    borderRadius,
    margin: marginStr,
    border: borderStr,
  };

  const isVisible =
    computed.display !== "none" &&
    computed.visibility !== "hidden" &&
    rect.width > 0 &&
    rect.height > 0;
  const hasPointerCursor = computed.cursor === "pointer";

  const styles: StyleMetrics = {
    color: computed.color || "",
    backgroundColor: computed.backgroundColor || "",
    borderColor: computed.borderColor || "",
    fontSize: computed.fontSize || "",
    fontWeight: computed.fontWeight || "",
    fontFamily: computed.fontFamily || "",
    cursor: computed.cursor || "",
    isVisible,
    hasPointerCursor,
  };

  const xpath = computeDeterministicXPath(target);
  const strategy = resolveXPathStrategy(target);

  const xpathInfo: XPathInfo = {
    xpath,
    fullDomPath: xpath,
    selector: describeElement(target).selector,
    strategy,
  };

  const accessibleName =
    target.getAttribute("aria-label") ||
    target.getAttribute("title") ||
    target.getAttribute("alt") ||
    "";

  const textContent = (target.innerText || target.textContent || "").trim().slice(0, 80);
  const tagName = target.tagName.toLowerCase();
  const componentIdentifier = describeElement(target).targetComponent;
  const isInteractive = isTargetInteractive(target);

  const snapshotTelemetry: UiTelemetrySnapshot = {
    stepNumber,
    xpath,
    fullDomPath: xpath,
    tagName,
    textContent,
    componentIdentifier,
    geometry,
    viewport,
    boxModel,
    styles,
    xpathInfo,
    isInteractive,
    isHoverRecorded,
  };

  const legacyTelemetry: ElementTelemetry = {
    padding: {
      top: computed.paddingTop || "0px",
      right: computed.paddingRight || "0px",
      bottom: computed.paddingBottom || "0px",
      left: computed.paddingLeft || "0px",
    },
    margin: {
      top: computed.marginTop || "0px",
      right: computed.marginRight || "0px",
      bottom: computed.marginBottom || "0px",
      left: computed.marginLeft || "0px",
    },
    boundingRect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top),
      right: Math.round(rect.right),
      bottom: Math.round(rect.bottom),
      left: Math.round(rect.left),
    },
    distanceFromEdges: {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      bottom: Math.round(viewportHeight - rect.bottom),
      right: Math.round(viewportWidth - rect.right),
    },
    componentDetails: {
      tagName,
      role: target.getAttribute("role") || "",
      accessibleName,
      textContent,
      color: computed.color || "",
      backgroundColor: computed.backgroundColor || "",
      fontSize: computed.fontSize || "",
      borderRadius,
    },
    xpath,
    navigationPath: {
      fromRoute,
      toRoute,
    },
  };

  return {
    legacyTelemetry,
    snapshotTelemetry,
    xpath,
  };
}

export function captureElementTelemetry(
  target: HTMLElement,
  fromRoute: string,
  toRoute: string,
): ElementTelemetry {
  const result = extractComprehensiveTelemetry({
    target,
    stepNumber: 0,
    fromRoute,
    toRoute,
    isHoverRecorded: false,
  });

  return result.legacyTelemetry;
}

export function triggerSpringAnimation(params: {
  x: number;
  y: number;
  stepNumber: number;
}): void {
  if (typeof window === "undefined") {
    return;
  }

  const detail: SpringPulseDetail = {
    id: `spring-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    x: params.x,
    y: params.y,
    stepNumber: params.stepNumber,
  };

  window.dispatchEvent(
    new CustomEvent("cat:recorder-spring-click", {
      detail,
    }),
  );
}

export function describeElement(el: HTMLElement): {
  targetComponent: string;
  selector: string;
  description: string;
} {
  const automationId = el.getAttribute("data-automation-id");
  const tour = el.getAttribute("data-tour");
  const testId = el.getAttribute("data-testid");
  const role = el.getAttribute("role");
  const tag = el.tagName.toLowerCase();
  const text = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "")
    .trim()
    .slice(0, 40);

  const identifier = automationId
    ? `[data-automation-id='${automationId}']`
    : tour
      ? `[data-tour='${tour}']`
      : testId
        ? `[data-testid='${testId}']`
        : role
          ? `${tag}[role='${role}']`
          : tag;
  const friendlyName = text ? `"${text}" (${identifier})` : identifier;

  const description = `User clicked ${tag} ${text ? `"${text}"` : identifier}`;

  return {
    targetComponent: friendlyName,
    selector: identifier,
    description,
  };
}

function handleClickEvent(e: MouseEvent): void {
  const store = useRecorderStore.getState();

  if (!store.isRecording || store.isPaused) {
    return;
  }

  const target = e.target as HTMLElement | null;

  if (!target || target.closest("[data-recorder-hud]")) {
    return;
  }

  const { targetComponent, selector, description } = describeElement(target);
  const fromRoute = store.session?.finalRoute || window.location.pathname;
  const toRoute = window.location.pathname;
  const stepSequenceNumber = (store.session?.events.length ?? 0) + 1;

  // Emit visual magic spring click animation with step sequence number
  triggerSpringAnimation({
    x: Math.round(e.clientX),
    y: Math.round(e.clientY),
    stepNumber: stepSequenceNumber,
  });

  const { legacyTelemetry, snapshotTelemetry, xpath } = extractComprehensiveTelemetry({
    target,
    stepNumber: stepSequenceNumber,
    clientX: Math.round(e.clientX),
    clientY: Math.round(e.clientY),
    fromRoute,
    toRoute,
    isHoverRecorded: false,
  });

  const snapshot = captureScreenSnapshot({
    title: description,
    source: "manual",
    targetElement: target,
    quality: 0.6,
  });

  const screenshotId = store.addScreenshot({
    title: description,
    dataUrl: snapshot.dataUrl,
    source: "manual",
  });

  const eventParams: AddEventParams = {
    actor: RecorderActorType.User,
    eventType: RecorderEventType.Click,
    description,
    targetComponent,
    selector,
    route: toRoute,
    hasScreenshot: Boolean(screenshotId),
    screenshotId: screenshotId || undefined,
    coordinates: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
    xpath,
    telemetry: legacyTelemetry,
    uiTelemetry: snapshotTelemetry,
    details: {
      stepSequenceNumber,
      telemetry: legacyTelemetry,
      uiTelemetry: snapshotTelemetry,
      xpath,
    },
  };

  store.addEvent(eventParams);

  // Check if navigation happened immediately after click
  window.setTimeout(() => {
    const updatedRoute = window.location.pathname;

    if (updatedRoute !== toRoute) {
      legacyTelemetry.navigationPath.toRoute = updatedRoute;
    }
  }, 100);
}

function handleInputEvent(e: Event): void {
  const store = useRecorderStore.getState();

  if (!store.isRecording || store.isPaused) {
    return;
  }

  const target = e.target as HTMLInputElement | HTMLSelectElement | null;

  if (!target || target.closest("[data-recorder-hud]")) {
    return;
  }

  const placeholder = "placeholder" in target ? target.placeholder : "";
  const name = target.name || placeholder || target.getAttribute("aria-label") || "Input Field";
  const val = target.type === "password" ? "******" : String(target.value).slice(0, 50);
  const xpath = computeDeterministicXPath(target);

  const eventParams: AddEventParams = {
    actor: RecorderActorType.User,
    eventType: RecorderEventType.Input,
    description: `User typed into "${name}" -> "${val}"`,
    targetComponent: `<${target.tagName.toLowerCase()} name="${name}">`,
    selector: target.name ? `[name='${target.name}']` : target.tagName.toLowerCase(),
    route: window.location.pathname,
    hasScreenshot: false,
    xpath,
    details: { name, value: val, xpath },
  };

  store.addEvent(eventParams);
}

export function recordSystemEvent(description: string, details?: Record<string, unknown>): void {
  const store = useRecorderStore.getState();

  if (!store.isRecording || store.isPaused) {
    return;
  }

  store.addEvent({
    actor: RecorderActorType.System,
    eventType: RecorderEventType.StateChange,
    description,
    targetComponent: "System / Background",
    selector: "system",
    route: window.location.pathname,
    hasScreenshot: false,
    details,
  });
}

export function captureManualScreenshotWithNote(title = "Manual Snapshot"): void {
  const store = useRecorderStore.getState();

  if (!store.isRecording) {
    return;
  }

  const snap = captureScreenSnapshot({ title, source: "manual" });
  const screenshotId = store.addScreenshot({
    title,
    dataUrl: snap.dataUrl,
    source: "manual",
  });

  store.addEvent({
    actor: RecorderActorType.User,
    eventType: RecorderEventType.Screenshot,
    description: `User captured screen snapshot: "${title}"`,
    targetComponent: "Screen Canvas / Viewport",
    selector: "canvas",
    route: window.location.pathname,
    hasScreenshot: true,
    screenshotId,
  });
}

export function recordRoiDragStart(params: RoiDragStartParams): void {
  const store = useRecorderStore.getState();

  if (!store.isRecording || store.isPaused) {
    return;
  }

  const { action, roi, element, handle } = params;
  const roundedX = Math.round(roi.x);
  const roundedY = Math.round(roi.y);
  const roundedW = Math.round(roi.width);
  const roundedH = Math.round(roi.height);

  const handleSuffix = handle ? ` via ${handle} handle` : "";
  const description = `User began ${action === "resize" ? `resizing ROI${handleSuffix}` : "moving ROI"} at [x:${roundedX}, y:${roundedY}, w:${roundedW}, h:${roundedH}]`;
  const xpath = element ? computeDeterministicXPath(element) : "/canvas[roi]";

  const snapshot = captureScreenSnapshot({
    title: description,
    source: "canvas",
    targetElement: element || undefined,
  });

  const screenshotId = store.addScreenshot({
    title: description,
    dataUrl: snapshot.dataUrl,
    source: "canvas",
  });

  store.addEvent({
    actor: RecorderActorType.User,
    eventType: RecorderEventType.RoiDrag,
    description,
    targetComponent: `ROI Box (${action})`,
    selector: xpath,
    route: window.location.pathname,
    hasScreenshot: Boolean(screenshotId),
    screenshotId: screenshotId || undefined,
    coordinates: { x: roundedX, y: roundedY },
    xpath,
    details: {
      action,
      phase: "start",
      handle: handle || null,
      roi: {
        x: roundedX,
        y: roundedY,
        width: roundedW,
        height: roundedH,
      },
    },
  });
}

export function recordRoiDragEnd(params: RoiDragEndParams): void {
  const store = useRecorderStore.getState();

  if (!store.isRecording || store.isPaused) {
    return;
  }

  const { action, startRoi, endRoi, element, handle } = params;
  const dx = Math.round(endRoi.x - startRoi.x);
  const dy = Math.round(endRoi.y - startRoi.y);
  const dw = Math.round(endRoi.width - startRoi.width);
  const dh = Math.round(endRoi.height - startRoi.height);

  let explanation = "";

  if (action === "resize") {
    explanation = `ROI resized by Δw=${dw >= 0 ? `+${dw}` : dw}px, Δh=${dh >= 0 ? `+${dh}` : dh}px (from ${Math.round(startRoi.width)}x${Math.round(startRoi.height)} to ${Math.round(endRoi.width)}x${Math.round(endRoi.height)})`;
  } else {
    explanation = `ROI moved by Δx=${dx >= 0 ? `+${dx}` : dx}px, Δy=${dy >= 0 ? `+${dy}` : dy}px (from [${Math.round(startRoi.x)}, ${Math.round(startRoi.y)}] to [${Math.round(endRoi.x)}, ${Math.round(endRoi.y)}])`;
  }

  const description = `User completed ${action} ROI: ${explanation}`;
  const xpath = element ? computeDeterministicXPath(element) : "/canvas[roi]";

  const snapshot = captureScreenSnapshot({
    title: description,
    source: "canvas",
    targetElement: element || undefined,
  });

  const screenshotId = store.addScreenshot({
    title: description,
    dataUrl: snapshot.dataUrl,
    source: "canvas",
  });

  store.addEvent({
    actor: RecorderActorType.User,
    eventType: RecorderEventType.RoiDrag,
    description,
    targetComponent: `ROI Box (${action})`,
    selector: xpath,
    route: window.location.pathname,
    hasScreenshot: Boolean(screenshotId),
    screenshotId: screenshotId || undefined,
    coordinates: { x: Math.round(endRoi.x), y: Math.round(endRoi.y) },
    xpath,
    details: {
      action,
      phase: "end",
      handle: handle || null,
      startRoi: {
        x: Math.round(startRoi.x),
        y: Math.round(startRoi.y),
        width: Math.round(startRoi.width),
        height: Math.round(startRoi.height),
      },
      endRoi: {
        x: Math.round(endRoi.x),
        y: Math.round(endRoi.y),
        width: Math.round(endRoi.width),
        height: Math.round(endRoi.height),
      },
      delta: { dx, dy, dw, dh },
      explanation,
    },
  });
}

export function handleIntelligentHover(e: MouseEvent): void {
  const store = useRecorderStore.getState();

  if (!store.isRecording || store.isPaused || !store.isHoverRecordEnabled) {
    return;
  }

  const rawTarget = e.target as HTMLElement | null;

  if (!rawTarget || rawTarget.closest("[data-recorder-hud]")) {
    return;
  }

  if (!isTargetInteractive(rawTarget)) {
    return;
  }

  const target = resolveInteractiveTarget(rawTarget);
  const xpath = computeDeterministicXPath(target);

  if (!xpath) {
    return;
  }

  const currentRoute = window.location.pathname;
  const dedupKey = computeHoverDeduplicationKey({ route: currentRoute, xpath });

  if (hasRecordedHoverTarget(dedupKey) || store.hasRecordedHover(dedupKey)) {
    return;
  }

  const clientX = e.clientX;
  const clientY = e.clientY;

  const activeTimer = getHoverDebounceTimer();

  if (activeTimer !== null) {
    window.clearTimeout(activeTimer);
    setHoverDebounceTimer(null);
  }

  const timer = window.setTimeout(() => {
    const currentStore = useRecorderStore.getState();

    if (
      !currentStore.isRecording ||
      currentStore.isPaused ||
      !currentStore.isHoverRecordEnabled
    ) {
      return;
    }

    const now = Date.now();

    if (now - getLastHoverTimestamp() < 250) {
      return;
    }

    if (hasRecordedHoverTarget(dedupKey) || currentStore.hasRecordedHover(dedupKey)) {
      return;
    }

    markHoverTargetAsRecorded(dedupKey);
    currentStore.markHoverRecorded(dedupKey);
    setLastHoverTimestamp(now);

    const { targetComponent, selector } = describeElement(target);
    const fromRoute = currentStore.session?.finalRoute || window.location.pathname;
    const toRoute = window.location.pathname;
    const stepNumber = (currentStore.session?.events.length ?? 0) + 1;

    const { legacyTelemetry, snapshotTelemetry } = extractComprehensiveTelemetry({
      target,
      stepNumber,
      clientX: Math.round(clientX),
      clientY: Math.round(clientY),
      fromRoute,
      toRoute,
      isHoverRecorded: true,
    });

    const hoverDescription = `User hovered over ${targetComponent}`;

    const snapshot = captureScreenSnapshot({
      title: hoverDescription,
      source: "manual",
      targetElement: target,
      quality: 0.6,
    });

    const screenshotId = currentStore.addScreenshot({
      title: hoverDescription,
      dataUrl: snapshot.dataUrl,
      source: "manual",
    });

    const eventParams: AddEventParams = {
      actor: RecorderActorType.User,
      eventType: RecorderEventType.Hover,
      description: hoverDescription,
      targetComponent,
      selector,
      route: toRoute,
      hasScreenshot: Boolean(screenshotId),
      screenshotId: screenshotId || undefined,
      coordinates: { x: Math.round(clientX), y: Math.round(clientY) },
      xpath,
      telemetry: legacyTelemetry,
      uiTelemetry: snapshotTelemetry,
      details: {
        hoverTrigger: "intelligent_hover_dedup",
        dedupKey,
        telemetry: legacyTelemetry,
        uiTelemetry: snapshotTelemetry,
        xpath,
      },
    };

    currentStore.addEvent(eventParams);
  }, 250);

  setHoverDebounceTimer(timer);
}

export function startGlobalInterception(): void {
  if (isInterceptionActive || typeof window === "undefined") {
    return;
  }

  isInterceptionActive = true;
  clearHoverDeduplicationCache();

  const handleWindowError = (event: ErrorEvent) => {
    recordSystemEvent(`Runtime Error: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    recordSystemEvent(`Unhandled Promise Rejection: ${String(event.reason)}`);
  };

  window.addEventListener("click", handleClickEvent, true);
  window.addEventListener("mouseover", handleIntelligentHover, true);
  window.addEventListener("change", handleInputEvent, true);
  window.addEventListener("error", handleWindowError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);

  cleanupHandlers = () => {
    window.removeEventListener("click", handleClickEvent, true);
    window.removeEventListener("mouseover", handleIntelligentHover, true);
    window.removeEventListener("change", handleInputEvent, true);
    window.removeEventListener("error", handleWindowError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);

    cancelPendingHover();
    clearHoverDeduplicationCache();
  };
}

export function stopGlobalInterception(): void {
  if (!isInterceptionActive) {
    return;
  }

  isInterceptionActive = false;

  if (cleanupHandlers) {
    cleanupHandlers();
    cleanupHandlers = null;
  }
}

export { recordAnalysisStep } from "./analysis-telemetry";

