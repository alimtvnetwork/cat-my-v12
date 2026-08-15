import React from "react";

export function PlaceholderTabs({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center text-ca-ink-muted">
      <h3 className="font-semibold text-lg text-ca-ink mb-2">{name}</h3>
      <p className="text-sm">To Be Determined. Please clarify the contents of this tab.</p>
    </div>
  );
}
