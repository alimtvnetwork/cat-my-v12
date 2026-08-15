// Plan 83 backlog item 21: sr-only live regions wired to the shared
// `useAnnouncerStore`. Mounted once from `src/routes/__root.tsx`.

import { type ReactElement } from "react";

import { useAnnouncerStore } from "@/lib/a11y/announcer";

export function LiveAnnouncer(): ReactElement {
  const polite = useAnnouncerStore((s) => s.polite);
  const assertive = useAnnouncerStore((s) => s.assertive);

  return (
    <>
      <div
        data-testid="a11y-live-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {polite}
      </div>
      <div
        data-testid="a11y-live-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertive}
      </div>
    </>
  );
}
