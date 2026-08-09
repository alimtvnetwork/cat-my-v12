// Plan 43 slice-1 step 4: mounts ErrorDialog in Dev/Test, a toast fallback
// in Prod, and binds global error handlers on mount.

import { useEffect, useState } from "react";
import { subscribe, installGlobalErrorHandlers } from "@/lib/errors";
import type { ErrorRecord } from "@/lib/errors";
import { getAppMode, isDialogVisibleMode } from "@/lib/app-mode";
import { ErrorDialog } from "./ErrorDialog";

export function ErrorDialogProvider() {
  const [record, setRecord] = useState<ErrorRecord | null>(null);
  const [prodToast, setProdToast] = useState<ErrorRecord | null>(null);

  useEffect(() => {
    const uninstall = installGlobalErrorHandlers();
    const mode = getAppMode();
    const showModal = isDialogVisibleMode(mode);
    const unsub = subscribe((rec) => {
      if (showModal) {
        setRecord(rec);
      } else {
        // Prod: minimal generic toast; do NOT expose stack.
        setProdToast(rec);
        window.setTimeout(() => setProdToast(null), 4000);
      }
    });

    return () => {
      unsub();
      uninstall();
    };
  }, []);

  return (
    <>
      <ErrorDialog record={record} onClose={() => setRecord(null)} />
      {prodToast ? (
        <div
          data-testid="error-toast-prod"
          className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-lg"
        >
          Something went wrong. Please try again.
        </div>
      ) : null}
    </>
  );
}
