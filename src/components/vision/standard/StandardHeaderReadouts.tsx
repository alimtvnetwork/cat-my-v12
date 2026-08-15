import React from "react";

export function StandardHeaderReadouts() {
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
    <div className="flex flex-col gap-[6px] font-sans tracking-wide text-xs w-48">
      {readouts.map((r, i) => (
        <div key={i} className="flex justify-between items-center h-[26px] gap-2">
          <span className="text-std-text whitespace-nowrap">{r.label}</span>
          <div className="flex-1 bg-std-readout-bg border border-gray-400 px-1.5 flex items-center justify-end h-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
            <span className="text-std-readout-text font-medium">{r.value}</span>
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-1 mt-1">
        <button className="h-[26px] px-3 bg-gray-300 border-t border-l border-white border-b-2 border-r-2 border-gray-500 flex items-center justify-center text-black active:border-t-2 active:border-l-2 active:border-b active:border-r hover:bg-gray-200">
          ◀
        </button>
        <div className="h-[26px] w-12 bg-std-readout-bg border border-gray-400 flex items-center justify-center text-std-readout-text shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]">
          1 / 2
        </div>
        <button className="h-[26px] px-3 bg-gray-300 border-t border-l border-white border-b-2 border-r-2 border-gray-500 flex items-center justify-center text-black active:border-t-2 active:border-l-2 active:border-b active:border-r hover:bg-gray-200">
          ▶
        </button>
      </div>
    </div>
  );
}
