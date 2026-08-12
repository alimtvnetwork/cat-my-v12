import React from 'react';
import { useVisionStore } from '../../lib/vision/store';

export function SegmentSelector() {
  const { segments, activeSegmentId, setActiveSegment } = useVisionStore();

  return (
    <div className="p-4">
      <label htmlFor="segment-select" className="block text-sm font-medium text-gray-700 mb-2">
        Select Vision Segment
      </label>
      <select
        id="segment-select"
        value={activeSegmentId || ''}
        onChange={(e) => setActiveSegment(e.target.value)}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
      >
        <option value="">-- Choose a segment --</option>
        {segments.map((segment) => (
          <option key={segment.visionSettings.id} value={segment.visionSettings.id}>
            {segment.visionSettings.name || segment.visionSettings.id}
          </option>
        ))}
      </select>
    </div>
  );
}
