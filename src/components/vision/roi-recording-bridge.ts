/**
 * ============================================================================
 * ANTI-ASSET STORAGE INVARIANT (NON-NEGOTIABLE ARCHITECTURE SPEC):
 * ============================================================================
 * All visual snapshots, canvas raster extracts, and screenshots captured during
 * ROI operations ("roi-create", "roi-drag", "roi-resize") are EPHEMERAL LEARNING
 * ARTIFACTS designed specifically for AI pair-programming and root cause analysis.
 *
 * CANONICAL STORAGE LOCATION:
 * `.logs/recorded-bugs/<session_id>/screenshots/`
 *
 * STRICT INVARIANT:
 * Screenshots MUST NEVER be saved into `src/assets` or any git-tracked directory.
 * They are ephemeral diagnostic evidence captured during runtime sessions.
 * ============================================================================
 */

import { useRecorderStore } from "@/lib/recorder/recorder-store";
import { captureScreenSnapshot } from "@/lib/recorder/screenshot-service";
import { computeDeterministicXPath } from "@/lib/recorder/event-interceptor";
import { RecorderActorType, RecorderEventType, type AddEventParams } from "@/lib/recorder/types";

export type RoiOperationType = "roi-create" | "roi-drag" | "roi-resize";

export interface RoiCoordinatePoint {
  screenX: number;
  screenY: number;
  imageX: number;
  imageY: number;
}

export interface RoiBoundingGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoiDeltaDisplacement {
  deltaX: number;
  deltaY: number;
  deltaWidth: number;
  deltaHeight: number;
  distance: number;
}

export interface DragCoordinates {
  startScreenX: number;
  startScreenY: number;
  endScreenX: number;
  endScreenY: number;
  startNaturalX: number;
  startNaturalY: number;
  endNaturalX: number;
  endNaturalY: number;
  deltaX: number;
  deltaY: number;
  startGeometry?: RoiBoundingGeometry;
  endGeometry?: RoiBoundingGeometry;
  deltaWidth?: number;
  deltaHeight?: number;
  handleId?: string;
  xpath: string;
  startScreenshotId?: string;
  endScreenshotId?: string;
}

export interface RoiInteractionSession {
  operationType: RoiOperationType;
  startTime: number;
  startPoint: RoiCoordinatePoint;
  startGeometry: RoiBoundingGeometry;
  handleId?: string;
  targetXPath: string;
  label: string;
  startScreenshotId?: string;
}

export interface BeginRoiInteractionParams {
  operationType: RoiOperationType;
  screenCoords: { x: number; y: number };
  imageCoords: { x: number; y: number };
  geometry: RoiBoundingGeometry;
  handleId?: string;
  element?: HTMLElement | null;
  label?: string;
}

export interface CompleteRoiInteractionParams {
  session: RoiInteractionSession;
  screenCoords: { x: number; y: number };
  imageCoords: { x: number; y: number };
  finalGeometry: RoiBoundingGeometry;
  element?: HTMLElement | null;
}

export interface RoiTelemetryRecordParams {
  operationType: RoiOperationType;
  startPoint: RoiCoordinatePoint;
  endPoint: RoiCoordinatePoint;
  startGeometry: RoiBoundingGeometry;
  endGeometry: RoiBoundingGeometry;
  handleId?: string;
  targetElement?: HTMLElement | null;
  targetXPath?: string;
  label?: string;
  startScreenshotId?: string;
  endScreenshotId?: string;
}

export interface FormatRoiStepMarkdownParams {
  stepIndex: number;
  operationType: RoiOperationType;
  label: string;
  xpath: string;
  startPoint: RoiCoordinatePoint;
  endPoint: RoiCoordinatePoint;
  startGeometry: RoiBoundingGeometry;
  endGeometry: RoiBoundingGeometry;
  handleId?: string;
  sessionId?: string;
  startScreenshotId?: string;
  endScreenshotId?: string;
}

/**
 * Initiates an ROI tracking session when an operator begins dragging or resizing an ROI.
 * Captures initial screen & natural image pixels, resolves XPath, and acquires the start snapshot.
 */
export function beginRoiInteraction(
  params: BeginRoiInteractionParams,
): RoiInteractionSession | null {
  const store = useRecorderStore.getState();

  if (!store.isRecording || store.isPaused) {
    return null;
  }

  const {
    operationType,
    screenCoords,
    imageCoords,
    geometry,
    handleId,
    element,
    label = "Inspection ROI",
  } = params;

  const xpath = element ? computeDeterministicXPath(element) : "/canvas[workpiece-roi]";
  const roundedX = Math.round(geometry.x);
  const roundedY = Math.round(geometry.y);
  const roundedW = Math.round(geometry.width);
  const roundedH = Math.round(geometry.height);

  const title = `ROI Start: [${operationType}] "${label}" at [${roundedX}, ${roundedY}, ${roundedW}×${roundedH}]`;

  const snapshot = captureScreenSnapshot({
    title,
    source: "canvas",
    targetElement: element || undefined,
  });

  const startScreenshotId = store.addScreenshot({
    title,
    dataUrl: snapshot.dataUrl,
    source: "canvas",
  });

  const session: RoiInteractionSession = {
    operationType,
    startTime: Date.now(),
    startPoint: {
      screenX: Math.round(screenCoords.x),
      screenY: Math.round(screenCoords.y),
      imageX: Math.round(imageCoords.x),
      imageY: Math.round(imageCoords.y),
    },
    startGeometry: {
      x: roundedX,
      y: roundedY,
      width: roundedW,
      height: roundedH,
    },
    handleId,
    targetXPath: xpath,
    label,
    startScreenshotId: startScreenshotId || undefined,
  };

  return session;
}

