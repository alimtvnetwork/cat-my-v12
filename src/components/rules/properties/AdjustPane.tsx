// Plan 80 step 18. Adjust pane wired to canvasPrefsFacade (persisted).
import { PaneShell, Row, Slider } from "./paneShell";
import { canvasPrefsFacade, useCanvasPrefs } from "@/lib/canvas-prefs/facade";

export function AdjustPane(): React.JSX.Element | null {
  const { adjust } = useCanvasPrefs();
  const { brightness, contrast, gamma } = adjust;

  return (
    <PaneShell>
      <Row label="Brightness">
        <Slider
          label="Brightness"
          value={brightness}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => void canvasPrefsFacade.setAdjust({ brightness: v })}
        />
        <output className="w-8 text-right font-mono tabular-nums text-[11px]">{brightness}</output>
      </Row>
      <Row label="Contrast">
        <Slider
          label="Contrast"
          value={contrast}
          min={-100}
          max={100}
          step={1}
          onChange={(v) => void canvasPrefsFacade.setAdjust({ contrast: v })}
        />
        <output className="w-8 text-right font-mono tabular-nums text-[11px]">{contrast}</output>
      </Row>
      <Row label="Gamma">
        <Slider
          label="Gamma"
          value={gamma}
          min={0.2}
          max={3}
          step={0.05}
          onChange={(v) => void canvasPrefsFacade.setAdjust({ gamma: v })}
        />
        <output className="w-8 text-right font-mono tabular-nums text-[11px]">
          {gamma.toFixed(2)}
        </output>
      </Row>
      <button
        type="button"
        onClick={() => void canvasPrefsFacade.setAdjust({ brightness: 0, contrast: 0, gamma: 1 })}
        className="ca-focus-fluid self-start rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 text-[11px] hover:bg-ca-panel"
      >
        Reset
      </button>
    </PaneShell>
  );
}
