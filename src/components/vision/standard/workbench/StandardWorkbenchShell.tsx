import React, { type ReactNode } from "react";
import { Camera, RefreshCw, Upload } from "lucide-react";
import type { WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { CameraCaptureModal } from "@/components/vision/white-box/CameraCaptureModal";

export interface StandardWorkbenchShellProps {
  canvas: ReactNode;
  inspectorPanel: ReactNode;
  isCameraOpen: boolean;
  onCloseCamera: () => void;
  onCaptureCameraFrame: (input: WhiteBoxMarkingInput) => void;
  onLoadFile: (file: File) => void;
  onRefresh?: () => void;
  toolName?: string;
  toolCode?: string;
}

export function StandardWorkbenchShell(props: StandardWorkbenchShellProps): React.JSX.Element {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#07090e] text-white font-sans select-none">
      <div className="flex h-full min-h-0 min-w-[1024px] flex-col">
        {/* Main Workspace Split (Left Canvas + Right Inspector) */}
        <div className="flex min-h-0 flex-1 gap-2 p-2 pb-0">
          {/* Left Canvas Container */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-[#212832] bg-[#0a0d12] shadow-lg">
            {props.canvas}
          </div>

          {/* Right Inspector Panel */}
          <div
            data-tour="rule-config-controls"
            className="flex w-[390px] lg:w-[410px] shrink-0 flex-col overflow-hidden rounded-lg border border-[#212832] bg-[#0e1319] shadow-lg"
          >
            {props.inspectorPanel}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="m-2 flex h-12 shrink-0 items-center justify-between rounded-lg border border-[#212832] bg-[#121720] px-3 shadow-md">
          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded border border-[#374151] bg-[#1f2937] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:border-cyan-400 hover:bg-[#283548]">
              <Upload size={14} className="text-cyan-400" />
              Register Image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (!file) {
                    return;
                  }

                  props.onLoadFile(file);
                  e.target.value = "";
                }}
                className="sr-only"
              />
            </label>

            <button
              type="button"
              onClick={props.onCloseCamera}
              className="flex items-center gap-2 rounded border border-[#374151] bg-[#1f2937] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-all hover:border-cyan-400 hover:bg-[#283548]"
            >
              <Camera size={14} className="text-cyan-400" />
              Live Camera
            </button>

            {props.onRefresh && (
              <button
                type="button"
                onClick={props.onRefresh}
                className="flex items-center gap-1.5 rounded border border-[#374151] bg-[#1f2937] px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:bg-[#283548] hover:text-white"
              >
                <RefreshCw size={13} />
                Re-evaluate
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            {props.toolName && <span className="font-semibold text-slate-200">{props.toolName}</span>}
            {props.toolCode && (
              <span className="rounded bg-cyan-950/60 px-2 py-0.5 font-bold text-cyan-400 border border-cyan-800/40">
                {props.toolCode}
              </span>
            )}
          </div>
        </div>
      </div>

      <CameraCaptureModal
        isOpen={props.isCameraOpen}
        onClose={props.onCloseCamera}
        onCapture={props.onCaptureCameraFrame}
      />
    </section>
  );
}
