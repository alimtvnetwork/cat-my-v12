import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 100 Phase C step 22: SPA-navigation guard for the shared InlineEdit
// dirty registry. Uses TanStack Router's `useBlocker` so that when any
// inline editor holds an unsaved draft, changing routes prompts the user
// with the browser's native `confirm()` dialog. `beforeunload` covers
// tab close / full reload; this covers client-side navigation.
import { useBlocker } from "@tanstack/react-router";
import { isAnyInlineEditDirty, subscribeInlineEditDirty } from "@/lib/editor/inline-edit-registry";
import { useEffect, useState } from "react";

export function InlineEditNavigationGuard(): React.JSX.Element | null {
  // Re-render whenever the dirty set toggles, so `useBlocker`'s condition
  // reflects the latest state on every navigation attempt.
  const [dirty, setDirty] = useState<boolean>(() => isAnyInlineEditDirty());
  useEffect(() => subscribeInlineEditDirty(() => setDirty(isAnyInlineEditDirty())), []);

  useBlocker({
    shouldBlockFn: () => {
      if (!dirty) return false;
      const proceed =
        typeof window !== "undefined"
          ? window.confirm("You have unsaved changes to a name. Discard and leave this page?")
          : true;

      if (!proceed) {
        ClientLogger.warn("[InlineEditNavigationGuard] navigation blocked; dirty editors present");
      }

      return !proceed;
    },
    enableBeforeUnload: false, // registry already binds beforeunload once.
  });

  return null;
}
