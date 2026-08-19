// Plan 42 step 21: Params panel for the `Presence` condition (spec 47 s4.2).
// Fields: Mode (Present | Absent) via ToggleGroup, Threshold (0..1) via Slider,
// MinBlobPx (>=0 integer) via Input. Emits a fully-typed PresenceCondition on
// every change so the parent can persist without re-validating shape.
import {
  ALL_PRESENCE_MODES,
  PRESENCE_MODE_LABEL,
  PresenceModeType,
} from "@/types/rules/PresenceModeType";
import type { PresenceCondition } from "@/lib/editor/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { logger } from "@/lib/editor/errors";

export interface PresenceParamsPanelProps {
  condition: PresenceCondition;
  onChange: (next: PresenceCondition) => void;
}

export function PresenceParamsPanel({ condition, onChange }: PresenceParamsPanelProps): React.JSX.Element | null {
  const { params } = condition;

  function patch(next: Partial<PresenceCondition["params"]>) {
    onChange({ ...condition, params: { ...params, ...next } });
  }

  function handleMode(value: string) {
    // Radix ToggleGroup can emit "" on deselect; reject to preserve invariant.
    if (value === "") {
      logger.warn("W_UI_PRESENCE_MODE_DESELECT_REFUSED", {
        conditionId: condition.id,
      });

      return;
    }

    patch({ Mode: value as PresenceModeType });
  }

  function handleThreshold(values: number[]) {
    const v = values[0];

    if (typeof v !== "number" || Number.isFinite(v) === false) return;
    patch({ Threshold: Math.max(0, Math.min(1, v)) });
  }

  function handleMinBlob(e: React.ChangeEvent<HTMLInputElement>) {
    const parsed = Number.parseInt(e.target.value, 10);
    const v = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    patch({ MinBlobPx: v });
  }

  const modeId = `pres-mode-${condition.id}`;
  const thrId = `pres-thr-${condition.id}`;
  const blobId = `pres-blob-${condition.id}`;

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex flex-col gap-1">
        <Label htmlFor={modeId} className="text-xs">
          Mode
        </Label>
        <ToggleGroup
          id={modeId}
          type="single"
          size="sm"
          value={params.Mode}
          onValueChange={handleMode}
          className="justify-start"
        >
          {ALL_PRESENCE_MODES.map((m) => (
            <ToggleGroupItem key={m} value={m} aria-label={PRESENCE_MODE_LABEL[m]}>
              {PRESENCE_MODE_LABEL[m]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Label htmlFor={thrId} className="text-xs">
            Threshold
          </Label>
          <span className="tabular-nums text-xs text-muted-foreground">
            {params.Threshold.toFixed(2)}
          </span>
        </div>
        <Slider
          id={thrId}
          min={0}
          max={1}
          step={0.01}
          value={[params.Threshold]}
          onValueChange={handleThreshold}
          aria-label="Presence threshold"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={blobId} className="text-xs">
          Min blob (px)
        </Label>
        <Input
          id={blobId}
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={params.MinBlobPx}
          onChange={handleMinBlob}
          className="h-8"
        />
      </div>
    </div>
  );
}
