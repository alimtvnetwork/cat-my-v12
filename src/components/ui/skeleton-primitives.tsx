// Plan 87 step 16: shared skeleton primitives.
//
// Root cause addressed: loading placeholders across the app were ad-hoc
// `animate-pulse rounded-md bg-ca-panel-2` divs (see `projects.index.tsx`,
// `RunSkeleton.tsx`, and others). Sizes, radii, and animation timing drifted
// per feature, and the shadcn default `Skeleton` used `bg-primary/10`, which
// clashed with the ca-token surfaces the rest of the app renders on.
//
// These primitives share one class (`.ca-skeleton`) so a single CSS rule
// controls color, pulse duration, and prefers-reduced-motion behavior for
// every loading state in the shell.

import { cn } from "@/lib/utils";
import type { CSSProperties, HTMLAttributes } from "react";

type BaseProps = HTMLAttributes<HTMLDivElement>;

/**
 * SkeletonLine: single text-like bar. Height defaults to the hmi body line
 * height; width is a percentage so it flows inside cards without extra
 * measurement. Use for titles, meta rows, and single-line placeholders.
 */
export function SkeletonLine({
  width = "60%",
  height,
  className,
  style,
  ...rest
}: BaseProps & { width?: string | number; height?: string | number }): React.JSX.Element | null {
  const merged: CSSProperties = {
    width,
    height: height ?? "var(--text-hmi-body-size, 0.875rem)",
    ...style,
  };

  return (
    <div aria-hidden className={cn("ca-skeleton rounded-sm", className)} style={merged} {...rest} />
  );
}

/**
 * SkeletonBlock: rectangular placeholder for cards, thumbnails, or viewport
 * regions. Consumers control size via className (`h-40 w-full` etc.).
 */
export function SkeletonBlock({ className, ...rest }: BaseProps): React.JSX.Element | null {
  return <div aria-hidden className={cn("ca-skeleton rounded-md", className)} {...rest} />;
}

/**
 * SkeletonCircle: avatar / status dot placeholder. `size` in px.
 */
export function SkeletonCircle({
  size = 24,
  className,
  style,
  ...rest
}: BaseProps & { size?: number }): React.JSX.Element | null {
  return (
    <div
      aria-hidden
      className={cn("ca-skeleton rounded-full", className)}
      style={{ width: size, height: size, ...style }}
      {...rest}
    />
  );
}

/**
 * SkeletonList: wraps a set of skeletons in a `role="status"` region so
 * screen readers announce the loading state exactly once. Pair with an
 * accessible label describing what is loading.
 */
export function SkeletonList({
  label,
  children,
  className,
  ...rest
}: BaseProps & { label: string }): React.JSX.Element | null {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={cn("contents", className)}
      {...rest}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
