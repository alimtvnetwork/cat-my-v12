// Sample carousel for the Run / Result flow.
//
// Renders a compact strip: prev button, primary tile (large thumbnail
// with name + dimensions + orderIndex badge), next button, followed by
// a horizontally scrollable filmstrip of every sample. Selection is
// driven by `useSelectedSample`, so orderIndex/id is persisted per
// project and the choice survives reloads. Keyboard: Left / Right on
// the focused primary tile step through samples.
//
// The carousel is a presentational surface: it does not mutate
// samples, only the persisted selection anchor. Wired into
// `RunSection` (and `ResultSection` reads the selected sample name via
// props) so operators can see which frame the run + result apply to.

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ImageSample } from "@/lib/image-samples/model";
import type { UseSelectedSample } from "@/lib/image-samples/use-selected-sample";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

interface Props {
  samples: readonly ImageSample[];
  selection: UseSelectedSample;
}

export function SampleCarousel({ samples, selection }: Props): React.JSX.Element | null {
  const { selected, selectedIndex, count, next, prev, select } = selection;

  if (count === 0 || !selected) {
    return (
      <p
        className="rounded-md border border-dashed border-ca-border bg-ca-panel-2 p-hmi-3 text-hmi-caption text-ca-ink-muted"
        data-testid="run-carousel-empty"
      >
        Upload or capture a sample above to enable the Run / Result carousel.
      </p>
    );
  }

  const orderLabel =
    typeof selected.orderIndex === "number" ? selected.orderIndex + 1 : selectedIndex + 1;

  return (
    <div
      className="rounded-md border border-ca-border bg-ca-panel-2 p-hmi-2"
      data-testid="run-sample-carousel"
      data-selected-sample-id={selected.id}
      data-selected-order-index={selected.orderIndex ?? ""}
    >
      <div className="flex items-stretch gap-hmi-2">
        <button
          type="button"
          onClick={prev}
          aria-label="Previous sample"
          disabled={count <= 1}
          data-testid="run-carousel-prev"
          className="inline-flex h-auto w-8 items-center justify-center rounded-md border border-ca-border bg-ca-panel text-ca-ink transition hover:border-ca-select disabled:opacity-40"
        >
          <ChevronLeft aria-hidden size={16} />
        </button>
        <button
          type="button"
          onKeyDown={(e) => {
            if (KeyboardKeyType.isArrowLeft(e.key)) {
              e.preventDefault();
              prev();
            } else if (KeyboardKeyType.isArrowRight(e.key)) {
              e.preventDefault();
              next();
            }
          }}
          className="group flex min-w-0 flex-1 items-center gap-hmi-3 rounded-md border border-ca-border bg-ca-panel px-hmi-2 py-hmi-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ca-select"
          data-testid="run-carousel-primary"
          aria-label={`Selected sample: ${selected.name}. Use left and right arrows to step.`}
        >
          <img
            src={selected.dataUrl}
            alt={selected.name}
            className="h-14 w-14 flex-none rounded-sm border border-ca-border object-contain bg-ca-panel"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <p
              className="truncate font-display text-hmi-body font-semibold text-ca-ink"
              title={selected.name}
            >
              {selected.name}
            </p>
            <p className="truncate font-mono text-[11px] tabular-nums text-ca-ink-muted">
              {selected.width}×{selected.height} · {(selected.byteSize / 1024).toFixed(1)} KB
            </p>
          </div>
          <span
            className="inline-flex min-w-[3.25rem] justify-center rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 font-mono text-[11px] tabular-nums text-ca-ink"
            aria-label={`Sample ${orderLabel} of ${count}`}
          >
            {orderLabel}/{count}
          </span>
        </button>
        <button
          type="button"
          onClick={next}
          aria-label="Next sample"
          disabled={count <= 1}
          data-testid="run-carousel-next"
          className="inline-flex h-auto w-8 items-center justify-center rounded-md border border-ca-border bg-ca-panel text-ca-ink transition hover:border-ca-select disabled:opacity-40"
        >
          <ChevronRight aria-hidden size={16} />
        </button>
      </div>
      {count > 1 ? (
        <div
          className="mt-hmi-2 flex gap-hmi-1 overflow-x-auto pb-1"
          data-testid="run-carousel-strip"
          role="listbox"
          aria-label="All samples"
        >
          {samples.map((s, i) => {
            const isActive = s.id === selected.id;
            const badge = typeof s.orderIndex === "number" ? s.orderIndex + 1 : i + 1;

            return (
              <div key={s.id} className="flex-none" role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  aria-label={`Select sample ${badge}: ${s.name}`}
                  onClick={() => select(s.id)}
                  data-testid="run-carousel-thumb"
                  data-active={isActive || undefined}
                  className={
                    "relative block h-10 w-10 overflow-hidden rounded-sm border transition " +
                    (isActive
                      ? "border-ca-select ring-1 ring-ca-select"
                      : "border-ca-border hover:border-ca-select")
                  }
                >
                  <img
                    src={s.dataUrl}
                    alt=""
                    className="h-full w-full object-contain bg-ca-panel"
                    loading="lazy"
                  />
                  <span
                    aria-hidden
                    className="absolute bottom-0 right-0 inline-flex min-w-[1rem] justify-center rounded-tl-sm bg-ca-panel/85 px-1 font-mono text-[9px] leading-3 tabular-nums text-ca-ink"
                  >
                    {badge}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
