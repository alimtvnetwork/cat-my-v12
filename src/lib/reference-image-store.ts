import { ClientLogger } from "@/lib/observability/client-logger";
// Persistent, program-agnostic reference image used by the canvas overlay
// and the live MachineFrame. Backed by localStorage so operators keep their
// uploaded PCB image across reloads. Falls back to the shipped sample when
// nothing is stored.

import { StorageKey } from "@/lib/constants";
type Listener = (value: string | null) => void;
const listeners = new Set<Listener>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getReferenceImage(): string | null {
  if (isBrowser() === false) return null;
  try {
    return window.localStorage.getItem(StorageKey.ReferenceImage);
  } catch (err) {
    ClientLogger.error("[reference-image] read failed", err);

    return null;
  }
}

export function setReferenceImage(dataUrl: string): void {
  if (isBrowser() === false) return;
  try {
    window.localStorage.setItem(StorageKey.ReferenceImage, dataUrl);
    listeners.forEach((cb) => cb(dataUrl));
  } catch (err) {
    ClientLogger.error("[reference-image] write failed", err);

    throw err;
  }
}

export function clearReferenceImage(): void {
  if (isBrowser() === false) return;
  try {
    window.localStorage.removeItem(StorageKey.ReferenceImage);
    listeners.forEach((cb) => cb(null));
  } catch (err) {
    ClientLogger.error("[reference-image] clear failed", err);
  }
}

export function subscribe(cb: Listener): () => void {
  listeners.add(cb);

  return () => listeners.delete(cb);
}
