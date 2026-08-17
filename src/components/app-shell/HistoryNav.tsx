import { ClientLogger } from "@/lib/observability/client-logger";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { HtmlTagType } from "@/lib/enums/html";

/* eslint-disable react-refresh/only-export-components -- `computeRouteParent` is a pure helper co-located with the component so the unit test can import it directly; extracting it adds a two-line module for no runtime benefit. */

/**
 * Hybrid Back / Forward nav (plan 66 SH-04, spec 39).
 *
 * Back semantics answer Q4 = (c) hybrid:
 *   1. If `router.history.canGoBack()` returns true, do `history.back()`.
 *   2. Otherwise, fall back to the route-parent computed by dropping the
 *      last path segment of the current pathname. If that would land on
 *      the same URL (already at "/") the button is disabled.
 *
 * Keyboard `Alt+Left` / `Alt+Right` mirror the buttons and short-circuit
 * inside INPUT / TEXTAREA / SELECT / contenteditable so typing does not
 * navigate.
 */

/** Drop the last non-empty path segment; return null if already at root. */
export function computeRouteParent(pathname: string): string | null {
  const trimmed = pathname.replace(/\/+$/, "");

  if (trimmed === "" || trimmed === "/") {
    return null;
  }

  const idx = trimmed.lastIndexOf("/");

  if (idx <= 0) {
    return "/";
  }

  return trimmed.slice(0, idx);
}

function computeNextHistoryState(router: any) {
  return {
    canBack: router.history.canGoBack(),
    canForward: (router.history as any).index < router.history.length - 1,
  };
}

function useHistoryState(): { canBack: boolean; canForward: boolean } {
  const router = useRouter();
  const [state, setState] = useState(() => computeNextHistoryState(router));

  useEffect(() => {
    const sync = () => {
      const next = computeNextHistoryState(router);
      setState((prev) =>
        prev.canBack === next.canBack && prev.canForward === next.canForward ? prev : next,
      );
    };

    sync();

    return router.history.subscribe(sync);
  }, [router]);

  return state;
}

export function isTypingTarget(el: EventTarget | null): boolean {
  const isObject = el !== null && typeof el === "object";

  if (isObject === false) {
    return false;
  }

  const node = el as { tagName?: unknown; isContentEditable?: unknown };
  const tag = typeof node.tagName === "string" ? node.tagName : "";
  const isTargetTag =
    HtmlTagType.isInput(tag) || HtmlTagType.isTextarea(tag) || HtmlTagType.isSelect(tag);
  const isContentEditable = node.isContentEditable === true;
  const isTyping = isTargetTag || isContentEditable;

  if (isTyping) {
    return true;
  }

  return false;
}

export function HistoryNav(): React.JSX.Element | null {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { canBack, canForward } = useHistoryState();
  const parent = computeRouteParent(pathname);

  const back = useCallback(() => {
    if (router.history.canGoBack()) {
      // Spec 39 log assertion: back-via-history.
      ClientLogger.info("[nav.back] via=history");
      router.history.back();

      return;
    }

    if (parent !== null) {
      // Spec 39 log assertion: back-via-route-parent.
      ClientLogger.info("[nav.back] via=route-parent", parent);
      router.navigate({ to: parent });
    }
  }, [router, parent]);

  const forward = useCallback(() => {
    if (canForward) router.history.forward();
  }, [router, canForward]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isAltOnly =
        e.altKey && e.ctrlKey === false && e.metaKey === false && e.shiftKey === false;
      const shouldHandle =
        isAltOnly &&
        isTypingTarget(e.target) === false &&
        KeyboardKeyType.isArrowLeftOrRight(e.key);

      if (shouldHandle === false) {
        return;
      }

      e.preventDefault();
      KeyboardKeyType.isArrowLeft(e.key) ? back() : forward();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [back, forward]);

  const isBackDisabled = canBack === false && parent === null;
  const isForwardDisabled = canForward === false;

  return (
    <div className="flex items-center gap-1" role="group" aria-label="History navigation">
      <button
        type="button"
        onClick={back}
        disabled={isBackDisabled}
        aria-disabled={isBackDisabled}
        aria-label="Go back"
        data-testid="history-back"
        title={
          canBack ? "Back (Alt+Left)" : parent ? `Back to ${parent} (Alt+Left)` : "Back (Alt+Left)"
        }
        className="hmi-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-sm hover:bg-ca-select/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        onClick={forward}
        disabled={isForwardDisabled}
        aria-disabled={isForwardDisabled}
        aria-label="Go forward"
        data-testid="history-forward"
        title="Forward (Alt+Right)"
        className="hmi-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-sm hover:bg-ca-select/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
