import React, { useState } from "react";

interface ReadoutItem {
  label: string;
  value: string;
}

const PAGE_1_READOUTS: ReadoutItem[] = [
  { label: "Unit Time", value: "8.8ms" },
  { label: "Counts", value: "01" },
  { label: "Judged Label", value: "OK" },
  { label: "Pos. X", value: "100.0" },
  { label: "Pos. Y", value: "100.0" },
  { label: "Angle", value: "0.0" },
  { label: "Match %", value: "85" },
];

const PAGE_2_READOUTS: ReadoutItem[] = [
  { label: "Score", value: "98.5%" },
  { label: "Scale X", value: "1.00" },
  { label: "Scale Y", value: "1.00" },
  { label: "Correlation", value: "0.95" },
  { label: "Contrast", value: "Normal" },
  { label: "Exposure", value: "Auto" },
  { label: "Status", value: "Ready" },
];

const TOTAL_PAGES = 2;

function ReadoutRow({ item }: { item: ReadoutItem }): React.JSX.Element {
  return (
    <div className="flex justify-between items-center h-[24px] gap-2">
      <span className="text-std-text whitespace-nowrap font-medium min-w-[76px]">{item.label}</span>
      <div className="flex-1 bg-std-readout-bg border border-std-border rounded-xs px-2 flex items-center justify-end h-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
        <span className="text-std-readout-text font-mono text-xs font-medium">{item.value}</span>
      </div>
    </div>
  );
}

export function StandardHeaderReadouts(): React.JSX.Element | null {
  const [currentPage, setCurrentPage] = useState(1);

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === TOTAL_PAGES;

  const handlePrevPage = () => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : TOTAL_PAGES));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => (prev < TOTAL_PAGES ? prev + 1 : 1));
  };

  const currentReadouts = currentPage === 1 ? PAGE_1_READOUTS : PAGE_2_READOUTS;

  return (
    <div className="flex flex-col gap-1.5 font-sans tracking-wide text-xs w-52 bg-std-panel/95 border border-std-border p-2.5 rounded shadow-lg backdrop-blur-xs select-none">
      {currentReadouts.map((item, i) => (
        <ReadoutRow key={i} item={item} />
      ))}
      <div className="flex justify-end gap-1 mt-1">
        <button
          type="button"
          aria-label="Previous readout page"
          onClick={handlePrevPage}
          className="h-[24px] px-2.5 bg-std-secondary-action border-t border-l border-std-border-light border-b-2 border-r-2 border-std-border-dark flex items-center justify-center text-std-text text-xs active:border-t-2 active:border-l-2 active:border-b active:border-r hover:brightness-110"
        >
          ◀
        </button>
        <div className="h-[24px] w-12 bg-std-readout-bg border border-std-border rounded-xs flex items-center justify-center text-std-readout-text font-mono text-xs shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
          {currentPage} / {TOTAL_PAGES}
        </div>
        <button
          type="button"
          aria-label="Next readout page"
          onClick={handleNextPage}
          className="h-[24px] px-2.5 bg-std-secondary-action border-t border-l border-std-border-light border-b-2 border-r-2 border-std-border-dark flex items-center justify-center text-std-text text-xs active:border-t-2 active:border-l-2 active:border-b active:border-r hover:brightness-110"
        >
          ▶
        </button>
      </div>
    </div>
  );
}
