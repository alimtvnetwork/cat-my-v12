import React from "react";
import { Check, X, QrCode, Barcode, ShieldCheck } from "lucide-react";

export interface CodeReaderToolPanelProps {
  symbology: "qr" | "datamatrix" | "code128" | "ean13";
  expectedPattern: string;
  decodedPayload: string;
  detectedSymbology: string;
  printQualityGrade: string;
  isPass: boolean;
  actionButtonLabel?: string;
  onSymbologyChange: (symbology: "qr" | "datamatrix" | "code128" | "ean13") => void;
  onExpectedPatternChange: (pattern: string) => void;
  onApply: () => void;
  onCancel?: () => void;
}

export function CodeReaderToolPanel(props: CodeReaderToolPanelProps): React.JSX.Element {
  const label = props.actionButtonLabel ?? "OK - Apply to Rule";

  return (
    <aside className="flex h-full flex-col overflow-hidden text-slate-100 font-sans">
      {/* Panel Header */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#212832] bg-[#121720] px-4">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
            1D / 2D Code Reader
          </span>
        </div>
        <span className="rounded bg-cyan-950/80 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-400 border border-cyan-800/50">
          T103
        </span>
      </div>

      {/* Scrollable Controls */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* 1. Real-Time Decoded Payload Card */}
        <div
          className={`rounded-lg border p-3 transition-colors ${
            props.isPass
              ? "border-emerald-500/40 bg-emerald-950/20"
              : "border-rose-500/40 bg-rose-950/20"
          }`}
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-[#212832]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck
                className={`h-4 w-4 ${props.isPass ? "text-emerald-400" : "text-rose-400"}`}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                Decoded Payload
              </span>
            </div>
            <span
              className={`rounded px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                props.isPass
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
              }`}
            >
              {props.isPass ? "VERIFIED DECODE" : "DECODE MISMATCH"}
            </span>
          </div>

          <div className="mt-2.5">
            <span className="text-[11px] text-slate-400 font-medium">Decoded String:</span>
            <div className="mt-1 rounded bg-[#0a0d12] p-2 font-mono text-xs text-cyan-300 break-all border border-[#212832]">
              {props.decodedPayload || "NO_BARCODE_DETECTED"}
            </div>
          </div>

          <div className="mt-2 flex justify-between text-[10px] font-mono text-slate-400 border-t border-[#212832] pt-1">
            <span>Symbology: {props.detectedSymbology}</span>
            <span>ISO/IEC Grade: {props.printQualityGrade}</span>
          </div>
        </div>

        {/* 2. Symbology Selection */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Target Symbology
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "qr", label: "QR Code", icon: QrCode },
              { id: "datamatrix", label: "DataMatrix (2D)", icon: QrCode },
              { id: "code128", label: "Code 128 (1D)", icon: Barcode },
              { id: "ean13", label: "EAN-13 (1D)", icon: Barcode },
            ].map((s) => {
              const Icon = s.icon;

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    props.onSymbologyChange(s.id as "qr" | "datamatrix" | "code128" | "ean13")
                  }
                  className={`flex items-center gap-2 rounded border p-2 text-xs font-bold transition-all ${
                    props.symbology === s.id
                      ? "border-cyan-400 bg-cyan-950/50 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                      : "border-[#2d3748] bg-[#1a202c] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon size={14} className="text-cyan-400" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Expected Pattern / Regex */}
        <div className="rounded-lg border border-[#212832] bg-[#121720] p-3 space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Expected Pattern / String Filter
          </label>
          <input
            type="text"
            value={props.expectedPattern}
            onChange={(e) => props.onExpectedPatternChange(e.target.value)}
            placeholder="e.g. SN-[0-9]{8} or leave blank for any"
            className="w-full rounded border border-[#2d3748] bg-[#1a202c] px-2.5 py-1.5 font-mono text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
          />
          <div className="text-[10px] text-slate-500">
            Leave blank to match any successfully decoded payload.
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex shrink-0 items-center gap-2 border-t border-[#212832] bg-[#121720] p-3">
        <button
          type="button"
          onClick={props.onApply}
          className="flex flex-1 items-center justify-center gap-2 rounded bg-[#00ff9d] py-2.5 text-xs font-black uppercase tracking-wider text-black shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Check size={16} strokeWidth={3} />
          {label}
        </button>

        {props.onCancel && (
          <button
            type="button"
            onClick={props.onCancel}
            className="flex items-center justify-center rounded border border-[#374151] bg-[#1f2937] px-4 py-2.5 text-xs font-bold uppercase text-slate-300 transition-colors hover:bg-[#2d3748] hover:text-white"
          >
            <X size={14} className="mr-1" />
            Cancel
          </button>
        )}
      </div>
    </aside>
  );
}
