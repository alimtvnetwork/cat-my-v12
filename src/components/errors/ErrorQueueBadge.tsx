// Plan 71 Step 9: queue navigation badge for the GlobalErrorModal header.
// Shows "N of M" and exposes prev/next buttons wired to the errorStore.

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useErrorStore } from "@/lib/stores/errorStore";

export function ErrorQueueBadge() {
  const currentError = useErrorStore((s) => s.currentError);
  const history = useErrorStore((s) => s.history);
  const next = useErrorStore((s) => s.next);
  const prev = useErrorStore((s) => s.prev);

  if (!currentError || history.length === 0) return null;
  const idx = history.findIndex((h) => h.id === currentError.id);

  if (idx === -1) return null;

  const position = idx + 1;
  const total = history.length;
  const hasPrev = idx > 0;
  const hasNext = idx < total - 1;

  if (total <= 1) return null;

  return (
    <div
      className="flex items-center gap-1 text-xs text-muted-foreground"
      aria-label="Error queue navigation"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        disabled={!hasPrev}
        onClick={prev}
        aria-label="Previous error"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <span className="tabular-nums">
        {position} of {total}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        disabled={!hasNext}
        onClick={next}
        aria-label="Next error"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
