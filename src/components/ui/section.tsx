
export enum SectionPropsHeadingLevelType {
  H1 = "h1",
  H2 = "h2",
  H3 = "h3",
  H4 = "h4",
}
// Plan 87 step 3: shared Section primitive.
//
// Root cause this component fixes, in one sentence:
//   Every sidebar/panel card was re-inlining
//   `rounded-lg border border-ca-border bg-ca-panel p-hmi-5` plus its own
//   header row, so padding, gap, and header rhythm drifted between panels
//   (issues 12, 27, 34) and Plan 87 step 24's density toggle would have to
//   sweep every callsite instead of touching one primitive.
//
// Contract:
//   - Renders a semantic <section>, optionally with a header (title, aside).
//   - Padding, gap, radius, border come from --space-* / --ca-border tokens.
//   - `density="compact"` maps to smaller padding for dense contexts (Layers,
//     Properties). Default matches the previous p-hmi-5 look so existing
//     panels do not shift visually until Step 24 flips --space-scale.
//   - `variant="plain"` drops the border+bg for cards that only need the
//     header rhythm inside an already-styled parent.

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export enum SectionDensityType {
  Comfortable = "comfortable",
  Compact = "compact",
}
export type SectionDensity = SectionDensityType;
export enum SectionVariantType {
  Panel = "panel",
  Plain = "plain",
}
export type SectionVariant = SectionVariantType;

export interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** Visible heading text. Rendered as <h2> unless `headingLevel` overrides. */
  title?: ReactNode;
  /** id for the heading so aria-labelledby works from parents. */
  titleId?: string;
  /** Right-hand slot in the header row (counts, actions, filters). */
  headerAside?: ReactNode;
  /** Optional description under the title. */
  description?: ReactNode;
  /** Padding density. */
  density?: SectionDensity;
  /** Chrome variant. */
  variant?: SectionVariant;
  /** Heading level tag; defaults to h2. */
  headingLevel?: SectionPropsHeadingLevelType;
  /** Applied to the inner content wrapper (after the header). */
  bodyClassName?: string;
}

const PADDING: Record<SectionDensityType, string> = {
  [SectionDensityType.Comfortable]: "p-hmi-5",
  [SectionDensityType.Compact]: "p-hmi-3",
};

const GAP: Record<SectionDensityType, string> = {
  [SectionDensityType.Comfortable]: "gap-hmi-4",
  [SectionDensityType.Compact]: "gap-hmi-2",
};

export const Section = forwardRef<HTMLElement, SectionProps>(function Section(
  {
    title,
    titleId,
    headerAside,
    description,
    density = SectionDensityType.Comfortable,
    variant = SectionVariantType.Panel,
    headingLevel = "h2",
    className,
    bodyClassName,
    children,
    ...rest
  },
  ref,
) {
  const HeadingTag = headingLevel;
  const showHeader = Boolean(title || headerAside || description);
  const chrome = variant === "panel" ? "rounded-lg border border-ca-border bg-ca-panel" : "";

  return (
    <section
      ref={ref}
      aria-labelledby={titleId}
      className={cn("flex flex-col", chrome, PADDING[density], GAP[density], className)}
      {...rest}
    >
      {showHeader ? (
        <header className="flex items-baseline justify-between gap-hmi-3">
          {title ? (
            <div className="flex min-w-0 flex-col gap-hmi-1">
              <HeadingTag
                id={titleId}
                className="truncate text-hmi-header font-semibold tracking-tight"
              >
                {title}
              </HeadingTag>
              {description ? (
                <p className="text-hmi-caption text-ca-ink-muted">{description}</p>
              ) : null}
            </div>
          ) : (
            <span />
          )}
          {headerAside ? (
            <div className="shrink-0 text-hmi-caption text-ca-ink-muted">{headerAside}</div>
          ) : null}
        </header>
      ) : null}
      <div className={cn("flex flex-col", GAP[density], bodyClassName)}>{children}</div>
    </section>
  );
});
