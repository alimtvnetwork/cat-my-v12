import React from "react";

export function StandardHeaderReadouts(): React.JSX.Element | null {
  const readouts = [
    { label: "Unit Time", value: "8.8ms" },
    { label: "Counts", value: "01" },
    { label: "Judged Label", value: "OK" },
    { label: "Pos. X", value: "100.0" },
    { label: "Pos. Y", value: "100.0" },
    { label: "Angle", value: "0.0" },
    { label: "Match %", value: "85" },
  ];

  return (
    <div className="flex flex-col gap-1.5 font-sans tracking-wide text-xs w-52 bg-std-panel/95 border border-std-border p-2.5 rounded shadow-lg backdrop-blur-xs select-none">
      {readouts.map((r, i) => (
        <div key={i} className="flex justify-between items-center h-[24px] gap-2">
          <span className="text-std-text whitespace-nowrap font-medium min-w-[76px]">
            {r.label}
          </span>
          <div className="flex-1 bg-std-readout-bg border border-std-border rounded-xs px-2 flex items-center justify-end h-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
            <span className="text-std-readout-text font-mono text-xs font-medium">{r.value}</span>
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-1 mt-1">
        <button
          type="button"
          aria-label="Previous readout page"
          className="h-[24px] px-2.5 bg-std-secondary-action border-t border-l border-std-border-light border-b-2 border-r-2 border-std-border-dark flex items-center justify-center text-std-text text-xs active:border-t-2 active:border-l-2 active:border-b active:border-r hover:brightness-110"
        >
          ◀
        </button>
        <div className="h-[24px] w-12 bg-std-readout-bg border border-std-border rounded-xs flex items-center justify-center text-std-readout-text font-mono text-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
          1 / 2
        </div>
        <button
          type="button"
          aria-label="Next readout page"
          className="h-[24px] px-2.5 bg-std-secondary-action border-t border-l border-std-border-light border-b-2 border-r-2 border-std-border-dark flex items-center justify-center text-std-text text-xs active:border-t-2 active:border-l-2 active:border-b active:border-r hover:brightness-110"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
