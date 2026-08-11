// SkipToContentLink: WCAG 2.4.1 "Bypass Blocks" affordance. Renders as the
// first focusable element in the app header so keyboard users can jump
// past the titlebar / breadcrumb / menubar directly to the `<main>`
// landmark (id="app-main" in HmiShell). Visually hidden until focused.
export function SkipToContentLink() {

  return (
    <a
      href="#app-main"
      data-testid="skip-to-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:inline-flex focus:items-center focus:rounded-md focus:border focus:border-ca-border focus:bg-ca-panel focus:px-3 focus:py-1.5 focus:text-hmi-body focus:text-ca-ink focus:shadow-hmi-panel focus:outline-2 focus:outline-offset-2 focus:outline-[var(--ca-focus-ring)]"
      onClick={(event) => {
        // Move focus (not just scroll) so the next Tab lands inside `<main>`.
        const target = document.getElementById("app-main");

        if (target) {
          event.preventDefault();
          target.focus({ preventScroll: false });
          target.scrollIntoView({ block: "start" });
        }
      }}
    >
      Skip to main content
    </a>
  );
}
