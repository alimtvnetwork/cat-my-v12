import { SkeletonBlock, SkeletonList } from "@/components/ui/skeleton-primitives";

export function RunSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <SkeletonList label="Loading run screen">
        <div className="flex flex-wrap items-center gap-hmi-3 p-hmi-3 bg-ca-panel border-b border-ca-border">
          <SkeletonBlock className="h-14 w-32" />
          <SkeletonBlock className="h-14 w-32" />
          <SkeletonBlock className="h-14 w-32" />
          <SkeletonBlock className="ml-auto h-10 w-40" />
        </div>
        <SkeletonBlock className="flex-1 min-h-64 rounded-none" />
        <SkeletonBlock className="h-40 rounded-none border-t border-ca-border" />
      </SkeletonList>
    </div>
  );
}