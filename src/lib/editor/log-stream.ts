import type { LogEntry } from "./types";

export const LOG_STREAM_CAPACITY = 200;
const SUBSCRIBER_CAPACITY = 8;

const entries: LogEntry[] = [];
const subscribers = new Set<(entry: LogEntry) => void>();

export function push(entry: LogEntry): void {
  entries.push(entry);
  entries.splice(0, Math.max(0, entries.length - LOG_STREAM_CAPACITY));
  subscribers.forEach((fn) => fn(entry));
}

export function last(): LogEntry | null {
  return entries.at(-1) ?? null;
}

export function tail(count: number): LogEntry[] {
  return entries.slice(-Math.min(count, LOG_STREAM_CAPACITY));
}

export function subscribe(fn: (entry: LogEntry) => void): () => void {
  if (subscribers.size >= SUBSCRIBER_CAPACITY) throw new Error("E_UI_LOG_STREAM_OVERFLOW");
  subscribers.add(fn);

  return () => {
    subscribers.delete(fn);
  };
}