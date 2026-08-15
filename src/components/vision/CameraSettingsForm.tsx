import React from "react";
import { useVisionStore } from "../../lib/vision/store";

export function CameraSettingsForm() {
  const { segments, activeSegmentId, setCameraSettings } = useVisionStore();
  const activeSegment = segments.find((s) => s.visionSettings?.id === activeSegmentId);

  if (!activeSegment) {
    return (
      <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
        <p className="text-sm text-gray-500">
          No active segment selected to configure camera settings.
        </p>
      </div>
    );
  }

  const cameraSettings = activeSegment.visionSettings?.cameraSettings ||
    activeSegment.visionSettings?.camera || {
      lighting: 0,
      exposure: 0,
      focus: 0,
      triggerMode: "Internal",
      triggerDelay: 0,
    };

  const handleChange = (key: keyof typeof cameraSettings, value: number) => {
    if (activeSegmentId) {
      setCameraSettings(activeSegmentId, { [key]: value });
    }
  };

  const handleStringChange = (key: string, value: string) => {
    if (activeSegmentId) {
      setCameraSettings(activeSegmentId, { [key]: value });
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Camera Settings</h3>
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Mode</label>
          <div className="flex p-1 space-x-1 bg-gray-100/80 rounded-lg w-fit border border-gray-200/50">
            <button
              type="button"
              onClick={() => handleStringChange("triggerMode", "Internal")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                cameraSettings.triggerMode === "Internal" || !cameraSettings.triggerMode
                  ? "bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              Internal
            </button>
            <button
              type="button"
              onClick={() => handleStringChange("triggerMode", "External")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                cameraSettings.triggerMode === "External"
                  ? "bg-white text-indigo-600 shadow-sm ring-1 ring-gray-200/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              External
            </button>
          </div>
        </div>
        {cameraSettings.triggerMode === "External" && (
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Source</label>
              <select
                className="w-32 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={cameraSettings.triggerSource || "Line 1"}
                onChange={(e) => handleStringChange("triggerSource", e.target.value)}
              >
                <option value="Line 1">Line 1</option>
                <option value="Line 2">Line 2</option>
                <option value="Line 3">Line 3</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Delay (ms)
              </label>
              <input
                type="number"
                min="0"
                value={cameraSettings.triggerDelay || 0}
                onChange={(e) => handleChange("triggerDelay", Number(e.target.value))}
                className="w-32 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-5 rounded-lg border border-gray-100">
        <h4 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-5">
          Camera Basics
        </h4>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lighting</label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="100"
                value={cameraSettings.lighting}
                onChange={(e) => handleChange("lighting", Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <input
                type="number"
                value={cameraSettings.lighting}
                onChange={(e) => handleChange("lighting", Number(e.target.value))}
                className="w-20 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow duration-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exposure</label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0"
                max="100"
                value={cameraSettings.exposure}
                onChange={(e) => handleChange("exposure", Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <input
                type="number"
                value={cameraSettings.exposure}
                onChange={(e) => handleChange("exposure", Number(e.target.value))}
                className="w-20 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-shadow duration-200"
              />
            </div>
          </div>
          <div className="pt-6 mt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
              Optics
            </h4>
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60 shadow-sm transition-all hover:shadow-md">
              <label className="block text-sm font-medium text-slate-700 mb-3">Manual Focus</label>
              <div className="flex items-center gap-5">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cameraSettings.focus}
                  onChange={(e) => handleChange("focus", Number(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                />
                <input
                  type="number"
                  value={cameraSettings.focus}
                  onChange={(e) => handleChange("focus", Number(e.target.value))}
                  className="w-24 rounded-lg border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm font-medium px-3 py-2 border bg-white hover:border-slate-400 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
