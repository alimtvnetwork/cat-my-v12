// Plan 80 step 17. Grid pane wired to canvasPrefsFacade (persisted).
import { PaneShell, Row } from "./paneShell";
import { canvasPrefsFacade, useCanvasPrefs, type GridSpacing } from "@/lib/canvas-prefs/facade";

export function GridPane(): React.JSX.Element | null {
  const { grid } = useCanvasPrefs();
  const { show, snap, spacing } = grid;

  return (
    <PaneShell>
      <Row label="Show grid">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => void canvasPrefsFacade.setGrid({ show: e.target.checked })}
          aria-label="Show grid"
          className="ca-focus-fluid h-3 w-3 accent-ca-primary"
        />
      </Row>
      <Row label="Snap">
        <input
          type="checkbox"
          checked={snap}
          onChange={(e) => void canvasPrefsFacade.setGrid({ snap: e.target.checked })}
          aria-label="Snap to grid"
          className="ca-focus-fluid h-3 w-3 accent-ca-primary"
        />
      </Row>
      <Row label="Spacing">
        <div role="radiogroup" aria-label="Grid spacing" className="flex gap-0.5">
          {[8, 16, 32, 64].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={spacing === n}
              onClick={() => void canvasPrefsFacade.setGrid({ spacing: n as GridSpacing })}
              className={[
                "ca-focus-fluid rounded-sm border px-1.5 py-0.5 text-[11px] font-mono tabular-nums transition",
                spacing === n
                  ? "border-ca-select bg-ca-panel-2 text-ca-select"
                  : "border-ca-border bg-ca-panel-2/60 text-ca-ink-muted hover:text-ca-ink",
              ].join(" ")}
            >
              {n}
            </button>
          ))}
        </div>
      </Row>
    </PaneShell>
  );
}
