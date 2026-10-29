import { useRecorderStore } from "./recorder-store";
import { captureScreenSnapshot } from "./screenshot-service";
import { type AddEventParams, RecorderActorType, RecorderEventType } from "./types";

let isInterceptionActive = false;
let cleanupHandlers: (() => void) | null = null;

function describeElement(el: HTMLElement): {
  targetComponent: string;
  selector: string;
  description: string;
} {
  const tour = el.getAttribute("data-tour");
  const testId = el.getAttribute("data-testid");
  const role = el.getAttribute("role");
  const tag = el.tagName.toLowerCase();
  const text = (el.innerText || el.getAttribute("aria-label") || el.getAttribute("title") || "")
    .trim()
    .slice(0, 40);

  const identifier = tour
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
  const route = window.location.pathname;

  const eventParams: AddEventParams = {
    actor: RecorderActorType.User,
    eventType: RecorderEventType.Click,
    description,
    targetComponent,
    selector,
    route,
    hasScreenshot: false,
    coordinates: { x: Math.round(e.clientX), y: Math.round(e.clientY) },
  };

  store.addEvent(eventParams);
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

  const eventParams: AddEventParams = {
    actor: RecorderActorType.User,
    eventType: RecorderEventType.Input,
    description: `User typed into "${name}" -> "${val}"`,
    targetComponent: `<${target.tagName.toLowerCase()} name="${name}">`,
    selector: target.name ? `[name='${target.name}']` : target.tagName.toLowerCase(),
    route: window.location.pathname,
    hasScreenshot: false,
    details: { name, value: val },
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

export function startGlobalInterception(): void {
  if (isInterceptionActive || typeof window === "undefined") {
    return;
  }

  isInterceptionActive = true;

  window.addEventListener("click", handleClickEvent, true);
  window.addEventListener("change", handleInputEvent, true);

  cleanupHandlers = () => {
    window.removeEventListener("click", handleClickEvent, true);
    window.removeEventListener("change", handleInputEvent, true);
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
