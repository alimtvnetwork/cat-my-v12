import React, { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Cpu, Plus, Trash2, Search, Layers, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useDeviceStore } from "@/lib/devices/store";
import type { InspectedDevice } from "@/lib/devices/model";
import { AddDeviceModal } from "@/components/devices/AddDeviceModal";
import { useUiMode, UiModeType } from "@/hooks/useUiMode";
import { StandardAppShell } from "@/components/layout/StandardAppShell";

export const Route = createFileRoute("/setup/devices")({
  head: () => ({
    meta: [
      { title: "Device Setup - Control Automation" },
      {
        name: "description",
        content:
          "Configure inspected devices (DUTs): Part numbers, package form factors, and target inspection features.",
      },
    ],
  }),
  component: SetupDevicesPage,
});

function SetupDevicesPage(): React.JSX.Element {
  const { mode } = useUiMode();
  const devicesMap = useDeviceStore((s) => s.devices);
  const removeDevice = useDeviceStore((s) => s.removeDevice);

  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);

  const deviceList = useMemo(() => {
    return Object.values(devicesMap).sort((a, b) => b.createdAt - a.createdAt);
  }, [devicesMap]);

  const filteredDevices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return deviceList;
    }

    return deviceList.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        d.id.toLowerCase().includes(query) ||
        d.packageType.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query)),
    );
  }, [deviceList, searchQuery]);

  const handleDeleteDevice = (id: string, name: string) => {
    removeDevice(id);
    setDeviceToDelete(null);
    toast.success(`Device "${name}" removed from catalog`);
  };

  const body = (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ca-ink-muted pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search devices by name, part number, package..."
            className="w-full rounded-xl border border-ca-border/80 bg-ca-panel/80 pl-10 pr-4 py-2 text-sm text-ca-ink placeholder:text-ca-ink-muted focus:border-ca-primary focus:ring-1 focus:ring-ca-primary/40 focus:outline-none transition-all shadow-sm"
          />
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-ca-primary hover:brightness-110 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ca-panel shadow-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus size={15} />
          <span>Add Inspected Device</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-ca-border/70 bg-ca-panel/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ca-ink-muted">Registered Devices</span>
            <Cpu size={16} className="text-ca-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-ca-ink">{deviceList.length}</div>
        </div>

        <div className="rounded-xl border border-ca-border/70 bg-ca-panel/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ca-ink-muted">Package Form Factors</span>
            <Layers size={16} className="text-teal-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-ca-ink">
            {new Set(deviceList.map((d) => d.packageType)).size}
          </div>
        </div>

        <div className="rounded-xl border border-ca-border/70 bg-ca-panel/60 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ca-ink-muted">Active Inspection DUTs</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-400">100% READY</div>
        </div>
      </div>

      {/* Device Cards List */}
      {filteredDevices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredDevices.map((device: InspectedDevice) => {
            const hasFeatures = Boolean(device.targetFeatures && device.targetFeatures.length > 0);

            return (
              <div
                key={device.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-ca-border/80 bg-gradient-to-b from-ca-panel/90 via-ca-panel/75 to-ca-bg/90 p-6 shadow-sm backdrop-blur-xl transition-all hover:border-ca-primary/50 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ca-primary/10 border border-ca-primary/30 text-ca-primary shadow-sm">
                        <Cpu size={20} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-ca-ink tracking-tight font-display">
                          {device.name}
                        </h3>
                        <span className="inline-block mt-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider bg-ca-surface border border-ca-border text-ca-ink-muted">
                          {device.id}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeviceToDelete(device.id)}
                      className="rounded-lg p-1.5 text-ca-ink-muted hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove device"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 text-xs font-mono font-semibold text-teal-400">
                      <Layers size={12} />
                      {device.packageType || "Standard DUT"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      CALIBRATED
                    </span>
                  </div>

                  {device.description ? (
                    <p className="mt-3 text-xs leading-relaxed text-ca-ink-muted">
                      {device.description}
                    </p>
                  ) : null}

                  {hasFeatures ? (
                    <div className="mt-4 border-t border-ca-border/60 pt-3">
                      <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-ca-ink-muted mb-2">
                        Target Inspection Features:
                      </span>
                      <ul className="space-y-1.5">
                        {device.targetFeatures.map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-ca-ink font-sans">
                            <span className="text-ca-primary font-mono text-[10px] mt-0.5">▸</span>
                            <span className="leading-tight">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 pt-3 border-t border-ca-border/50 flex items-center justify-between text-[11px] font-mono text-ca-ink-muted">
                  <span>Created: {new Date(device.createdAt).toLocaleDateString()}</span>
                  <span className="text-teal-400/80">DUT READY</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ca-border/80 bg-ca-panel/40 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ca-primary/10 border border-ca-primary/30 text-ca-primary mb-4">
            <Cpu size={24} />
          </div>
          <h3 className="text-base font-bold text-ca-ink font-display">No devices found</h3>
          <p className="mt-1 text-xs text-ca-ink-muted max-w-sm">
            {searchQuery
              ? `No devices matched "${searchQuery}". Try clearing the search query.`
              : "Register inspected chips, circuit boards, and components to bind them to inspection projects."}
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ca-primary hover:brightness-110 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ca-panel shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus size={15} />
            <span>Add Device</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deviceToDelete ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        >
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-ca-panel/95 p-6 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <AlertCircle size={22} />
              <h3 className="text-base font-bold text-ca-ink">Remove Inspected Device?</h3>
            </div>
            <p className="text-xs text-ca-ink-muted leading-relaxed">
              Are you sure you want to remove this device from the hardware catalog? Projects referencing this device will retain their historic records.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeviceToDelete(null)}
                className="rounded-xl border border-ca-border/80 px-4 py-2 text-xs font-semibold text-ca-ink hover:bg-ca-panel-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = devicesMap[deviceToDelete];
                  handleDeleteDevice(deviceToDelete, target?.name || deviceToDelete);
                }}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Delete Device
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDeviceCreated={(d) => {
          toast.success(`Device "${d.name}" created successfully`);
        }}
      />
    </div>
  );

  if (mode === UiModeType.Standard) {
    return (
      <StandardAppShell
        activeNav="setup"
        title="Device Setup"
        subtitle="Manage inspected chips, circuit boards, and electronic DUT catalog"
      >
        {body}
      </StandardAppShell>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-col gap-1 border-b border-[#22252a] bg-[#1a1c23] px-6 py-4">
        <h1 className="flex items-center gap-2 text-base font-bold uppercase tracking-wider text-ca-ink font-display">
          <Cpu className="h-5 w-5 text-ca-primary" aria-hidden /> Device Setup
        </h1>
        <p className="text-xs text-ca-ink-muted">
          Inspected device catalog (DUTs): Part numbers, package form factors, and target defect features shared across projects.
        </p>
      </header>
      {body}
    </div>
  );
}
