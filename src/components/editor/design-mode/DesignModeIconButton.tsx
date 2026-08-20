import React from "react";

export interface IconButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}

export function IconButton({ children, onClick, disabled, label }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-ca-border text-ca-ink-muted transition hover:border-ca-ink-muted hover:text-ca-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
    >
      {children}
    </button>
  );
}
