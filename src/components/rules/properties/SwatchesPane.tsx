// Plan 80 step 16. Swatches ("Brush") pane extracted from PropertiesPalette.tsx.
// Plan 86 step 33: read via `useSeededSwatches()` so an active v2 seed
// profile with seeded swatch rows drives the strip; legacy fallback intact.
import { useState } from "react";
import { swatchesFacade } from "@/lib/swatches/facade";
import { useSeededSwatches } from "@/lib/swatches/useSeededSwatches";

export function SwatchesPane(): React.JSX.Element | null {
  const swatches = useSeededSwatches();
  const [draft, setDraft] = useState("#");
  const submit = () => {
    void swatchesFacade.add(draft).then((ok) => {
      if (ok) setDraft("#");
    });
  };

  return (
    <div data-testid="palette-swatches-body" className="flex min-h-0 flex-1 flex-col gap-hmi-2">
      <div role="listbox" aria-label="Saved swatches" className="grid grid-cols-6 gap-1">
        {swatches.map((hex) => (
          <button
            key={hex}
            type="button"
            role="option"
            aria-selected={false}
            aria-label={`Swatch ${hex}`}
            onContextMenu={(ev) => {
              ev.preventDefault();
              void swatchesFacade.remove(hex);
            }}
            title={`${hex} (right-click to remove)`}
            className="h-5 w-5 rounded-sm border border-ca-border shadow-inner transition hover:scale-110"
            style={{ backgroundColor: hex }}
          />
        ))}
      </div>
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          submit();
        }}
        className="flex items-center gap-1"
      >
        <input
          type="text"
          value={draft}
          onChange={(ev) => setDraft(ev.target.value)}
          maxLength={7}
          placeholder="#3b82f6"
          aria-label="New swatch hex"
          className="min-w-0 flex-1 rounded-sm border border-ca-border bg-ca-panel-2 px-1 py-0.5 font-mono text-[11px] text-ca-ink placeholder:text-ca-ink-muted/60 focus:outline-none focus:ring-1 focus:ring-ca-select"
        />
        <button
          type="submit"
          className="rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 text-[11px] font-medium text-ca-ink hover:bg-ca-panel"
        >
          Add
        </button>
      </form>
      <button
        type="button"
        onClick={() => void swatchesFacade.reset()}
        className="self-start text-[11px] text-ca-ink-muted underline-offset-2 hover:underline"
      >
        Reset defaults
      </button>
    </div>
  );
}
