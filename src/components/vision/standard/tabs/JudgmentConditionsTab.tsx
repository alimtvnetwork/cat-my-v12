import React from "react";
import { useStandardToolContext } from "../StandardToolContext";

export interface JudgmentItem {
  id: string;
  name: string;
  unit?: string;
  lowerLimit: number;
  measured: number;
  upperLimit: number;
  status?: "PASS" | "FAIL" | "OK" | "NG";
}

export interface JudgmentConditionsTabProps {
  items?: JudgmentItem[];
  onChangeItem?: (index: number, updated: Partial<JudgmentItem>) => void;
  onAutoSetLimits?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
}

const defaultItems: JudgmentItem[] = [
  {
    id: "j1",
    name: "Measured Value",
    unit: "px",
    lowerLimit: 0,
    measured: 50,
    upperLimit: 100,
    status: "PASS",
  },
  {
    id: "j2",
    name: "Correlation / Score",
    unit: "%",
    lowerLimit: 70,
    measured: 94.2,
    upperLimit: 100,
    status: "PASS",
  },
];

export function JudgmentConditionsTab({
  items,
  onChangeItem,
  onAutoSetLimits,
  onCancel,
  onOk,
}: JudgmentConditionsTabProps): React.JSX.Element {
  const context = useStandardToolContext();
  const contextItems = context?.settings.params?.judgmentItems as JudgmentItem[] | undefined;

  const resolvedInitial = items ?? contextItems ?? defaultItems;
  const [internalItems, setInternalItems] = React.useState<JudgmentItem[]>(resolvedInitial);
  const activeItems = items ?? contextItems ?? internalItems;

  const handleChange = (index: number, updated: Partial<JudgmentItem>) => {
    const currentItem = activeItems[index] ?? {
      id: `j${index + 1}`,
      name: "Item",
      lowerLimit: 0,
      measured: 0,
      upperLimit: 100,
      status: "PASS",
    };

    const nextLower = updated.lowerLimit ?? currentItem.lowerLimit;
    const nextUpper = updated.upperLimit ?? currentItem.upperLimit;
    const nextMeasured = updated.measured ?? currentItem.measured;
    const isWithinLimits = nextMeasured >= nextLower && nextMeasured <= nextUpper;
    const computedStatus: "PASS" | "FAIL" = isWithinLimits ? "PASS" : "FAIL";

    const fullUpdated: Partial<JudgmentItem> = {
      ...updated,
      status: computedStatus,
    };

    const next = [...activeItems];
    next[index] = { ...currentItem, ...fullUpdated };
    setInternalItems(next);

    if (onChangeItem) {
      onChangeItem(index, fullUpdated);
    } else if (context) {
      context.updateJudgmentItem(index, fullUpdated);
    }
  };

  const handleAutoSetLimits = () => {
    if (onAutoSetLimits) {
      onAutoSetLimits();

      return;
    }

    if (context) {
      context.autoSetLimits();

      return;
    }

    const next = activeItems.map((item) => {
      const margin = Math.abs(item.measured) * 0.2 || 10;
      const lower = Math.round((item.measured - margin) * 100) / 100;
      const upper = Math.round((item.measured + margin) * 100) / 100;

      return {
        ...item,
        lowerLimit: lower,
        upperLimit: upper,
        status: "PASS" as const,
      };
    });

    setInternalItems(next);
  };

  return (
    <div className="flex flex-col h-full text-ca-ink font-sans">
      <div className="flex flex-col flex-1 overflow-y-auto p-3 gap-3">
        <div className="flex items-center justify-between bg-ca-panel-2 px-3 py-1.5 rounded border border-ca-border">
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wider text-ca-ink">
              Judgment Conditions
            </h3>
            <p className="text-[10px] text-ca-ink-muted">
              Within limits = PASS • Outside limits = FAIL
            </p>
          </div>
          <button
            type="button"
            onClick={handleAutoSetLimits}
            className="px-2 py-1 bg-ca-panel border border-ca-border rounded text-xs font-semibold text-ca-ink hover:bg-ca-panel-2 shadow-sm"
          >
            Auto Set Limits
          </button>
        </div>

        {/* Judgment Items Table */}
        <div className="flex flex-col border border-ca-border rounded overflow-hidden bg-ca-panel">
          <div className="grid grid-cols-12 gap-1 bg-ca-panel-2 px-2.5 py-1.5 border-b border-ca-border text-[11px] font-bold text-ca-ink-muted uppercase tracking-wider">
            <span className="col-span-4">Item</span>
            <span className="col-span-2 text-right">Lower</span>
            <span className="col-span-3 text-center">Measured</span>
            <span className="col-span-2 text-right">Upper</span>
            <span className="col-span-1 text-center">Status</span>
          </div>

          <div className="divide-y divide-ca-border">
            {activeItems.map((item, idx) => {
              const isPass = item.status === "PASS" || item.status === "OK";

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-1 items-center px-2.5 py-1.5 text-xs"
                >
                  <span className="col-span-4 font-medium truncate text-ca-ink" title={item.name}>
                    {item.name}
                  </span>

                  <div className="col-span-2 flex justify-end">
                    <input
                      type="number"
                      value={item.lowerLimit}
                      onChange={(e) => handleChange(idx, { lowerLimit: Number(e.target.value) })}
                      className="w-16 bg-ca-bg border border-ca-border rounded px-1.5 py-0.5 text-right font-mono text-xs text-ca-ink"
                    />
                  </div>

                  <div className="col-span-3 flex items-center justify-center font-mono font-bold text-xs text-ca-ink">
                    {item.measured}
                    {item.unit && (
                      <span className="text-[10px] text-ca-ink-muted ml-0.5">{item.unit}</span>
                    )}
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <input
                      type="number"
                      value={item.upperLimit}
                      onChange={(e) => handleChange(idx, { upperLimit: Number(e.target.value) })}
                      className="w-16 bg-ca-bg border border-ca-border rounded px-1.5 py-0.5 text-right font-mono text-xs text-ca-ink"
                    />
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <span
                      className={`inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        isPass ? "bg-ca-ok/20 text-ca-ok" : "bg-ca-ng/20 text-ca-ng"
                      }`}
                    >
                      {item.status || "PASS"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
