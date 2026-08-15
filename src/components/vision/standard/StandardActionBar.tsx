import React from "react";

export function StandardActionBar() {
  return (
    <div className="flex items-center justify-between p-3 bg-ca-panel-2 border-t border-ca-border">
      <div className="flex items-center gap-2">
        <button className="px-4 py-1.5 bg-ca-panel border border-ca-border rounded text-ca-ink hover:bg-ca-border">
          Origin / Point
        </button>
        <button className="px-4 py-1.5 bg-ca-panel border border-ca-border rounded text-ca-ink hover:bg-ca-border">
          Display
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button className="px-4 py-1.5 bg-ca-panel border border-ca-border rounded text-ca-ink hover:bg-ca-border">
          Register Image
        </button>
        <button className="px-4 py-1.5 bg-ca-panel border border-ca-border rounded text-ca-ink hover:bg-ca-border">
          Run
        </button>
        <button className="px-4 py-1.5 bg-ca-panel border border-ca-border rounded text-ca-ink hover:bg-ca-border">
          Cancel
        </button>
        <button className="px-4 py-1.5 bg-ca-select text-white font-medium rounded hover:bg-ca-select/90">
          OK
        </button>
      </div>
    </div>
  );
}
