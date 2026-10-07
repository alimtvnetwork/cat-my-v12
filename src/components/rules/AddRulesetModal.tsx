import React, { useState } from "react";
import { X, FolderPlus } from "lucide-react";

export interface AddRulesetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, description?: string) => void;
}

export function AddRulesetModal({ isOpen, onClose, onAdd }: AddRulesetModalProps): React.JSX.Element | null {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), description.trim() || undefined);
    setName("");
    setDescription("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#1e1e1e] border border-[#333] rounded-lg shadow-2xl overflow-hidden font-sans">
        <header className="flex h-11 items-center justify-between border-b border-[#333] bg-[#222] px-4">
          <div className="flex items-center gap-2 text-white">
            <FolderPlus size={16} className="text-amber-400" />
            <span className="text-sm font-bold uppercase tracking-wider">New Ruleset</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-gray-400">Ruleset Name</span>
              <input
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Front Face Inspection"
                className="rounded border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-gray-400">Description / Category (Optional)</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Defect checks for assembly stage 2"
                className="rounded border border-[#333] bg-[#111] px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
              />
            </label>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-2 rounded text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              Create Ruleset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
