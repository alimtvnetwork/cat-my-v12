import React from "react";

export function StandardHeaderReadouts() {
  return (
    <div className="bg-black text-white p-2 text-sm flex flex-col gap-1 w-64 rounded shadow">
      <div className="flex justify-between">
        <span>Unit Time</span>
        <span>8.8ms</span>
      </div>
      <div className="flex justify-between">
        <span>Counts</span>
        <span>01</span>
      </div>
      <div className="flex justify-between">
        <span>Judged Label</span>
        <span>OK</span>
      </div>
      <div className="flex justify-between">
        <span>Pos. X</span>
        <span>100.0</span>
      </div>
      <div className="flex justify-between">
        <span>Pos. Y</span>
        <span>100.0</span>
      </div>
      <div className="flex justify-between">
        <span>Angle</span>
        <span>0.0</span>
      </div>
      <div className="flex justify-between">
        <span>Match %</span>
        <span>85</span>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button className="px-2 py-1 bg-gray-700 rounded">&lt;</button>
        <span>1 / 2</span>
        <button className="px-2 py-1 bg-gray-700 rounded">&gt;</button>
      </div>
    </div>
  );
}
