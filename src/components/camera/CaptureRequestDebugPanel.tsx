// On-screen debug panel that shows the exact POV, brightness, contrast,
// exposure, gain, enhance, and saturation values included in the last
// CaptureRequest sent to /api/camera/capture. Useful for verifying that
// the vendor SDK sees the operator's configured values rather than
// whatever the camera booted with.
//
// The panel is mounted globally from __root.tsx and stays hidden until
// a capture has happened. Operators can collapse it via the header
// button; that preference persists across sessions.
import { useEffect, useState } from "react";
import { StorageKey } from "@/lib/constants";
import {
  getLastCaptureRequest,
  subscribe as subscribeLastCapture,
  clearLastCaptureRequest,
  type LastCaptureRequestEntry,
} from "@/lib/camera/last-capture-request-store";

interface DebugRow {
  label: string;
  value: string;
}

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(StorageKey.CaptureRequestPanelCollapsed) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(StorageKey.CaptureRequestPanelCollapsed, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

function formatValue(v: unknown): string {
  if (v === undefined || v === null) return "-";

  if (typeof v === "number") {
    return Number.isInteger(v) ? String(v) : v.toFixed(3).replace(/\.?0+$/, "");
  }

  return String(v);
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

export function CaptureRequestDebugPanel() {
  const [entry, setEntry] = useState<LastCaptureRequestEntry | null>(() => getLastCaptureRequest());
  // SSR-safe: start with the server-side default (`false`) and hydrate the
  // persisted collapsed flag after mount so the first client render matches
  // the server HTML (see preview-mode-store.ts, same class of bug).
  const [collapsed, setCollapsed] = useState<boolean>(false);
  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  useEffect(() => subscribeLastCapture(setEntry), []);

  if (entry === null) return null;

  const { request, timestamp } = entry;
  const rows: DebugRow[] = [
    { label: "POV", value: formatValue(request.povId) },
    { label: "Brightness", value: formatValue(request.brightness) },
    { label: "Contrast", value: formatValue(request.contrast) },
    { label: "Exposure", value: formatValue(request.exposure) },
    { label: "Gain", value: formatValue(request.gain) },
    { label: "Enhance", value: formatValue(request.enhance) },
    { label: "Saturation", value: formatValue(request.saturation) },
  ];

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    writeCollapsed(next);
  };

  return (
    <aside
      role="region"
      aria-label="Last CaptureRequest debug"
      className="fixed bottom-3 right-3 z-[9999] w-72 rounded-md border border-ca-border bg-ca-panel/95 text-ca-ink shadow-lg backdrop-blur"
      style={{ fontFamily: "var(--font-hmi, ui-sans-serif, system-ui)" }}
    >
      <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-ca-border">
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] uppercase tracking-wider text-ca-ink-muted">
            Last CaptureRequest
          </span>
          <span className="text-[11px] tabular-nums text-ca-ink-muted">
            sent {formatTime(timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            className="rounded px-2 py-0.5 text-xs hover:bg-ca-hover"
            aria-expanded={!collapsed}
            aria-controls="capture-request-debug-body"
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "▸" : "▾"}
          </button>
          <button
            type="button"
            onClick={() => clearLastCaptureRequest()}
            className="rounded px-2 py-0.5 text-xs hover:bg-ca-hover"
            title="Clear"
            aria-label="Clear last CaptureRequest"
          >
            ✕
          </button>
        </div>
      </header>
      {!collapsed ? (
        <div id="capture-request-debug-body" className="px-3 py-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-ca-ink-muted">{row.label}</dt>
                <dd className="text-right tabular-nums text-ca-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </aside>
  );
}