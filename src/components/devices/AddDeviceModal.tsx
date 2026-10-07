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
  const [deviceId, setDeviceId] = useState("");
  const [name, setName] = useState("");
  const [packageType, setPackageType] = useState("QFP-64 SMT");
  const [targetFeaturesRaw, setTargetFeaturesRaw] = useState(
    "IC body orientation & laser marking (Pin 1 polarity)\nSolder bridges and lead spacing on QFP / SOP leads\nPresence/absence of surrounding SMD capacitors and resistors",
  );
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  function handleSave(e: React.FormEvent): void {
    e.preventDefault();
    const cleanId = deviceId.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanId) {
      setErrorMessage("Device ID / Part Number is required (e.g. STM32F4-MCU-BOARD)");

      return;
    }

    if (!cleanName) {
      setErrorMessage("Device Name is required (e.g. STM32F4 Microcontroller Circuit Board)");

      return;
    }

    const features = targetFeaturesRaw
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    const newDevice: InspectedDevice = {
      id: cleanId,
      name: cleanName,
      packageType: packageType.trim() || "Custom PCB",
      targetFeatures: features,
      description: description.trim() || undefined,
      createdAt: Date.now(),
    };

    addDevice(newDevice);

    if (onDeviceCreated) {
      onDeviceCreated(newDevice);
    }

    setErrorMessage(null);
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-device-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-xl border border-ca-border bg-ca-panel p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-ca-border">
          <div className="flex items-center gap-2">
            <Cpu className="text-ca-primary" size={20} />
            <h2 id="add-device-modal-title" className="text-base font-bold text-ca-ink">
              Add Inspected Device (Target Chip / Circuit)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ca-ink-muted hover:bg-ca-panel-2 hover:text-ca-ink"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ca-ink-muted mb-1">
              Device ID / Part Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="e.g. STM32F4-MCU-BOARD, PCB-ECU-MAIN-V2"
              className="w-full rounded-md border border-ca-border bg-ca-panel-2 px-3 py-2 text-sm text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ca-ink-muted mb-1">
              Device Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. STM32F4 Microcontroller Circuit Board"
              className="w-full rounded-md border border-ca-border bg-ca-panel-2 px-3 py-2 text-sm text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ca-ink-muted mb-1">
              Package / Form Factor
            </label>
            <input
              type="text"
              value={packageType}
              onChange={(e) => setPackageType(e.target.value)}
              placeholder="e.g. QFP-64 SMT, BGA-256, 4-Layer PCB"
              className="w-full rounded-md border border-ca-border bg-ca-panel-2 px-3 py-2 text-sm text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ca-ink-muted mb-1">
              Target Inspection Features (One per line)
            </label>
            <textarea
              rows={3}
              value={targetFeaturesRaw}
              onChange={(e) => setTargetFeaturesRaw(e.target.value)}
              placeholder="IC body orientation & laser marking (Pin 1 polarity)&#10;Solder bridges and lead spacing on QFP / SOP leads&#10;Presence/absence of surrounding SMD capacitors and resistors"
              className="w-full rounded-md border border-ca-border bg-ca-panel-2 px-3 py-2 text-xs font-mono text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ca-ink-muted mb-1">
              Engineering Notes / Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. High-density automotive controller board"
              className="w-full rounded-md border border-ca-border bg-ca-panel-2 px-3 py-2 text-sm text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-select focus:outline-none"
            />
          </div>

          {errorMessage ? (
            <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-xs text-rose-400">
              {errorMessage}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-2 border-t border-ca-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-ca-border bg-ca-panel-2 px-4 py-2 text-sm text-ca-ink hover:bg-ca-panel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-ca-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
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
