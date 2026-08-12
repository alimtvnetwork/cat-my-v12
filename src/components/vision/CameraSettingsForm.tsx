import React from 'react';
import { useVisionStore } from '../../lib/vision/store';

export function CameraSettingsForm() {
  const { segments, activeSegmentId, setCameraSettings } = useVisionStore();
  const activeSegment = segments.find(s => s.visionSettings?.id === activeSegmentId);

  if (!activeSegment) {
    return (
      <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
        <p className="text-sm text-gray-500">No active segment selected to configure camera settings.</p>
      </div>
    );
  }

  const cameraSettings = activeSegment.visionSettings?.cameraSettings || activeSegment.visionSettings?.camera || {
    lighting: 0,
    exposure: 0,
    focus: 0
  };

  const handleChange = (key: keyof typeof cameraSettings, value: number) => {
    if (activeSegmentId) {
      setCameraSettings(activeSegmentId, { [key]: value });
    }
  };

  return (
    <div className="p-4 bg-white rounded-md border border-gray-200 shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Camera Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lighting</label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="100"
              value={cameraSettings.lighting}
              onChange={(e) => handleChange('lighting', Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              value={cameraSettings.lighting}
              onChange={(e) => handleChange('lighting', Number(e.target.value))}
              className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exposure</label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="100"
              value={cameraSettings.exposure}
              onChange={(e) => handleChange('exposure', Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              value={cameraSettings.exposure}
              onChange={(e) => handleChange('exposure', Number(e.target.value))}
              className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Focus</label>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="100"
              value={cameraSettings.focus}
              onChange={(e) => handleChange('focus', Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              value={cameraSettings.focus}
              onChange={(e) => handleChange('focus', Number(e.target.value))}
              className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
