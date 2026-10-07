import { useState } from "react";
import { Camera, Sun, Zap, Sliders } from "lucide-react";
import type { EditorRule, RuleCameraSettings, RuleLightSettings } from "@/lib/editor/types";
import { Slider } from "@/components/ui/slider";

export interface OpticalSettingsPanelProps {
  rule: EditorRule;
  onUpdateOptical?: (
    id: string,
    optical: {
      cameraSettings?: RuleCameraSettings;
      lightSettings?: RuleLightSettings;
    },
  ) => void;
}

const DEFAULT_CAMERA: RuleCameraSettings = {
  exposureUs: 20000,
  gainDb: 0.0,
  whiteBalanceKelvin: 5000,
  gamma: 1.0,
};

const DEFAULT_LIGHT: RuleLightSettings = {
  channel: 1,
  intensity: 100,
  hasStrobe: false,
  strobeDurationUs: 500,
};

function formatExposure(us: number): string {
  if (us >= 1000) {
    return `${(us / 1000).toFixed(1)} ms`;
  }

  return `${us} µs`;
}

function ExposureSlider({
  exposureUs,
  isLocked,
  onChange,
}: {
  exposureUs: number;
  isLocked: boolean;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-hmi-caption">
        <span className="text-ca-ink-muted">Exposure Time</span>
        <span className="font-mono text-[11px] tabular-nums text-ca-ink">
          {formatExposure(exposureUs)}
        </span>
      </div>
      <Slider
        min={100}
        max={50000}
        step={100}
        disabled={isLocked}
        value={[exposureUs]}
        onValueChange={([val]) => onChange(val)}
        className="w-full"
      />
    </div>
  );
}

function GainSlider({
  gainDb,
  isLocked,
  onChange,
}: {
  gainDb: number;
  isLocked: boolean;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-hmi-caption">
        <span className="text-ca-ink-muted">Analog Gain</span>
        <span className="font-mono text-[11px] tabular-nums text-ca-ink">
          {gainDb.toFixed(1)} dB
        </span>
      </div>
      <Slider
        min={0}
        max={24}
        step={0.5}
        disabled={isLocked}
        value={[gainDb]}
        onValueChange={([val]) => onChange(val)}
        className="w-full"
      />
    </div>
  );
}

function LightIntensitySlider({
  intensity,
  isLocked,
  onChange,
}: {
  intensity: number;
  isLocked: boolean;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-hmi-caption">
        <span className="text-ca-ink-muted">Light Intensity</span>
        <span className="font-mono text-[11px] tabular-nums text-ca-ink">
          {Math.round(intensity)}%
        </span>
      </div>
      <Slider
        min={0}
        max={100}
        step={1}
        disabled={isLocked}
        value={[intensity]}
        onValueChange={([val]) => onChange(val)}
        className="w-full"
      />
    </div>
  );
}

function LightChannelPicker({
  channel,
  isLocked,
  onChange,
}: {
  channel: number;
  isLocked: boolean;
  onChange: (ch: number) => void;
}) {
  const CHANNELS = [1, 2, 3, 4] as const;

  return (
    <div className="flex items-center justify-between text-hmi-caption">
      <span className="text-ca-ink-muted">Light Channel</span>
      <div className="flex gap-1">
        {CHANNELS.map((ch) => (
          <button
            key={ch}
            type="button"
            disabled={isLocked}
            onClick={() => onChange(ch)}
            className={`h-6 w-6 rounded border text-[11px] font-semibold transition ${
              channel === ch
                ? "border-ca-select bg-ca-select text-ca-bg"
                : "border-ca-border bg-ca-panel-2 text-ca-ink hover:border-ca-select/60"
            }`}
          >
            {ch}
          </button>
        ))}
      </div>
    </div>
  );
}

