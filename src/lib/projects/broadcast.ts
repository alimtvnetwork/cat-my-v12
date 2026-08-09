// Plan 80 step 38: BroadcastChannel cross-tab sync for facade-backed stores.
//
// IndexedDB does not emit `storage` events, so the pre-facade cross-tab
// sync (window "storage" listener) stopped working when stores moved onto
// `createFacadeStateStorage`. This module restores multi-tab sync uniformly:
// every write through `createFacadeStateStorage` broadcasts a `{ name }`
// message, and any tab can subscribe to invalidate its in-memory cache.
//
// Zero external deps. Falls back to a no-op when `BroadcastChannel` is
// unavailable (SSR, some private-mode browsers).

const CHANNEL_NAME = "ca-facade-writes.v1";

export interface FacadeWriteMessage {
  name: string;
  op: "set" | "remove";
  // Monotonic-ish tag so a tab can ignore its own echo.
  origin: string;
}

let channel: BroadcastChannel | null = null;
const ORIGIN = `tab-${Math.random().toString(36).slice(2, 10)}`;
const listeners = new Set<(msg: FacadeWriteMessage) => void>();

function ensureChannel(): BroadcastChannel | null {
  if (channel) return channel;

  if (typeof BroadcastChannel === "undefined") return null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (ev) => {
      const msg = ev.data as FacadeWriteMessage | undefined;

      if (!msg || typeof msg.name !== "string") return;

      if (msg.origin === ORIGIN) return; // ignore own echo
      for (const cb of listeners) {
        try {
          cb(msg);
        } catch (err) {
          console.warn("[facade/broadcast] listener threw", err);
        }
      }
    });
  } catch (err) {
    console.warn("[facade/broadcast] init failed", err);
    channel = null;
  }

  return channel;
}

export function broadcastFacadeWrite(name: string, op: "set" | "remove"): void {
  const ch = ensureChannel();

  if (!ch) return;
  try {
    ch.postMessage({ name, op, origin: ORIGIN } satisfies FacadeWriteMessage);
  } catch (err) {
    console.warn("[facade/broadcast] postMessage failed", err);
  }
}

export function subscribeFacadeWrites(cb: (msg: FacadeWriteMessage) => void): () => void {
  ensureChannel();
  listeners.add(cb);

  return () => {
    listeners.delete(cb);
  };
}

export function getFacadeBroadcastOrigin(): string {
  return ORIGIN;
}
