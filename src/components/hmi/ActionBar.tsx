import type { ReactNode } from "react";

export interface ActionBarProps {
  left?: ReactNode;
  right?: ReactNode;
}

export function ActionBar({ left, right }: ActionBarProps) {
  return (
    <footer
      className="flex items-center justify-between px-hmi-4 bg-ca-chrome border-t border-ca-border"
      style={{ height: "calc(var(--spacing-hmi-bottombar) + 0.5rem)" }}
      aria-label="Action bar"
    >
      <div className="flex items-center gap-hmi-2">{left}</div>
      <div className="flex items-center gap-hmi-2">{right}</div>
    </footer>
  );
}