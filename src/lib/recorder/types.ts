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
  details?: Record<string, unknown>;
}

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
  details?: Record<string, unknown>;
}

export interface AddScreenshotParams {
  title: string;
  dataUrl: string;
  source: "manual" | "step" | "canvas";
}
