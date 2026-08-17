// Plan 80 step 20. Paragraph pane wired to typeToolFacade (persisted).
import { PaneShell, Row, Slider } from "./paneShell";
import { typeToolFacade, useTypeToolPrefs, type TypeAlign } from "@/lib/type-tool/facade";

export function ParagraphPane(): React.JSX.Element | null {
  const { align, lineHeight } = useTypeToolPrefs();

  return (
    <PaneShell>
      <Row label="Align">
        <div role="radiogroup" aria-label="Text alignment" className="flex gap-0.5">
          {(["left", "center", "right", "justify"] as const).map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={align === a}
              onClick={() => void typeToolFacade.set({ align: a as TypeAlign })}
              className={[
                "ca-focus-fluid rounded-sm border px-1.5 py-0.5 text-[11px] capitalize transition",
                align === a
                  ? "border-ca-select bg-ca-panel-2 text-ca-select"
                  : "border-ca-border bg-ca-panel-2/60 text-ca-ink-muted hover:text-ca-ink",
              ].join(" ")}
            >
              {a}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Line height">
        <Slider
          label="Line height"
          value={lineHeight}
          min={1}
          max={2.5}
          step={0.05}
          onChange={(v) => void typeToolFacade.set({ lineHeight: v })}
        />
        <output className="w-8 text-right font-mono tabular-nums text-[11px]">
          {lineHeight.toFixed(2)}
        </output>
      </Row>
    </PaneShell>
  );
}
