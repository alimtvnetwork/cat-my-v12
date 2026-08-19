import { LogLevelType } from "@/lib/editor/types";
import { push } from "./log-stream";
import type { LogEntry, LogLevel } from "./types";

type LogFields = LogEntry["fields"];

export const EDITOR_SHELL_CRASH_CODE = "E_UI_EDITOR_SHELL_CRASH";

function newCorrelationId(): string {
  
  return `cid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Public helper (plan 30 step 91): stable per-gesture correlation id.
// Every user gesture (click, key, drag) should call this once and thread the
// returned id through every log the gesture emits so downstream analysis can
// group the resulting state transitions.
export function nextGestureId(source: string): string {
  
  return `gid-${source}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function write(
  level: LogLevel,
  code: string,
  fields: LogFields = {},
  correlationId?: string,
): LogEntry {
  const entry = {
    code,
    level,
    fields,
    correlationId: correlationId ?? newCorrelationId(),
    timestamp: Date.now(),
  };
  push(entry);

  return entry;
}

export interface GestureLogger {
  info: (code: string, fields?: LogFields) => LogEntry;
  warn: (code: string, fields?: LogFields) => LogEntry;
  error: (code: string, fields?: LogFields) => LogEntry;
  correlationId: string;
}

// Returns a logger that reuses the same correlationId for every entry so a
// multi-log gesture (e.g. undo -> applySnapshot -> selection change) is a
// single traceable frame in the log stream.
export function withGesture(correlationId: string): GestureLogger {
  
  return {
    correlationId,
    info: (code, fields) => write(LogLevelType.Info, code, fields, correlationId),
    warn: (code, fields) => write(LogLevelType.Warn, code, fields, correlationId),
    error: (code, fields) => write(LogLevelType.Error, code, fields, correlationId),
  };
}

export const logger = {
  info: (code: string, fields?: LogFields) => write(LogLevelType.Info, code, fields),
  warn: (code: string, fields?: LogFields) => write(LogLevelType.Warn, code, fields),
  error: (code: string, fields?: LogFields) => write(LogLevelType.Error, code, fields),
};
