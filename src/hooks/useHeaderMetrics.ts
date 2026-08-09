import { useEffect, useRef } from "react";

/**
 * Observe the app `<header>` and publish its live pixel dimensions as CSS
 * custom properties on `documentElement`, so anything anchored to the header
 * (sticky offsets, floating toasts, dock hints) stays aligned when the
 * viewport, density, or breakpoint changes.
 *
 * Published variables:
 *   --app-header-h        real rendered header height (row + optional crumb row)
 *   --app-header-row-h    just the top row height
 *   --app-header-crumb-h  breadcrumb row height (0 when hidden)
 *   --app-header-w        header width in px (useful for menu collision math)
 *
 * Uses ResizeObserver (element-level) plus window resize / orientationchange
 * (viewport-level) so both container-driven and viewport-driven layout shifts
 * trigger a recompute. All writes are rAF-batched.
 */
export function useHeaderMetrics<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;

    if (!el || typeof window === "undefined") return;

    const root = document.documentElement;
    let raf = 0;

    const measure = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const row = el.querySelector<HTMLElement>('[data-app-shell-row="top"]');
      const crumb = el.querySelector<HTMLElement>('[data-app-shell-row="breadcrumb"]');
      const rowH = row ? row.getBoundingClientRect().height : rect.height;
      const crumbH = crumb ? crumb.getBoundingClientRect().height : 0;

      root.style.setProperty("--app-header-h", `${Math.round(rect.height)}px`);
      root.style.setProperty("--app-header-row-h", `${Math.round(rowH)}px`);
      root.style.setProperty("--app-header-crumb-h", `${Math.round(crumbH)}px`);
      root.style.setProperty("--app-header-w", `${Math.round(rect.width)}px`);
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(measure);
    };

    measure();

    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    const row = el.querySelector<HTMLElement>('[data-app-shell-row="top"]');
    const crumb = el.querySelector<HTMLElement>('[data-app-shell-row="breadcrumb"]');

    if (row) ro.observe(row);

    if (crumb) ro.observe(crumb);

    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, []);

  return ref;
}