/**
 * Completes an ROI tracking session on pointer release.
 * Calculates vector deltas, acquires end screenshot, and commits telemetry to recorder store.
 */
export function completeRoiInteraction(params: CompleteRoiInteractionParams): void {
  const store = useRecorderStore.getState();

  if (!store.isRecording || store.isPaused) {
    return;
  }

  const { session, screenCoords, imageCoords, finalGeometry, element } = params;

  const endPoint: RoiCoordinatePoint = {
    screenX: Math.round(screenCoords.x),
    screenY: Math.round(screenCoords.y),
    imageX: Math.round(imageCoords.x),
    imageY: Math.round(imageCoords.y),
  };

  const endGeom: RoiBoundingGeometry = {
    x: Math.round(finalGeometry.x),
    y: Math.round(finalGeometry.y),
    width: Math.round(finalGeometry.width),
    height: Math.round(finalGeometry.height),
  };

  const deltaX = Math.round(endGeom.x - session.startGeometry.x);
  const deltaY = Math.round(endGeom.y - session.startGeometry.y);
  const deltaWidth = Math.round(endGeom.width - session.startGeometry.width);
  const deltaHeight = Math.round(endGeom.height - session.startGeometry.height);
  const distance = Math.round(Math.hypot(deltaX, deltaY) * 10) / 10;

  const deltas: RoiDeltaDisplacement = {
    deltaX,
    deltaY,
    deltaWidth,
    deltaHeight,
    distance,
  };

  const handleSuffix = session.handleId ? ` via handle ${session.handleId}` : "";
  let actionSummary = "";

  if (session.operationType === "roi-resize") {
    actionSummary = `resized ROI bounds by Δw=${deltaWidth >= 0 ? `+${deltaWidth}` : deltaWidth}px, Δh=${deltaHeight >= 0 ? `+${deltaHeight}` : deltaHeight}px (${session.startGeometry.width}×${session.startGeometry.height} → ${endGeom.width}×${endGeom.height})${handleSuffix}`;
  } else if (session.operationType === "roi-drag") {
    actionSummary = `dragged ROI by Δx=${deltaX >= 0 ? `+${deltaX}` : deltaX}px, Δy=${deltaY >= 0 ? `+${deltaY}` : deltaY}px (distance: ${distance}px)${handleSuffix}`;
  } else {
    actionSummary = `created new ROI zone at [${endGeom.x}, ${endGeom.y}, ${endGeom.width}×${endGeom.height}]`;
  }

  const description = `Operator ${actionSummary} ("${session.label}")`;
  const xpath = element ? computeDeterministicXPath(element) : session.targetXPath;

  const endSnapshot = captureScreenSnapshot({
    title: `ROI End: [${session.operationType}] "${session.label}"`,
    source: "canvas",
    targetElement: element || undefined,
  });

  const endScreenshotId = store.addScreenshot({
    title: description,
    dataUrl: endSnapshot.dataUrl,
    source: "canvas",
  });

  const eventPayload: AddEventParams = {
    actor: RecorderActorType.User,
    eventType: RecorderEventType.RoiDrag,
    description,
    targetComponent: `ROI Telemetry (${session.operationType})`,
    selector: xpath,
    route: window.location.pathname,
    hasScreenshot: Boolean(endScreenshotId),
    screenshotId: endScreenshotId || undefined,
    coordinates: { x: endPoint.screenX, y: endPoint.screenY },
    xpath,
    details: {
      operationType: session.operationType,
      label: session.label,
      handleId: session.handleId ?? null,
      xpath,
      startCoordinates: session.startPoint,
      endCoordinates: endPoint,
      startGeometry: session.startGeometry,
      endGeometry: endGeom,
      deltas,
      startScreenshotId: session.startScreenshotId ?? null,
      endScreenshotId: endScreenshotId ?? null,
      antiAssetInvariant: {
        isEphemeralArtifact: true,
        storagePath: ".logs/recorded-bugs/<session_id>/screenshots/",
        prohibitedDirectory: "src/assets",
      },
    },
  };

  store.addEvent(eventPayload);
}

