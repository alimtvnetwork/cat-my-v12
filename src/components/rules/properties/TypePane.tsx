// Plan 80 step 20. Type pane wired to typeToolFacade (persisted).
import { PaneShell, Row, Slider } from "./paneShell";
import {
  typeToolFacade,
  useTypeToolPrefs,
  TYPE_FAMILIES,
  type TypeWeight,
} from "@/lib/type-tool/facade";

export function TypePane(): React.JSX.Element | null {
  const { family, size, weight } = useTypeToolPrefs();

  return (
    <PaneShell>
      <Row label="Family">
        <select
          value={family}
          onChange={(e) => void typeToolFacade.set({ family: e.target.value })}
          aria-label="Font family"
          className="ca-focus-fluid rounded-sm border border-ca-border bg-ca-panel-2 px-1 py-0.5 text-[11px]"
        >
          {TYPE_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Size">
        <Slider
          label="Font size"
          value={size}
          min={8}
          max={96}
          step={1}
          onChange={(v) => void typeToolFacade.set({ size: v })}
        />
        <output className="w-8 text-right font-mono tabular-nums text-[11px]">{size}px</output>
      </Row>
      <Row label="Weight">
        <div role="radiogroup" aria-label="Font weight" className="flex gap-0.5">
          {(["400", "500", "600", "700"] as const).map((w) => (
            <button
              key={w}
              type="button"
              role="radio"
              aria-checked={weight === w}
              onClick={() => void typeToolFacade.set({ weight: w as TypeWeight })}
              className={[
                "ca-focus-fluid rounded-sm border px-1.5 py-0.5 text-[11px] font-mono tabular-nums transition",
                weight === w
                  ? "border-ca-select bg-ca-panel-2 text-ca-select"
                  : "border-ca-border bg-ca-panel-2/60 text-ca-ink-muted hover:text-ca-ink",
              ].join(" ")}
            >
              {w}
            </button>
          ))}
        </div>
      </Row>
    </PaneShell>
  );
}
