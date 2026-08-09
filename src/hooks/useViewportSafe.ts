import { useEffect, useState, type RefObject } from "react";

/**
 * Returns `true` when the element referenced by `ref` fits inside the
 * viewport at its current fixed/floating position, `false` otherwise.
 *
 * Purpose: enforces `.lovable/spec/commands/25-hide-clipped-floating-notices.md`
 * ("If this notification bar is cut, then hide it.") for any fixed
 * floating card. Callers gate rendering on the boolean, so clipped
 * chrome is never drawn.
 *
 * Semantics:
 *   - Runs after mount, on window `resize`, and on `visualViewport` resize
 *     so split-view / mobile keyboard changes are picked up.
 *   - Uses `getBoundingClientRect()` against `window.innerWidth` /
 *     `innerHeight` with an optional `margin` (default 4px) to require a
 *     small breathing gap from the viewport edge.
 *   - Returns `true` on the server (SSR) so the element renders on first
 *     paint, then re-evaluates in the browser on mount. The alternative
 *     ("false on SSR") flashes empty and hides the notice on tablets that
 *     hydrate before layout.
 *
 * Root cause this hook exists to fix: `WorkerHealthBanner` renders at
 * `fixed top-16 right-4 max-w-xs` unconditionally, so at split-view widths
 * the card draws partially off-screen instead of being suppressed.
 */
export function useViewportSafe(ref: RefObject<HTMLElement | null>, margin: number = 4): boolean {
  const [safe, setSafe] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = ref.current;

    if (!el) return;

    const measure = (): void => {
      const node = ref.current;

      if (!node) return;
      const rect = node.getBoundingClientRect();
      // A zero-size rect means the element is display:none or not yet
      // laid out. Treat that as "not clipped" so we do not oscillate.
      if (rect.width === 0 && rect.height === 0) {
        setSafe(true);

        return;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const fits =
        rect.left >= margin &&
        rect.top >= margin &&
        rect.right <= vw - margin &&
        rect.bottom <= vh - margin;
      setSafe(fits);
    };

    measure();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", measure);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      vv?.removeEventListener("resize", measure);
    };
  }, [ref, margin]);

  return safe;
}