function StrobeControl({
  hasStrobe,
  strobeDurationUs,
  isLocked,
  onToggleStrobe,
  onChangeDuration,
}: {
  hasStrobe: boolean;
  strobeDurationUs: number;
  isLocked: boolean;
  onToggleStrobe: (checked: boolean) => void;
  onChangeDuration: (val: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-ca-border/60 bg-ca-panel-2/50 p-2">
      <label className="flex cursor-pointer items-center justify-between text-hmi-caption text-ca-ink">
        <span className="flex items-center gap-1.5 font-medium">
          <Zap size={13} className={hasStrobe ? "text-amber-400" : "text-ca-ink-muted"} />
          Strobe Flash Mode
        </span>
        <input
          type="checkbox"
          checked={hasStrobe}
          disabled={isLocked}
          onChange={(e) => onToggleStrobe(e.target.checked)}
          className="accent-ca-select"
        />
      </label>
      {hasStrobe ? (
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex items-center justify-between text-hmi-caption">
            <span className="text-ca-ink-muted text-[11px]">Pulse Duration</span>
            <span className="font-mono text-[11px] tabular-nums text-ca-ink">
              {strobeDurationUs} µs
            </span>
          </div>
          <Slider
            min={10}
            max={5000}
            step={10}
            disabled={isLocked}
            value={[strobeDurationUs]}
            onValueChange={([val]) => onChangeDuration(val)}
            className="w-full"
          />
        </div>
      ) : null}
    </div>
  );
}

export function OpticalSettingsPanel({
  rule,
  onUpdateOptical,
}: OpticalSettingsPanelProps): React.JSX.Element | null {
  const isLocked = Boolean(rule.isLocked);
  const camera = rule.cameraSettings ?? DEFAULT_CAMERA;
  const light = rule.lightSettings ?? DEFAULT_LIGHT;
  const [isOpen, setIsOpen] = useState(true);

  const patchCamera = (patch: Partial<RuleCameraSettings>) => {
    if (isLocked) {
      return;
    }
    const nextCam: RuleCameraSettings = { ...camera, ...patch };
    onUpdateOptical?.(rule.id, { cameraSettings: nextCam, lightSettings: light });
  };

  const patchLight = (patch: Partial<RuleLightSettings>) => {
    if (isLocked) {
      return;
    }
    const nextLight: RuleLightSettings = { ...light, ...patch };
    onUpdateOptical?.(rule.id, { cameraSettings: camera, lightSettings: nextLight });
  };

  return (
    <section
      aria-label="Camera & Light Settings"
      className="flex flex-col gap-3"
      data-testid="optical-settings-panel"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 text-hmi-caption font-semibold uppercase tracking-wider text-ca-ink hover:text-ca-select"
        >
          <Sliders size={13} className="text-ca-select" />
          Camera & Illumination
        </button>
        <span className="font-mono text-[10px] tabular-nums text-ca-ink-muted">
          {formatExposure(camera.exposureUs)} · {camera.gainDb}dB · Ch{light.channel ?? 1}
        </span>
      </div>

      {isOpen ? (
        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col gap-2 rounded-md border border-ca-border/60 bg-ca-panel-2/30 p-2.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ca-ink-muted">
              <Camera size={12} />
              Sensor Acquisition
            </span>
            <ExposureSlider
              exposureUs={camera.exposureUs}
              isLocked={isLocked}
              onChange={(val) => patchCamera({ exposureUs: val })}
            />
            <GainSlider
              gainDb={camera.gainDb}
              isLocked={isLocked}
              onChange={(val) => patchCamera({ gainDb: val })}
            />
          </div>

          <div className="flex flex-col gap-2.5 rounded-md border border-ca-border/60 bg-ca-panel-2/30 p-2.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ca-ink-muted">
              <Sun size={12} />
              Lighting Profile
            </span>
            <LightChannelPicker
              channel={light.channel ?? 1}
              isLocked={isLocked}
              onChange={(ch) => patchLight({ channel: ch })}
            />
            <LightIntensitySlider
              intensity={light.intensity}
              isLocked={isLocked}
              onChange={(val) => patchLight({ intensity: val })}
            />
            <StrobeControl
              hasStrobe={Boolean(light.hasStrobe)}
              strobeDurationUs={light.strobeDurationUs ?? 500}
              isLocked={isLocked}
              onToggleStrobe={(checked) => patchLight({ hasStrobe: checked })}
              onChangeDuration={(val) => patchLight({ strobeDurationUs: val })}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
