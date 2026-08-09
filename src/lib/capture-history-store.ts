// Rolling history of recently captured reference images. Kept small
// so localStorage stays under quota (each JPEG data URL can be ~1 MB).
// The strip in ReferenceImageCard reads this store so operators can
// reselect a recent shot without asking the camera for another frame.

import { StorageKey } from "@/lib/constants";
const MAX_ENTRIES = 6;
const MAX_TOTAL_BYTES = 6 * 1024 * 1024; // ~6 MB across all thumbnails

export interface CaptureHistoryEntry {
  id: string;
  dataUrl: string;
  capturedAt: number;
  width?: number;
  height?: number;
  povId?: string;
}

type Listener = (entries: CaptureHistoryEntry[]) => void;
const listeners = new Set<Listener>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function read(): CaptureHistoryEntry[] {
  if (isBrowser() === false) return [];
  try {
    const raw = window.localStorage.getItem(StorageKey.CaptureHistory);

    if (!raw) return [];
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) === false) return [];

    return parsed.filter(
      (e): e is CaptureHistoryEntry =>
        e &&
        typeof e.id === "string" &&
        typeof e.dataUrl === "string" &&
        typeof e.capturedAt === "number",
    );
  } catch (err) {
    console.error("[capture-history] read failed", err);

    return [];
  }
}

function write(entries: CaptureHistoryEntry[]): CaptureHistoryEntry[] {
  if (isBrowser() === false) return entries;
  // Cap by count first, then trim from the tail while the payload is
  // over the byte budget, so the most recent shots always survive.
  let trimmed = entries.slice(0, MAX_ENTRIES);
  const size = (list: CaptureHistoryEntry[]) => list.reduce((n, e) => n + e.dataUrl.length, 0);
  while (trimmed.length > 1 && size(trimmed) > MAX_TOTAL_BYTES) {
    trimmed = trimmed.slice(0, -1);
  }

  try {
    window.localStorage.setItem(StorageKey.CaptureHistory, JSON.stringify(trimmed));
  } catch (err) {
    console.error("[capture-history] write failed", err);
    // Fall back to an in-memory-only update so listeners still see it.
  }

  listeners.forEach((cb) => cb(trimmed));

  return trimmed;
}

export function getCaptureHistory(): CaptureHistoryEntry[] {
  return read();
}

export function addCaptureToHistory(
  entry: Omit<CaptureHistoryEntry, "id" | "capturedAt"> &
    Partial<Pick<CaptureHistoryEntry, "id" | "capturedAt">>,
): CaptureHistoryEntry {
  const record: CaptureHistoryEntry = {
    id: entry.id ?? `cap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    dataUrl: entry.dataUrl,
    capturedAt: entry.capturedAt ?? Date.now(),
    width: entry.width,
    height: entry.height,
    povId: entry.povId,
  };
  const existing = read().filter((e) => e.dataUrl !== record.dataUrl);
  write([record, ...existing]);

  return record;
}

export function removeCaptureFromHistory(id: string): void {
  write(read().filter((e) => e.id !== id));
}

export function clearCaptureHistory(): void {
  write([]);
}

export function subscribeCaptureHistory(cb: Listener): () => void {
  listeners.add(cb);

  return () => {
    listeners.delete(cb);
  };
}
