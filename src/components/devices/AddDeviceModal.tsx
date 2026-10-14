import React, { useState } from "react";
import { X, Cpu, Plus, Check } from "lucide-react";
import { useDeviceStore } from "@/lib/devices/store";
import type { InspectedDevice } from "@/lib/devices/model";

export interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceCreated?: (device: InspectedDevice) => void;
}

export function AddDeviceModal({
  isOpen,
  onClose,
  onDeviceCreated,
}: AddDeviceModalProps): React.JSX.Element | null {
  const addDevice = useDeviceStore((s) => s.addDevice);
  const [name, setName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [packageType, setPackageType] = useState("");
  const [targetFeaturesRaw, setTargetFeaturesRaw] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  function handleSave(e: React.FormEvent): void {
    e.preventDefault();
    const cleanName = name.trim();

    if (!cleanName) {
      setErrorMessage("Device Name is required (e.g. STM32F4 Microcontroller Circuit Board)");

      return;
    }

    const cleanId = deviceId.trim().toUpperCase();
    const fallbackSlug = cleanName
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);
    const resolvedId = cleanId.length > 0
      ? cleanId
      : `DEV-${fallbackSlug || Date.now().toString(36).toUpperCase()}`;

    const features = targetFeaturesRaw
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const newDevice: InspectedDevice = {
      id: resolvedId,
      name: cleanName,
      packageType: packageType.trim() || "Standard DUT",
      targetFeatures: features,
      description: description.trim() || undefined,
      createdAt: Date.now(),
    };

    addDevice(newDevice);

    if (onDeviceCreated) {
      onDeviceCreated(newDevice);
    }

    setErrorMessage(null);
    setName("");
    setDeviceId("");
    setPackageType("");
    setTargetFeaturesRaw("");
    setDescription("");
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-device-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-lg rounded-2xl border border-ca-border/80 bg-ca-panel/95 p-6 shadow-[0_16px_48px_-8px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-ca-border/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ca-primary/10 border border-ca-primary/30 text-ca-primary shadow-sm">
              <Cpu size={18} />
            </div>
            <h2 id="add-device-modal-title" className="text-sm font-bold uppercase tracking-wider text-ca-ink font-display">
              Add Inspected Device
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ca-ink-muted hover:bg-ca-surface hover:text-ca-ink transition-colors"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ca-ink-muted mb-1.5">
              Device Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. STM32F4 Microcontroller Circuit Board"
              className="w-full rounded-lg border border-ca-border/80 bg-ca-surface/80 px-3.5 py-2 text-sm text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-primary focus:ring-1 focus:ring-ca-primary/40 focus:outline-none transition-all"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ca-ink-muted">
                Device ID / Part Number
              </label>
              <span className="text-[10px] font-mono text-ca-ink-muted">Optional (Auto-generated)</span>
            </div>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g. STM32F4-MCU-BOARD (auto-derived if blank)"
              className="w-full rounded-lg border border-ca-border/80 bg-ca-surface/80 px-3.5 py-2 text-sm text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-primary focus:ring-1 focus:ring-ca-primary/40 focus:outline-none transition-all font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ca-ink-muted mb-1.5">
              Package / Form Factor (Optional)
            </label>
            <input
              type="text"
              value={packageType}
              onChange={(e) => setPackageType(e.target.value)}
              placeholder="e.g. QFP-64 SMT, BGA-256, 4-Layer PCB"
              className="w-full rounded-lg border border-ca-border/80 bg-ca-surface/80 px-3.5 py-2 text-sm text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-primary focus:ring-1 focus:ring-ca-primary/40 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ca-ink-muted mb-1.5">
              Target Inspection Features (Optional)
            </label>
            <textarea
              rows={2}
              value={targetFeaturesRaw}
              onChange={(e) => setTargetFeaturesRaw(e.target.value)}
              placeholder="e.g. IC body orientation, solder bridges, passives alignment"
              className="w-full rounded-lg border border-ca-border/80 bg-ca-surface/80 px-3.5 py-2 text-xs font-mono text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-primary focus:ring-1 focus:ring-ca-primary/40 focus:outline-none transition-all leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ca-ink-muted mb-1.5">
              Engineering Notes / Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. High-density automotive controller board"
              className="w-full rounded-lg border border-ca-border/80 bg-ca-surface/80 px-3.5 py-2 text-sm text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-primary focus:ring-1 focus:ring-ca-primary/40 focus:outline-none transition-all"
            />
          </div>

          {errorMessage ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-400">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-ca-border/70">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-ca-border/80 px-4 py-2 text-sm font-semibold text-ca-ink hover:bg-ca-panel-2 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-ca-primary hover:brightness-110 px-4 py-2 text-sm font-semibold text-ca-panel shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <Check size={16} />
              Save Device
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
