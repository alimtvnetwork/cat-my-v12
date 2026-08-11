import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Shape-matched loading placeholders for CLI list surfaces.
 * Prefer these over spinner-only states so layout does not jump on data arrival.
 */

type TableProps = {
  columns?: number;
  rows?: number;
  testId?: string;
  className?: string;
};

export function TableSkeleton({ columns = 4, rows = 6, testId, className }: TableProps) {
  return (
    <div
      data-testid={testId}
      role="status"
      aria-label="Loading rows"
      className={cn(
        "overflow-hidden rounded-hmi-sm border border-ca-border bg-ca-surface",
        className,
      )}
    >
      <div
        className="grid gap-hmi-2 border-b border-ca-border bg-ca-surface-alt p-hmi-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-2/3" />
        ))}
      </div>
      <div className="divide-y divide-ca-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-hmi-2 p-hmi-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, c) => (
              <Skeleton key={c} className={cn("h-4", c === 0 ? "w-5/6" : "w-3/4")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type GridProps = {
  count?: number;
  minWidthPx?: number;
  testId?: string;
  className?: string;
};

export function CardGridSkeleton({ count = 8, minWidthPx = 180, testId, className }: GridProps) {
  return (
    <div
      data-testid={testId}
      role="status"
      aria-label="Loading cards"
      className={cn("grid gap-hmi-3", className)}
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${minWidthPx}px, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="space-y-hmi-2 rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-3"
        >
          <Skeleton className="aspect-video w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

type LinesProps = {
  lines?: number;
  testId?: string;
  className?: string;
};

export function LinesSkeleton({ lines = 6, testId, className }: LinesProps) {
  return (
    <div
      data-testid={testId}
      role="status"
      aria-label="Loading"
      className={cn(
        "space-y-hmi-2 rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-3",
        className,
      )}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", i % 3 === 0 ? "w-11/12" : i % 3 === 1 ? "w-9/12" : "w-7/12")}
        />
      ))}
    </div>
  );
}