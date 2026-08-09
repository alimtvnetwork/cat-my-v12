// Plan 42 step 22: Params panel for the `Color` condition (spec 47 s4.3 + 48).
// Fields: Mode (Current | Dense2 | Dense3 | Picked), ExpectedColor (#RRGGBB),
// DeltaE (>=0, JND ~2.3). When Mode is `Picked` the eyedropper button is
// exposed; other modes derive ExpectedColor at runtime, so the swatch is
// read-only for them per spec 48.
import { Pipette } from "lucide-react";
import { ALL_COLOR_MODES, COLOR_MODE_LABEL, ColorMode } from "@/types/rules/ColorMode";
import type { ColorCondition } from "@/lib/editor/schema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/editor/errors";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export interface ColorParamsPanelProps {
  condition: ColorCondition;
  onChange: (next: ColorCondition) => void;
  /**
   * Eyedropper hook. When absent (no active image), Pick is disabled.
   * Returns `#RRGGBB` or null if the user cancelled.
   */
  onPickColor?: () => Promise<string | null>;
}

export function ColorParamsPanel({ condition, onChange, onPickColor }: ColorParamsPanelProps) {
  const { params } = condition;
  const isPicked = params.Mode === ColorMode.Picked;
  const hexValid = HEX_RE.test(params.ExpectedColor);

  function patch(next: Partial<ColorCondition["params"]>) {
    onChange({ ...condition, params: { ...params, ...next } });
  }

  function handleMode(value: string) {
    if (!value) return;
    patch({ Mode: value as ColorMode });
  }

  function handleHex(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.trim();
    // Normalise: allow user to type without `#`. Persist raw so invalid input
    // stays visible; downstream isRuleCondition guards persistence.
    const next = raw.startsWith("#") || raw === "" ? raw : `#${raw}`;
    patch({ ExpectedColor: next });
  }

  function handleDelta(values: number[]) {
    const v = values[0];

    if (typeof v !== "number" || Number.isFinite(v) === false || v < 0) return;
    patch({ DeltaE: v });
  }

  async function handlePick() {
    if (!onPickColor) {
      logger.warn("W_UI_COLOR_PICK_UNAVAILABLE", { conditionId: condition.id });

      return;
    }

    const picked = await onPickColor();

    if (!picked) return;

    if (HEX_RE.test(picked) === false) {
      logger.warn("W_UI_COLOR_PICK_INVALID", {
        conditionId: condition.id,
        picked,
      });

      return;
    }

    patch({ ExpectedColor: picked });
    logger.info("I_UI_COLOR_PICKED", { conditionId: condition.id, picked });
  }

  const modeId = `col-mode-${condition.id}`;
  const hexId = `col-hex-${condition.id}`;
  const deltaId = `col-delta-${condition.id}`;

  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex flex-col gap-1">
        <Label htmlFor={modeId} className="text-xs">
          Mode
        </Label>
        <Select value={params.Mode} onValueChange={handleMode}>
          <SelectTrigger id={modeId} className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_COLOR_MODES.map((m) => (
              <SelectItem key={m} value={m}>
                {COLOR_MODE_LABEL[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor={hexId} className="text-xs">
          Expected color
        </Label>
        <div className="flex items-center gap-2">
          <span
            aria-label="Color swatch"
            className="inline-block h-8 w-8 shrink-0 rounded-md border"
            style={{ backgroundColor: hexValid ? params.ExpectedColor : "transparent" }}
          />
          <Input
            id={hexId}
            value={params.ExpectedColor}
            onChange={handleHex}
            placeholder="#RRGGBB"
            spellCheck={false}
            readOnly={!isPicked}
            aria-invalid={!hexValid}
            className="h-8 font-mono text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePick}
            disabled={!isPicked || !onPickColor}
            title={
              !isPicked
                ? "Eyedropper is only available in Picked mode"
                : !onPickColor
                  ? "No active image to pick from"
                  : "Pick a color from the current image"
            }
          >
            <Pipette className="mr-1 h-3.5 w-3.5" />
            Pick
          </Button>
        </div>
        {!hexValid && (
          <p role="alert" className="text-[11px] text-destructive">
            Enter a 6-digit hex color like #A0B0C0.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Label htmlFor={deltaId} className="text-xs">
            ΔE tolerance
          </Label>
          <span className="tabular-nums text-xs text-muted-foreground">
            {params.DeltaE.toFixed(1)}
          </span>
        </div>
        <Slider
          id={deltaId}
          min={0}
          max={25}
          step={0.1}
          value={[params.DeltaE]}
          onValueChange={handleDelta}
          aria-label="Delta E tolerance"
        />
        <p className="text-[11px] text-muted-foreground">
          JND ~2.3. Lower values are stricter; runner uses CIEDE2000.
        </p>
      </div>
    </div>
  );
}
