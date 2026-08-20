import React from "react";

interface MenuSectionProps {
  label: string;
  tone?: "danger";
  children: React.ReactNode;
}

export function MenuSection({ label, tone, children }: MenuSectionProps): React.JSX.Element | null {
  return (
    <div
      role="group"
      aria-label={label}
      className="border-t border-ca-border py-1 first:border-t-0"
    >
      <div
        className={`px-3 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider ${
          tone === "danger" ? "text-ca-ng/80" : "text-ca-ink-muted"
        }`}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
  disabledHint?: string;
}

export function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
  disabled = false,
  shortcut,
  disabledHint,
}: MenuItemProps): React.JSX.Element | null {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      title={disabled ? disabledHint : undefined}
      aria-disabled={disabled || undefined}
      className={`group flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors ${
        disabled
          ? "cursor-not-allowed text-ca-ink-muted/60"
          : `hover:bg-ca-panel ${danger ? "text-ca-ng hover:brightness-125" : ""}`
      }`}
      onClick={onClick}
    >
      <span className={disabled ? "opacity-40" : "opacity-80"}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {shortcut ? (
        <span
          className={`ml-2 font-mono text-[10px] ${
            disabled ? "text-ca-ink-muted/40" : "text-ca-ink-muted"
          }`}
        >
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}
