// Plan 72 step 19: reusable, non-blocking slice renderer.
//
// Motivation: several consumers (`RuleTemplateHints`, `UpcomingTools`,
// setup.rules "Load sample data", future program/sample pickers) each
// re-implement the same four render branches (idle/loading/empty/ready)
// on top of `useSeedSlice`. That is symptom-patching by duplication,
// and the loading branch typically renders nothing so the UI feels
// blocked until the JSON resolves. `SeedSlot` centralises the four
// branches, ships a real skeleton for the loading state, and never
// blocks parent render: consumers pass the slice key and a ready
// renderer, everything else is defaulted.
//
// Spec references:
//   - spec/03-error-manage §3: no silent failure. `error` branch is
//     always visible; the caller can override the copy but not the
//     "something happened" fact.
//   - spec/21-app/52 (SDK facade pattern): consumers stay ignorant of
//     the concrete facade implementation. `SeedSlot` reads through the
//     existing hooks only.
import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { useSeedSlice } from "./useSeedSlice";
import type { CatSeedBundle, CatSeedBundleSlice } from "./types";

export interface SeedSlotProps<K extends CatSeedBundleSlice> {
  slice: K;
  /** Renderer for the resolved data. Called with a non-empty array. */
  children: (data: NonNullable<CatSeedBundle[K]>) => ReactNode;
  /** Optional override for the empty branch. Defaults to a muted note. */
  empty?: ReactNode;
  /** Optional override for the loading skeleton. */
  skeleton?: ReactNode;
  /** Optional override for the error branch. */
  errorFallback?: (error: Error) => ReactNode;
  /** Accessible label applied to the wrapper section. */
  ariaLabel?: string;
  /** data-slot for style hooks / testing. */
  slot?: string;
}

function DefaultSkeleton({ slot }: { slot?: string }) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      data-slot={slot}
      data-state="loading"
      className="flex flex-col gap-1.5 rounded-md border border-dashed p-2"
    >
      <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
      <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
    </section>
  );
}

export function SeedSlot<K extends CatSeedBundleSlice>({
  slice,
  children,
  empty,
  skeleton,
  errorFallback,
  ariaLabel,
  slot,
}: SeedSlotProps<K>) {
  const { data, status, error } = useSeedSlice(slice);

  if (status === "error") {
    if (errorFallback && error) return <>{errorFallback(error)}</>;

    return (
      <section
        aria-label={ariaLabel}
        data-slot={slot}
        data-state="error"
        className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive"
      >
        <AlertTriangle aria-hidden className="mt-[2px] size-3.5 shrink-0" />
        <span>
          Seed slice “{slice}” unavailable ({error?.message ?? "load failed"}).
        </span>
      </section>
    );
  }

  if (status !== "ready" || !data) {
    return <>{skeleton ?? <DefaultSkeleton slot={slot} />}</>;
  }

  const list = data as unknown as ReadonlyArray<unknown>;

  if (Array.isArray(list) && list.length === 0) {
    return (
      <>
        {empty ?? (
          <section
            aria-label={ariaLabel}
            data-slot={slot}
            data-state="empty"
            className="rounded-md border border-dashed p-2 text-xs text-muted-foreground"
          >
            No seeded entries for “{slice}”.
          </section>
        )}
      </>
    );
  }

  return <>{children(data as NonNullable<CatSeedBundle[K]>)}</>;
}