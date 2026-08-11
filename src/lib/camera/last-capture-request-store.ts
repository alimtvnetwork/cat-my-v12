// Records the most recent CaptureRequest sent to /api/camera/capture so
// operators can verify (via the on-screen debug panel) that the values
// the vendor SDK actually received match what they configured on
// Settings > Camera. Purely in-memory; not persisted across reloads.
import type { CaptureRequest } from "./capture-bridge";

export interface LastCaptureRequestEntry {
  request: CaptureRequest;
  /** Epoch ms at which the request was sent. */
  timestamp: number;
}

type Listener = (value: LastCaptureRequestEntry | null) => void;

let state: LastCaptureRequestEntry | null = null;
const listeners = new Set<Listener>();

export function getLastCaptureRequest(): LastCaptureRequestEntry | null {
  return state;
}

export function setLastCaptureRequest(request: CaptureRequest): void {
  state = { request: { ...request }, timestamp: Date.now() };
  const snap = state;
  listeners.forEach((cb) => cb(snap));
}

export function clearLastCaptureRequest(): void {
  if (state === null) return;
  state = null;
  listeners.forEach((cb) => cb(null));
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);

  return () => {
    listeners.delete(cb);
  };
}