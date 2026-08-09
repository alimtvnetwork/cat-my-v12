import { forwardRef, type ReactNode } from "react";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export interface SettingsDialogProps {
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
}

/**
 * SettingsDialog: shared modal shell for Camera / Trigger / Lighting settings.
 * Renders a locked HMI panel chrome (header, scrollable body, footer action bar).
 * Escape / close is delegated to the caller via onClose (typically router.history.back()).
 */
export const SettingsDialog = forwardRef<HTMLDivElement, SettingsDialogProps>(
  function SettingsDialog({ title, description, children, footer, onClose }, ref) {
    return (
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (KeyboardKeyType.isEscape(e.key) && onClose) {
            e.stopPropagation();
            onClose();
          }
        }}
        className="flex h-full w-full flex-col rounded-lg border border-ca-border bg-ca-panel font-hmi text-hmi-body text-ca-ink overflow-hidden"
      >
        <header className="px-hmi-4 py-hmi-3 border-b border-ca-border">
          <h2 className="text-hmi-h2 font-semibold text-ca-ink">{title}</h2>
          {description ? (
            <p className="mt-1 text-hmi-body-sm text-ca-ink-muted">{description}</p>
          ) : null}
        </header>
        <div className="flex-1 overflow-y-auto p-hmi-4 space-y-hmi-4">{children}</div>
        {footer ? (
          <footer className="px-hmi-4 py-hmi-3 border-t border-ca-border flex items-center justify-end gap-hmi-3">
            {footer}
          </footer>
        ) : null}
      </div>
    );
  },
);
