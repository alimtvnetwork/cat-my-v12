// Plan 88 step 3: Right-rail collapsible panel primitive.
//
// Extends CollapsibleSection with two additional per-panel controls:
//   • Hide (eye)  — persists a "hidden" flag; body + header collapse to zero.
//   • Close (x)   — same signal as hide, but semantically "removed until
//                   restored from the Window menu". We store both under the
//                   same key; WindowMenu (step 8) reads the hidden set to
//                   list restorable panels.
//
// State is persisted to localStorage under:
//   hmi.rail.panel:<storageKey>.open      → "1" | "0"
//   hmi.rail.panel:<storageKey>.hidden    → "1" | "0"
//
// A window-scoped CustomEvent `hmi:rail-panel:set-hidden` lets the
// WindowMenu restore a panel without lifting state into a store.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Eye, EyeOff, X } from "lucide-react";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

/* eslint-disable react-refresh/only-export-components -- co-located event constants ship with the component intentionally. */

export const RAIL_PANEL_SET_HIDDEN_EVENT = "hmi:rail-panel:set-hidden";
export type RailPanelSetHiddenDetail = { storageKey: string; hidden: boolean };

export function broadcastRailPanelHidden(storageKey: string, hidden: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<RailPanelSetHiddenDetail>(RAIL_PANEL_SET_HIDDEN_EVENT, {
      detail: { storageKey, hidden },
    }),
  );
}

const STORAGE_PREFIX = "hmi.rail.panel:";
const openKey = (k: string) => `${STORAGE_PREFIX}${k}.open`;
const hiddenKey = (k: string) => `${STORAGE_PREFIX}${k}.hidden`;

function readFlag(fullKey: string): boolean | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(fullKey);

    if (raw === "1") return true;

    if (raw === "0") return false;
  } catch {
    /* ignore */
  }

  return undefined;
}

function writeFlag(fullKey: string, value: boolean): void {
  try {
    window.localStorage.setItem(fullKey, value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export interface CollapsiblePanelSectionProps {
  storageKey: string;
  title: string;
  defaultOpen?: boolean;
  hideActions?: boolean;
  /** Optional trailing content in the header (badges, counts). */
  headerAccessory?: ReactNode;
  children: ReactNode;
}

export function CollapsiblePanelSection({
  storageKey,
  title,
  defaultOpen = true,
  hideActions = false,
  headerAccessory,
  children,
}: CollapsiblePanelSectionProps): React.JSX.Element | null {
  // Deterministic SSR initial values; hydrated preferences applied post-mount.
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const [hidden, setHidden] = useState<boolean>(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedOpen = readFlag(openKey(storageKey));

    if (storedOpen !== undefined && storedOpen !== defaultOpen) setOpen(storedOpen);
    const storedHidden = readFlag(hiddenKey(storageKey));

    if (storedHidden === true) setHidden(true);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const isUnhydrated = !hydrated;

  useEffect(() => {
    if (isUnhydrated) return;
    writeFlag(openKey(storageKey), open);
  }, [storageKey, open, hydrated]);

  useEffect(() => {
    if (isUnhydrated) return;
    writeFlag(hiddenKey(storageKey), hidden);
    broadcastRailPanelHidden(storageKey, hidden);
  }, [storageKey, hidden, hydrated]);

  // Listen for external restore requests (WindowMenu, keyboard shortcut).
  useEffect(() => {
    function onSetHidden(ev: Event) {
      const detail = (ev as CustomEvent<RailPanelSetHiddenDetail>).detail;

      if (!detail || detail.storageKey !== storageKey) return;
      setHidden(detail.hidden);
    }

    window.addEventListener(RAIL_PANEL_SET_HIDDEN_EVENT, onSetHidden);

    return () => window.removeEventListener(RAIL_PANEL_SET_HIDDEN_EVENT, onSetHidden);
  }, [storageKey]);

  const toggleOpen = useCallback(() => setOpen((v) => !v), []);
  const toggleHidden = useCallback(() => setHidden((v) => !v), []);
  const close = useCallback(() => setHidden(true), []);

  // When hidden, render nothing visible; keep an aria-hidden marker for tests.
  if (hidden) {
    return (
      <div
        data-rail-panel={storageKey}
        data-rail-panel-hidden="true"
        aria-hidden="true"
        style={{ display: "none" }}
      />
    );
  }

  // Keyboard shortcuts on the header:
  //   Enter / Space      → toggle (native button)
  //   ArrowRight         → expand
  //   ArrowLeft          → collapse
  //   H                  → hide
  //   Delete / Backspace → close
  // Scoped so shortcuts only fire when focus is inside the header itself.
  const onHeadKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;

      if (target.closest(".rail-panel-head") === null) return;

      if (KeyboardKeyType.isArrowRight(e.key)) {
        e.preventDefault();
        setOpen(true);
      } else if (KeyboardKeyType.isArrowLeft(e.key)) {
        e.preventDefault();
        setOpen(false);
      } else if (KeyboardKeyType.isH(e.key) || KeyboardKeyType.isHUpper(e.key)) {
        e.preventDefault();
        toggleHidden();
      } else if (KeyboardKeyType.isDelete(e.key) || KeyboardKeyType.isBackspace(e.key)) {
        e.preventDefault();
        close();
      }
    },
    [toggleHidden, close],
  );

  return (
    <section
      className="rail-panel-section"
      data-rail-panel={storageKey}
      data-open={open ? "true" : "false"}
      suppressHydrationWarning
    >
      <div className="rail-panel-head" onKeyDown={onHeadKeyDown}>
        <button
          type="button"
          className="rail-panel-head-toggle"
          aria-expanded={open}
          aria-controls={`rail-panel-body-${storageKey}`}
          onClick={toggleOpen}
          title={open ? "Collapse (← / Enter)  |  H hide  |  Del close" : "Expand (→ / Enter)"}
          aria-keyshortcuts="Enter Space ArrowLeft ArrowRight H Delete"
        >
          <ChevronRight
            className="rail-panel-chevron"
            data-open={open ? "true" : "false"}
            size={12}
            aria-hidden="true"
          />
          <span className="rail-panel-title">{title}</span>
        </button>
        {!hideActions || headerAccessory ? (
          <div className="rail-panel-head-actions">
            {headerAccessory}
            {!hideActions ? (
              <>
                <button
                  type="button"
                  className="rail-panel-icon-button"
                  onClick={toggleHidden}
                  aria-label={`Hide ${title} panel`}
                  aria-keyshortcuts="H"
                  title="Hide panel (H)"
                >
                  {hidden ? (
                    <EyeOff size={12} aria-hidden="true" />
                  ) : (
                    <Eye size={12} aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  className="rail-panel-icon-button"
                  onClick={close}
                  aria-label={`Close ${title} panel`}
                  aria-keyshortcuts="Delete"
                  title="Close panel (Del)  |  restore from Window menu"
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="rail-panel-body-wrap">
        <div
          id={`rail-panel-body-${storageKey}`}
          className="rail-panel-body"
          role="region"
          aria-label={title}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
