import React, { useState } from "react";
import { Focus } from "lucide-react";

export function FocusPeakingVisualizer(): React.JSX.Element | null {
  const [enabled, setEnabled] = useState(false);

  return (
    <>
      <div className="absolute top-4 right-4 z-10 flex flex-col items-end space-y-2">
        <button
          onClick={() => setEnabled(!enabled)}
          className={`flex items-center justify-center min-h-[40px] min-w-[40px] p-2 rounded-md shadow-sm transition-colors border ${
            enabled
              ? "bg-indigo-600 text-white border-indigo-700"
              : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
          }`}
          title="Toggle Focus Peaking"
        >
          <Focus size={20} />
        </button>
      </div>

      {enabled && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJub25lIi8+CjxjaXJjbGUgY3g9IjEiIGN5PSIxIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwgMCwgMCwgMC4yKSIvPgo8L3N2Zz4=')]">
          <div className="bg-red-500/20 text-red-800 text-xs font-bold px-3 py-1 rounded backdrop-blur-sm border border-red-500/30">
            Focus Peaking Active
          </div>
        </div>
      )}
    </>
  );
}
