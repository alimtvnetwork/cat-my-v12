export enum FloatingInspectorPropsKindType {
  R = "R",
  C = "C",
  K = "K",
  S = "S",
  E = "E",
}
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  Minus,
  Square,
  X,
  Circle as CircleIcon,
  Square as RectIcon,
  ScanText,
  Type,
  Sigma,
  MousePointer,
} from "lucide-react";
import { AppEvent } from "@/lib/constants";

interface OpenDetail {
  ruleId?: string;
  x?: number;
  y?: number;
}

export interface FloatingInspectorProps {
  title: string;
  hasSelection: boolean;
  kind?: FloatingInspectorPropsKindType;
  children: ReactNode;
}

const DEFAULT_SIZE = { w: 340, h: 460 };
const SNAP_THRESHOLD = 16;
const ARROW_STEP = 12;
const ARROW_STEP_LARGE = 48;

const KIND_META: Record<
  NonNullable<FloatingInspectorProps["kind"]>,
  { label: string; Icon: typeof CircleIcon }
> = {
  R: { label: "Rectangle", Icon: RectIcon },
  C: { label: "Circle (ROI)", Icon: CircleIcon },
  K: { label: "OCR", Icon: ScanText },
  S: { label: "Text", Icon: Type },
  E: { label: "Math", Icon: Sigma },
};

export function FloatingInspector({
  title,
  hasSelection,
  kind,
  children,
}: FloatingInspectorProps): React.JSX.Element | null {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<{ x: number; y: number }>({ x: 120, y: 120 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  const applyPos = useCallback((x: number, y: number) => {
    const el = panelRef.current;
    const margin = 8;
    const w = el?.offsetWidth || DEFAULT_SIZE.w;
    const h = el?.offsetHeight || DEFAULT_SIZE.h;
    const maxX = Math.max(margin, window.innerWidth - w - margin);
    const maxY = Math.max(margin, window.innerHeight - h - margin);
    let cx = Math.min(Math.max(margin, x), maxX);
    let cy = Math.min(Math.max(margin, y), maxY);
    // Subtle snap-to-edges when near viewport boundaries.
    if (cx - margin <= SNAP_THRESHOLD) cx = margin;
    else if (maxX - cx <= SNAP_THRESHOLD) cx = maxX;

    if (cy - margin <= SNAP_THRESHOLD) cy = margin;
    else if (maxY - cy <= SNAP_THRESHOLD) cy = maxY;
    posRef.current = { x: cx, y: cy };

    if (el) {
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
    }
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenDetail>).detail ?? {};
      setOpen(true);
      setMinimized(false);
      const base =
        typeof detail.x === "number" && typeof detail.y === "number"
          ? { x: detail.x + 16, y: detail.y + 16 }
          : posRef.current;
      // Defer one frame so the panel is mounted and offsetWidth/Height reflect real size.
      requestAnimationFrame(() => {
        applyPos(base.x, base.y);
        panelRef.current?.focus();
      });
    };
    window.addEventListener(AppEvent.EditorOpenInspector, onOpen as EventListener);

    return () => window.removeEventListener(AppEvent.EditorOpenInspector, onOpen as EventListener);
  }, [applyPos]);

  const lacksSelection = hasSelection === false;

  useEffect(() => {
    if (lacksSelection) {
      setOpen(false);
    }
  }, [hasSelection, lacksSelection]);

  const isClosed = open === false;

  useEffect(() => {
    if (isClosed) {
      return;
    }

    const onResize = () => applyPos(posRef.current.x, posRef.current.y);
    window.addEventListener("resize", onResize);
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => applyPos(posRef.current.x, posRef.current.y))
        : null;
    ro?.observe(document.documentElement);

    if (panelRef.current) ro?.observe(panelRef.current);

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  }, [open, applyPos]);

  const onHeaderDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const { x, y } = posRef.current;
    dragRef.current = { dx: e.clientX - x, dy: e.clientY - y };
  }, []);

  const onHeaderMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;

      if (!d) return;
      pendingRef.current = { x: e.clientX - d.dx, y: e.clientY - d.dy };

      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const p = pendingRef.current;
        pendingRef.current = null;

        if (p) applyPos(p.x, p.y);
      });
    },
    [applyPos],
  );

  const onHeaderUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (dragRef.current) {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
        dragRef.current = null;
      }

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const p = pendingRef.current;
      pendingRef.current = null;

      if (p) applyPos(p.x, p.y);
    },
    [applyPos],
  );

  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      const step = e.shiftKey ? ARROW_STEP_LARGE : ARROW_STEP;
      const { x, y } = posRef.current;
      switch (e.key) {
        case "ArrowLeft":
          applyPos(x - step, y);
          break;
        case "ArrowRight":
          applyPos(x + step, y);
          break;
        case "ArrowUp":
          applyPos(x, y - step);
          break;
        case "ArrowDown":
          applyPos(x, y + step);
          break;
        case "Escape":
          setOpen(false);

          return;
        default:
          return;
      }

      e.preventDefault();
    },
    [applyPos],
  );

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Inspector for ${title}`}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed z-[60] flex flex-col rounded-md border border-ca-border bg-ca-panel-2 shadow-2xl outline-none focus-visible:ring-2 focus-visible:ring-ca-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ca-panel"
      style={{
        left: posRef.current.x,
        top: posRef.current.y,
        width: DEFAULT_SIZE.w,
        maxHeight: minimized ? undefined : "70vh",
        willChange: "left, top",
      }}
    >
      <div
        className="flex cursor-move items-center justify-between gap-2 rounded-t-md border-b border-ca-border bg-ca-panel px-2 py-1.5 text-hmi-caption text-ca-ink"
        onPointerDown={onHeaderDown}
        onPointerMove={onHeaderMove}
        onPointerUp={onHeaderUp}
        onPointerCancel={onHeaderUp}
        style={{ touchAction: "none" }}
      >
        <span className="truncate font-medium">{title}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={minimized ? "Restore inspector" : "Minimize inspector"}
            className="rounded p-1 text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink"
            onClick={() => setMinimized((m) => !m)}
          >
            {minimized ? <Square size={12} /> : <Minus size={12} />}
          </button>
          <button
            type="button"
            aria-label="Close inspector"
            className="rounded p-1 text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink"
            onClick={() => setOpen(false)}
          >
            <X size={12} />
          </button>
        </div>
      </div>
      {!minimized ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {kind ? (
            <div className="flex items-center gap-2 border-b border-ca-border bg-ca-panel/60 px-3 py-2 text-hmi-caption text-ca-ink-muted">
              {(() => {
                const { Icon, label } = KIND_META[kind];

                return (
                  <>
                    <Icon size={14} className="text-ca-primary" aria-hidden />
                    <span className="uppercase tracking-widest">{label} controls</span>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="flex items-center gap-2 border-b border-ca-border bg-ca-panel/60 px-3 py-2 text-hmi-caption text-ca-ink-muted">
              <MousePointer size={14} aria-hidden />
              <span className="uppercase tracking-widest">Selection</span>
            </div>
          )}
          {children}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
