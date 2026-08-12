
export enum ApplyThemeClassResolvedType {
  Light = "light",
  Dark = "dark",
}
/**
 * ThemeController: single side-effect component that mirrors the
 * persisted `theme` preference from `useUiPrefsStore` onto <html>.
 *
 * Effects:
 *   - Adds `.dark` OR `.light` on <html> (never both) so Tailwind's
 *     `.dark` custom variant AND our new `.light` chrome overrides
 *     both work. Also sets `data-theme` for CSS attribute selectors
 *     and `color-scheme` so native form controls, scrollbars, and
 *     the browser UI match the app.
 *   - When `theme === "system"`, subscribes to
 *     `prefers-color-scheme: dark` and re-syncs live so the chrome
 *     tracks OS-level changes without a reload.
 *
 * SSR-safe: all DOM access is wrapped in `useEffect` / window checks.
 */
import { useEffect } from "react";
import { useUiPrefsStore, type ThemeVariant, type UiFlavor } from "@/lib/ui-prefs-store";

function resolveTheme(theme: ThemeVariant): ApplyThemeClassResolvedType {
  if (theme === "system") {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return ApplyThemeClassResolvedType.Dark;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? ApplyThemeClassResolvedType.Dark : ApplyThemeClassResolvedType.Light;
  }

  return theme as unknown as ApplyThemeClassResolvedType;
}

function applyThemeClass(resolved: ApplyThemeClassResolvedType) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === ApplyThemeClassResolvedType.Dark);
  root.classList.toggle("light", resolved === ApplyThemeClassResolvedType.Light);
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

export function ThemeController() {
  const theme = useUiPrefsStore((s) => s.theme);
  const uiFlavor = useUiPrefsStore((s) => s.uiFlavor);

  useEffect(() => {
    applyThemeClass(resolveTheme(theme));

    // Also apply the UI flavor attribute
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-ui-flavor", uiFlavor);
    }

    if (theme !== "system") return;

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeClass(mq.matches ? ApplyThemeClassResolvedType.Dark : ApplyThemeClassResolvedType.Light);
    mq.addEventListener("change", onChange);

    return () => mq.removeEventListener("change", onChange);
  }, [theme, uiFlavor]);

  return null;
}
