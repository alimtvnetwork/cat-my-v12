# UI Breakages Fix Plan

## Goal

Fix the reported UI issues across the Modern and Standard layouts to ensure a professional, compact, and bug-free experience.

## Open Questions

- For the "layer numbers" styling, do you prefer a subtle badge design or simply a monospaced font with better alignment? (I will start with a cleaner monospaced badge layout).

## Proposed Changes

### UI Core Shell & Navigation

- **Hide `CLI unknown`**: Update `src/components/cli/GlobalCliStatusWidget.tsx`. If the backend is unreachable or disconnected (`unavailable`), we will return `null` instead of showing a red "n/a" or "unknown" pill that clutters the UI.
- **Add Missing UI Switcher & Window Menu**: Add `FlavorToggle` and `WindowMenu` into `src/components/app-shell/StandardAppShellNav.tsx` and `src/components/app-shell/nav.tsx` so users can seamlessly switch between "Modern" and "Standard" UI modes everywhere, and see their active windows.
- **Fix Duplicate Setup Menu**: Inspect `src/components/app-shell/sidebar.tsx` and `__root.tsx` to remove any duplicated sidebar mounting or redundant navigation links.

### Responsiveness & Overflow

- **Compact Screen Fixes**: Add `flex-wrap`, `min-w-0`, and proper `overflow-hidden` classes to the main layout panels so controls don't flow off-screen when the viewport shrinks.
- **Right Sidebar Bounds**: Apply `max-w-full` and `overflow-y-auto` constraints so that settings and control buttons wrap or scroll gracefully instead of breaking out of the container.

### Visual Polish

- **Layer Numbers**: Update the layer number display in the modern screen to use a more professional, subdued badge style (e.g., `font-mono bg-zinc-100 dark:bg-zinc-800 text-xs px-1.5 py-0.5 rounded`).

## Verification Plan

- Manual UI verification: Ensure responsive resizing does not break layout. Ensure "CLI unknown" is hidden when offline. Ensure UI switch and Window menu buttons are present.
