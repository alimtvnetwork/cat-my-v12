// Plan 87 Step 25: reduced-motion guard.
// SSR-safe wrapper around `matchMedia('(prefers-reduced-motion: reduce)')`.
// Any component that opts into a decorative animation (panel entry, toast
// entry, staged sequences) should short-circuit its motion when this hook
// returns `true`. The css utilities `motion-panel-in` / `motion-toast-in`
// already suppress themselves via `@media (prefers-reduced-motion: reduce)`;
// this hook exists for JS-driven timing (delays, staged reveals, etc.).

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  // SSR / first paint: assume motion is fine so hydration matches the DOM
  // that CSS produced. The effect below reconciles with the actual OS pref.
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(QUERY);
    const apply = () => setReduced(mql.matches);
    apply();
    // `addEventListener` is the modern API; guard for Safari <14 fallback.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", apply);

      return () => mql.removeEventListener("change", apply);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mql as any).addListener(apply);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => (mql as any).removeListener(apply);
  }, []);

  return reduced;
}

export default useReducedMotion;
