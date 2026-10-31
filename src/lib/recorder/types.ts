export enum RecorderStatusType {
  Idle = "idle",
  Recording = "recording",
  Paused = "paused",
}

export enum RecorderActorType {
  User = "user",
  System = "system",
}

export enum RecorderEventType {
  Click = "click",
  Input = "input",
  Navigation = "navigation",
  Inspection = "inspection",
  SystemLog = "system_log",
  StateChange = "state_change",
  Screenshot = "screenshot",
  UserNote = "user_note",
  Hover = "hover",
  RoiDrag = "roi_drag",
}

export enum IssueCategoryType {
  UiGlitch = "ui_glitch",
  InspectionDefect = "inspection_defect",
  Performance = "performance",
  CrashOrError = "crash_or_error",
  WorkflowConfusion = "workflow_confusion",
  Other = "other",
}

export interface RecorderCoordinates {
  x: number;
  y: number;
}

export interface ElementDistanceInfo {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ElementGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  clientX: number;
  clientY: number;
}

export interface ViewportDistances {
  distanceToViewportTop: number;
  distanceToViewportRight: number;
  distanceToViewportBottom: number;
  distanceToViewportLeft: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface BoxModelMetrics {
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  borderWidth: number;
  borderRadius: string;
  margin: string;
  border: string;
}

export interface StyleMetrics {
  color: string;
  backgroundColor: string;
  borderColor: string;
  fontSize: string;
  fontWeight: string;
  fontFamily: string;
  cursor: string;
  isVisible: boolean;
  hasPointerCursor: boolean;
}

export interface XPathInfo {
  xpath: string;
  fullDomPath: string;
  selector: string;
  strategy: "automation-id" | "id" | "tour" | "testid" | "structural";
}

export interface UiTelemetrySnapshot {
  stepNumber: number;
  xpath: string;
  fullDomPath: string;
  tagName: string;
  textContent: string;
  componentIdentifier: string;
  geometry: ElementGeometry;
  viewport: ViewportDistances;
  boxModel: BoxModelMetrics;
  styles: StyleMetrics;
  xpathInfo: XPathInfo;
  isInteractive: boolean;
  isHoverRecorded: boolean;
}

export interface ElementBoxSpacing {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface ComponentTelemetryDetails {
  tagName: string;
  role: string;
  accessibleName: string;
  textContent: string;
  color: string;
  backgroundColor: string;
  fontSize: string;
  borderRadius: string;
}

export interface ElementTelemetry {
  padding: ElementBoxSpacing;
  margin: ElementBoxSpacing;
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  distanceFromEdges: ElementDistanceInfo;
  componentDetails: ComponentTelemetryDetails;
  xpath: string;
  navigationPath: {
    fromRoute: string;
    toRoute: string;
  };
}

export interface RecorderEvent {
  id: string;
  timestamp: string;
  elapsedMs: number;
  actor: RecorderActorType;
  eventType: RecorderEventType;
  description: string;
  targetComponent: string;
  selector: string;
  route: string;
  hasScreenshot: boolean;
  screenshotId?: string;
  coordinates?: RecorderCoordinates;
  xpath?: string;
  telemetry?: ElementTelemetry;
  uiTelemetry?: UiTelemetrySnapshot;
  details?: Record<string, unknown>;
}

export type InteractionEvent = RecorderEvent;

export interface CapturedScreenshot {
  id: string;
  title: string;
  timestamp: string;
  elapsedMs: number;
  dataUrl: string;
  source: "manual" | "step" | "canvas";
}

export interface BugReportSummary {
  title: string;
  description: string;
  category: IssueCategoryType;
  expectedBehavior: string;
  actualBehavior: string;
  reporterName?: string;
}

export interface RecorderSession {
  id: string;
  startedAt: string;
  stoppedAt?: string;
  durationMs: number;
  events: RecorderEvent[];
  screenshots: CapturedScreenshot[];
  routeHistory: string[];
  initialRoute: string;
  finalRoute: string;
  summary?: BugReportSummary;
  errors?: Array<Record<string, unknown>>;
  isHoverRecording?: boolean;
  isHoverRecordEnabled?: boolean;
}

export interface AddEventParams {
  actor: RecorderActorType;
  eventType: RecorderEventType;
  description: string;
  targetComponent: string;
  selector: string;
  route: string;
  hasScreenshot: boolean;
  screenshotId?: string;
  coordinates?: RecorderCoordinates;
  xpath?: string;
  telemetry?: ElementTelemetry;
  uiTelemetry?: UiTelemetrySnapshot;
  details?: Record<string, unknown>;
}

export interface AddScreenshotParams {
  title: string;
  dataUrl: string;
  source: "manual" | "step" | "canvas";
}
