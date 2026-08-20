import React from "react";
import { Settings } from "lucide-react";

export function StandardActionBar({
  onEvaluate,
}: {
  onEvaluate?: () => void;
}): React.JSX.Element | null {
  return (
    <div className="flex items-center justify-between px-2 bg-std-chrome h-14 shrink-0 font-sans tracking-wide text-sm border-t border-gray-700">
      <div className="flex items-center gap-2">
        <button className="h-[28px] px-4 bg-std-secondary-action border-t border-l border-gray-600 border-b-2 border-r-2 border-black text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center">
          Origin / Point
        </button>
        <button className="h-[28px] px-4 bg-std-secondary-action border-t border-l border-gray-600 border-b-2 border-r-2 border-black text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center">
          Display
        </button>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button className="h-[28px] px-4 bg-std-secondary-action border-t border-l border-gray-600 border-b-2 border-r-2 border-black text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center">
            Register Image
          </button>
          <button
            onClick={onEvaluate}
            className="h-[28px] px-8 bg-std-primary-action border-t border-l border-blue-400 border-b-2 border-r-2 border-blue-900 text-std-primary-action-text font-medium hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center"
          >
            Evaluate Rule
          </button>
          <button className="h-[28px] w-[36px] flex items-center justify-center bg-std-secondary-action border-t border-l border-gray-600 border-b-2 border-r-2 border-black text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r">
            <Settings size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-[28px] px-6 bg-std-secondary-action border-t border-l border-gray-600 border-b-2 border-r-2 border-black text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center">
            Cancel
          </button>
          <button className="h-[28px] px-8 bg-std-secondary-action border-t border-l border-gray-600 border-b-2 border-r-2 border-black text-std-text hover:brightness-110 active:border-t-2 active:border-l-2 active:border-b active:border-r flex items-center justify-center">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
