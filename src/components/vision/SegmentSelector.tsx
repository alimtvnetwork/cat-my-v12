import React from 'react';
import { useVisionStore } from '../../lib/vision/store';

export function SegmentSelector() {
  const { segments, activeSegmentId, setActiveSegment, addSegment, renameSegment, deleteSegment } = useVisionStore();

  const handleRename = () => {
    if (!activeSegmentId) return;
    const segment = segments.find(s => s.visionSettings.id === activeSegmentId);
    const currentName = segment?.visionSettings.name || '';
    const newName = window.prompt('Enter new segment name:', currentName);
    if (newName !== null && newName.trim() !== '') {
      renameSegment(activeSegmentId, newName.trim());
    }
  };

  const handleDelete = () => {
    if (!activeSegmentId) return;
    if (window.confirm('Are you sure you want to delete this segment?')) {
      deleteSegment(activeSegmentId);
    }
  };

  return (
    <div className="p-4">
      <label htmlFor="segment-select" className="block text-sm font-medium text-gray-700 mb-2">
        Select Vision Segment
      </label>
      <div className="flex gap-2 items-center">
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
        <button
          onClick={() => addSegment()}
          className="mt-1 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap"
        >
          Add Segment
        </button>
        <button
          onClick={handleRename}
          disabled={!activeSegmentId}
          className="mt-1 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Rename
        </button>
        <button
          onClick={handleDelete}
          disabled={!activeSegmentId}
          className="mt-1 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