/**
 * Direct telemetry recording helper for single-step ROI operations.
 */
export function recordRoiDirect(params: RoiTelemetryRecordParams): void {
  const store = useRecorderStore.getState();

  if (!store.isRecording || store.isPaused) {
    return;
  }

  const {
    operationType,
    startPoint,
    endPoint,
    startGeometry,
    endGeometry,
    handleId,
    targetElement,
    targetXPath,
    label = "Inspection ROI",
    startScreenshotId,
    endScreenshotId,
  } = params;

  const xpath = targetXPath || (targetElement ? computeDeterministicXPath(targetElement) : "/canvas[roi]");
  const deltaX = Math.round(endGeometry.x - startGeometry.x);
  const deltaY = Math.round(endGeometry.y - startGeometry.y);
  const deltaWidth = Math.round(endGeometry.width - startGeometry.width);
  const deltaHeight = Math.round(endGeometry.height - startGeometry.height);
  const distance = Math.round(Math.hypot(deltaX, deltaY) * 10) / 10;

  const description = `Operator performed ${operationType} on "${label}": Δx=${deltaX}px, Δy=${deltaY}px, Δw=${deltaWidth}px, Δh=${deltaHeight}px`;

  store.addEvent({
    actor: RecorderActorType.User,
    eventType: RecorderEventType.RoiDrag,
    description,
    targetComponent: `ROI Telemetry (${operationType})`,
    selector: xpath,
    route: window.location.pathname,
    hasScreenshot: Boolean(endScreenshotId),
    screenshotId: endScreenshotId,
    coordinates: { x: endPoint.screenX, y: endPoint.screenY },
    xpath,
    details: {
      operationType,
      label,
      handleId: handleId ?? null,
      startCoordinates: startPoint,
      endCoordinates: endPoint,
      startGeometry,
      endGeometry,
      deltas: { deltaX, deltaY, deltaWidth, deltaHeight, distance },
      startScreenshotId: startScreenshotId ?? null,
      endScreenshotId: endScreenshotId ?? null,
      antiAssetInvariant: {
        isEphemeralArtifact: true,
        storagePath: ".logs/recorded-bugs/<session_id>/screenshots/",
        prohibitedDirectory: "src/assets",
      },
    },
  });
}

/**
 * Generates V6/V7 prompt-ready markdown for paired visual grounding of ROI manipulations.
 * Complies with SPEC-87-06 §3.
 */
export function formatRoiStepMarkdown(params: FormatRoiStepMarkdownParams): string {
  const {
    stepIndex,
    operationType,
    label,
    xpath,
    startGeometry,
    endGeometry,
    handleId,
    sessionId = "REC-ACTIVE",
    startScreenshotId = "start",
    endScreenshotId = "end",
  } = params;

  const deltaX = endGeometry.x - startGeometry.x;
  const deltaY = endGeometry.y - startGeometry.y;
  const deltaW = endGeometry.width - startGeometry.width;
  const deltaH = endGeometry.height - startGeometry.height;
  const distance = Math.round(Math.hypot(deltaX, deltaY) * 10) / 10;

  const paddedStep = String(stepIndex).padStart(2, "0");
  const handleInfo = handleId ? ` via handle \`${handleId}\`` : "";

  return [
    `### Step ${paddedStep}: ROI Boundary Manipulation (${label})`,
    `- **Action**: Operator performed \`${operationType}\`${handleInfo}`,
    `- **XPath**: \`${xpath}\``,
    `- **Initial Coordinates (Natural)**: \`X: ${startGeometry.x}px, Y: ${startGeometry.y}px, W: ${startGeometry.width}px, H: ${startGeometry.height}px\``,
    `- **Final Coordinates (Natural)**: \`X: ${endGeometry.x}px, Y: ${endGeometry.y}px, W: ${endGeometry.width}px, H: ${endGeometry.height}px\``,
    `- **Deltas**: \`ΔX: ${deltaX >= 0 ? `+${deltaX}` : deltaX}px, ΔY: ${deltaY >= 0 ? `+${deltaY}` : deltaY}px, ΔW: ${deltaW >= 0 ? `+${deltaW}` : deltaW}px, ΔH: ${deltaH >= 0 ? `+${deltaH}` : deltaH}px (Distance: ${distance}px)\``,
    `- **Visual Grounding References**:`,
    `  - Before: [step-${paddedStep}-roi-start](file;.logs/recorded-bugs/${sessionId}/screenshots/step-${paddedStep}-roi-${startScreenshotId}.png)`,
    `  - After:  [step-${paddedStep}-roi-end](file;.logs/recorded-bugs/${sessionId}/screenshots/step-${paddedStep}-roi-${endScreenshotId}.png)`,
    ``,
    `> [!NOTE]`,
    `> Telemetry Grounding: Diagnostic screenshots exist strictly in .logs/recorded-bugs/ for ephemeral learning and must never be written to src/assets.`,
  ].join("\n");
}
