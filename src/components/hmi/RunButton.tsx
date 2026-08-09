import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export interface RunButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  isRunning?: boolean;
}

export const RunButton = forwardRef<HTMLButtonElement, RunButtonProps>(function RunButton(
  { children, icon, isRunning = false, className, disabled, ...rest },
  ref,
) {
  const isDisabled = Boolean(disabled || isRunning);
  const base =
    "inline-flex min-h-10 items-center justify-center gap-hmi-2 rounded-md border border-ca-primary bg-ca-primary px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg shadow-hmi-panel transition-colors hmi-focus-ring";
  const state = isDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-ca-select";
  const composed = [base, state, className].filter(Boolean).join(" ");

  return (
    <button ref={ref} type="button" disabled={isDisabled} className={composed} {...rest}>
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </button>
  );
});
