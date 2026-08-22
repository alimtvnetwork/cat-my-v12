// Plan 65 step 5-6: Collapsible section wrapper for Rules panel subsections.
// Persists open/closed state per key to localStorage so operators can hide
// noisy subsections (Preview, Properties) and keep Layers focused.
//
// Plan 65 step 7-8: also listens for a broadcast event
// `hmi:inspector-sections:set-all` so the InspectorSurface toolbar can
// collapse-all or expand-all every section in one click, without lifting
// state into a store.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { HtmlTagType } from "@/lib/enums/html";

/* eslint-disable react-refresh/only-export-components -- co-located helpers (event constant + shortcuts hook) intentionally ship next to the component; extracting adds a two-line module for no runtime benefit. */

export const INSPECTOR_SECTIONS_SET_ALL_EVENT = "hmi:inspector-sections:set-all";

export type InspectorSectionsSetAllDetail = { open: boolean };

export function broadcastInspectorSections(open: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<InspectorSectionsSetAllDetail>(INSPECTOR_SECTIONS_SET_ALL_EVENT, {
      detail: { open },
    }),
  );
}

/**
 * Plan 65 step 10: Global keyboard shortcuts for the inspector sections.
 *   Alt+E: expand all
 *   Alt+C: collapse all
 * Mounted once from the app shell so the shortcut works whether the
 * Rules panel is docked, floated, or minimized. Ignored while the user
 * is typing in an input, textarea, or contentEditable element.
 */
export function useInspectorSectionShortcuts(): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;

      if (target) {
        const tag = target.tagName;

        if (HtmlTagType.isInput(tag) || HtmlTagType.isTextarea(tag) || HtmlTagType.isSelect(tag)) return;

        if (target.isContentEditable) return;
      }

      switch (e.key) {
        case KeyboardKeyType.E:
        case KeyboardKeyType.EUpper:
          e.preventDefault();
          broadcastInspectorSections(true);
          break;
        case KeyboardKeyType.C:
        case KeyboardKeyType.CUpper:
          e.preventDefault();
          broadcastInspectorSections(false);
          break;
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

const STORAGE_PREFIX = "hmi.inspector.section:";

function readStored(key: string): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);

    if (raw === "1") return true;

    if (raw === "0") return false;
  } catch {
    // ignore storage errors
  }

  return undefined;
}

export interface CollapsibleSectionProps {
  storageKey: string;
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function CollapsibleSection({
  storageKey,
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps): React.JSX.Element | null {
  // Initialize with `defaultOpen` on both server and client so the initial
  // hydration output matches the SSR HTML byte-for-byte. Any stored
  // preference is applied in a post-hydration effect below, which React
  // handles as a normal update instead of a hydration mismatch.
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  // Apply the persisted preference exactly once after mount.
  useEffect(() => {
    const stored = readStored(storageKey);

    if (stored !== undefined && stored !== defaultOpen) setOpen(stored);
    setHydrated(true);
    // Only re-run if the section identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const isUnhydrated = !hydrated;

  useEffect(() => {
    if (isUnhydrated) return;
    try {
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, open ? "1" : "0");
    } catch {
      // storage may be unavailable (private mode); ignore
    }
  }, [storageKey, open, hydrated]);

  useEffect(() => {
    function onSetAll(ev: Event) {
      const detail = (ev as CustomEvent<InspectorSectionsSetAllDetail>).detail;

      if (detail && typeof detail.open === "boolean") setOpen(detail.open);
    }

    window.addEventListener(INSPECTOR_SECTIONS_SET_ALL_EVENT, onSetAll);

    return () => window.removeEventListener(INSPECTOR_SECTIONS_SET_ALL_EVENT, onSetAll);
  }, []);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  return (
    // suppressHydrationWarning: `open` is initialized deterministically to
    // `defaultOpen` on both server and client, so the SSR HTML matches the
    // first client render. In dev, Vite HMR can occasionally push an
    // updated client module while the server bundle still holds the old
    // one, producing a spurious data-open / aria-expanded diff. Suppressing
    // the warning on these attribute-only diffs is the React-blessed
    // escape hatch; DOM structure is now identical (body is always
    // rendered and hidden via CSS) so no tree regeneration happens.
    <section
      className="inspector-section"
      data-open={open ? "true" : "false"}
      suppressHydrationWarning
    >
      <button
        type="button"
        className="inspector-section-head"
        aria-expanded={open}
        onClick={toggle}
        suppressHydrationWarning
      >
        <span
          className="inspector-section-chevron"
          aria-hidden="true"
          data-open={open ? "true" : "false"}
          suppressHydrationWarning
        >
          ▸
        </span>
        <span className="inspector-section-title">{title}</span>
      </button>
      {/* Body is always mounted; visibility is driven by the `data-open`
          attribute on the parent section (see styles.css). Keeping the
          DOM structure identical between server and client removes the
          class of hydration mismatches that used to regenerate the tree
          when `open` state briefly disagreed. */}
      <div className="inspector-section-body">{children}</div>
    </section>
  );
}
