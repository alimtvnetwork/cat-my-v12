import React from "react";
import { Eye } from "lucide-react";

export interface DisplaySettingsData {
  showDetectedPosition?: boolean;
  lineThickness?: number;
  okColor?: string;
  ngColor?: string;
  showOutOfJudgment?: boolean;
}

export interface DisplaySettingsTabProps {
  settings?: DisplaySettingsData;
  onChange?: (settings: DisplaySettingsData) => void;
  onCancel?: () => void;
  onOk?: () => void;
}

const defaultDisplaySettings: DisplaySettingsData = {
  showDetectedPosition: true,
  lineThickness: 2,
  okColor: "#10B981",
  ngColor: "#EF4444",
  showOutOfJudgment: false,
};

export function DisplaySettingsTab({
  settings = defaultDisplaySettings,
  onChange,
  onCancel,
  onOk,
}: DisplaySettingsTabProps): React.JSX.Element {
  const [internalSettings, setInternalSettings] = React.useState<DisplaySettingsData>(settings);
  const activeSettings = settings || internalSettings;

  const updateField = (field: keyof DisplaySettingsData, value: any) => {
    const next = { ...activeSettings, [field]: value };
    setInternalSettings(next);
    onChange?.(next);
  };

  return (
    <div className="flex flex-col h-full text-ca-ink font-sans">
      <div className="flex flex-col flex-1 overflow-y-auto p-3 gap-3">
        <div className="flex items-center justify-between bg-ca-panel-2 px-3 py-1.5 rounded border border-ca-border">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-ca-ink-muted" />
            <h3 className="font-semibold text-xs uppercase tracking-wider text-ca-ink">
              Display Settings
            </h3>
          </div>
        </div>

        <div className="flex flex-col border border-ca-border rounded p-3 bg-ca-panel gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={activeSettings.showDetectedPosition ?? true}
              onChange={(e) => updateField("showDetectedPosition", e.target.checked)}
              className="rounded bg-ca-bg border-ca-border accent-ca-select"
            />
            <span className="font-medium text-ca-ink">Show Detected Position</span>
          </label>

          <div className="flex items-center justify-between">
            <span className="text-ca-ink-muted">Line Thickness</span>
            <select
              value={activeSettings.lineThickness ?? 2}
              onChange={(e) => updateField("lineThickness", Number(e.target.value))}
              className="bg-ca-bg border border-ca-border rounded px-2 py-1 text-xs text-ca-ink"
            >
              <option value={1}>1 px (Thin)</option>
              <option value={2}>2 px (Standard)</option>
              <option value={3}>3 px (Thick)</option>
              <option value={4}>4 px (Heavy)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-ca-ink-muted">OK Marker Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={activeSettings.okColor ?? "#10B981"}
                onChange={(e) => updateField("okColor", e.target.value)}
                className="w-6 h-6 rounded border border-ca-border cursor-pointer p-0 bg-transparent"
              />
              <span className="font-mono text-xs text-ca-ink">
                {activeSettings.okColor ?? "#10B981"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-ca-ink-muted">NG Marker Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={activeSettings.ngColor ?? "#EF4444"}
                onChange={(e) => updateField("ngColor", e.target.value)}
                className="w-6 h-6 rounded border border-ca-border cursor-pointer p-0 bg-transparent"
              />
              <span className="font-mono text-xs text-ca-ink">
                {activeSettings.ngColor ?? "#EF4444"}
              </span>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-ca-border">
            <input
              type="checkbox"
              checked={activeSettings.showOutOfJudgment ?? false}
              onChange={(e) => updateField("showOutOfJudgment", e.target.checked)}
              className="rounded bg-ca-bg border-ca-border accent-ca-select"
            />
            <span className="font-medium text-ca-ink">Show Uninspected/Out of Judgment Features</span>
          </label>
        </div>
      </div>

      {/* Action Footer */}
      {(onCancel || onOk) && (
        <div className="flex items-center justify-end gap-2 p-3 border-t border-ca-border bg-ca-panel-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 border border-ca-border bg-ca-panel rounded text-xs font-semibold hover:bg-ca-panel-2 text-ca-ink"
            >
              Cancel
            </button>
          )}
          {onOk && (
            <button
              type="button"
              onClick={onOk}
              className="px-4 py-1.5 bg-ca-select text-ca-bg rounded text-xs font-bold hover:opacity-90 shadow-sm"
            >
              OK
            </button>
          )}
        </div>
      )}
    </div>
  );
}
