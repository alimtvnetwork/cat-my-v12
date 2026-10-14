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
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-ca-primary/50 bg-gradient-to-r from-ca-primary to-ca-primary/90 px-5 py-2 text-hmi-body font-bold text-ca-on-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_4px_16px_-2px_color-mix(in_oklab,var(--ca-primary)_40%,transparent)] transition-all hmi-focus-ring active:scale-[0.99]";
  const state = isDisabled ? "cursor-not-allowed opacity-50" : "hover:brightness-110";
  const composed = [base, state, className].filter(Boolean).join(" ");

  return (
    <button ref={ref} type="button" disabled={isDisabled} className={composed} {...rest}>
      {icon && <span aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </button>
  );
});
