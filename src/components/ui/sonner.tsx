import { Toaster as Sonner } from "sonner";

// Plan 71 Step 14: sonner tokens per spec.
// Spec: spec/03-error-manage/02-error-architecture/03-notification-colors.md
// Every color/border comes from a `--toast-*` HSL triple defined in styles.css.
// No hardcoded colors here so light/dark themes flip in one place.

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Compact toast: tight padding, close button pinned to the top-right
// corner (overriding sonner defaults via absolute positioning), dense
// stacking for repeated errors. `relative` on the wrapper is required so
// the absolutely-positioned `[data-close-button]` lands inside the toast.
const base =
  "group toast motion-toast-in relative rounded-md border pl-2.5 pr-7 py-1.5 " +
  "text-[12px] leading-tight cursor-pointer min-h-0 shadow-[var(--toast-shadow)] " +
  "bg-[hsl(var(--toast-bg))] text-[hsl(var(--toast-fg))] border-[hsl(var(--toast-border))] " +
  "[&>[data-close-button]]:!left-auto [&>[data-close-button]]:!right-1 " +
  "[&>[data-close-button]]:!top-1 [&>[data-close-button]]:!translate-x-0 " +
  "[&>[data-close-button]]:!translate-y-0";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      offset={16}
      gap={6}
      visibleToasts={5}
      expand
      closeButton
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: base,
          title: "font-medium leading-tight text-xs",
          description:
            "mt-0.5 text-[11px] leading-snug text-[hsl(var(--toast-desc))] line-clamp-2 break-all",
          actionButton:
            "ml-auto inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium " +
            "bg-[hsl(var(--toast-fg)/0.12)] text-[hsl(var(--toast-fg))] hover:bg-[hsl(var(--toast-fg)/0.2)]",
          cancelButton:
            "inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] text-[hsl(var(--toast-desc))] hover:text-[hsl(var(--toast-fg))]",
          closeButton:
            "!absolute !right-1 !top-1 !left-auto !h-5 !w-5 !p-0 !rounded-sm " +
            "!border-0 !bg-transparent !text-[hsl(var(--toast-desc))] " +
            "hover:!text-[hsl(var(--toast-fg))] hover:!bg-[hsl(var(--toast-fg)/0.1)] " +
            "flex items-center justify-center",
          success:
            "bg-[hsl(var(--toast-success-bg))] text-[hsl(var(--toast-success-fg))] border-[hsl(var(--toast-success-border))]",
          error:
            "bg-[hsl(var(--toast-error-bg))] text-[hsl(var(--toast-error-fg))] border-[hsl(var(--toast-error-border))]",
          warning:
            "bg-[hsl(var(--toast-warning-bg))] text-[hsl(var(--toast-warning-fg))] border-[hsl(var(--toast-warning-border))]",
          info: "bg-[hsl(var(--toast-info-bg))] text-[hsl(var(--toast-info-fg))] border-[hsl(var(--toast-info-border))]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
