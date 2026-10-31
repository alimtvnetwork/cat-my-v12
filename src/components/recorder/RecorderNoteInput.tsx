import React, { useState } from "react";

interface RecorderNoteInputProps {
  onSave: (note: string) => void;
  onClose: () => void;
}

export function RecorderNoteInput({ onSave, onClose }: RecorderNoteInputProps): React.JSX.Element {
  const [text, setText] = useState("");

  const handleSave = () => {
    if (!text.trim()) {
      onClose();

      return;
    }

    onSave(text.trim());
    setText("");
    onClose();
  };

  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/95 p-1.5 shadow-xl">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
        placeholder="What looks wrong here?"
        className="w-56 rounded bg-slate-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
      />
      <button
        type="button"
        onClick={handleSave}
        className="rounded bg-cyan-600 px-2 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
      >
        Save
      </button>
    </div>
  );
}
