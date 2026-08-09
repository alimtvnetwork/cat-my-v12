// Barcode / QR param editor (Plan 67 step 30). Bound to the BarcodeParams
// contract from `src/lib/editor/primitives/barcode.ts`. Standalone params +
// onChange API so it can be integrated before the "B" rule kind is added
// to the EditorRuleKind union.
import {
  BARCODE_DEFAULTS,
  BARCODE_SYMBOLOGIES,
  BarcodeMatchModeType,
  BarcodeSymbologyType,
  validateBarcodeParams,
  type BarcodeParams,
  type BarcodeSymbology,
} from "@/lib/editor/primitives/barcode";

export interface BarcodeRuleEditorProps {
  name?: string;
  params: BarcodeParams;
  onChange: (next: BarcodeParams) => void;
}

const SYMBOLOGY_LABEL: Record<BarcodeSymbologyType, string> = {
  [BarcodeSymbologyType.Any]: "Any (auto)",
  [BarcodeSymbologyType.Qr]: "QR",
  [BarcodeSymbologyType.Code128]: "Code 128",
  [BarcodeSymbologyType.Code39]: "Code 39",
  [BarcodeSymbologyType.Ean13]: "EAN-13",
  [BarcodeSymbologyType.Ean8]: "EAN-8",
  [BarcodeSymbologyType.Upca]: "UPC-A",
  [BarcodeSymbologyType.Upce]: "UPC-E",
  [BarcodeSymbologyType.Datamatrix]: "Data Matrix",
  [BarcodeSymbologyType.Pdf417]: "PDF417",
  [BarcodeSymbologyType.Aztec]: "Aztec",
};

interface BarcodeMatchModeOption {
  value: BarcodeMatchModeType;
  label: string;
  hint: string;
}

const MATCH_MODES: BarcodeMatchModeOption[] = [
  { value: BarcodeMatchModeType.Exact, label: "Exact", hint: "Decoded text must equal expected." },
  {
    value: BarcodeMatchModeType.Prefix,
    label: "Prefix",
    hint: "Decoded text must start with expected.",
  },
  {
    value: BarcodeMatchModeType.Contains,
    label: "Contains",
    hint: "Expected must appear in decoded text.",
  },
  {
    value: BarcodeMatchModeType.Regex,
    label: "Regex",
    hint: "Expected is a JS regular expression.",
  },
];

export function BarcodeRuleEditor({ name, params, onChange }: BarcodeRuleEditorProps) {
  const p: BarcodeParams = { ...BARCODE_DEFAULTS, ...params };
  const patch = (next: Partial<BarcodeParams>) => onChange({ ...p, ...next });
  const errors = validateBarcodeParams(p);

  return (
    <section
      aria-label="Barcode rule editor"
      className="flex flex-col gap-hmi-3 border-t border-ca-border bg-ca-panel-2 p-hmi-3"
    >
      <header className="flex items-baseline justify-between">
        <h2 className="text-hmi-header text-ca-ink">Barcode / QR</h2>
        {name ? <span className="text-hmi-caption text-ca-ink-muted">{name}</span> : null}
      </header>

      <label className="flex flex-col gap-hmi-1">
        <span className="text-hmi-body text-ca-ink">Symbology</span>
        <select
          value={p.symbology}
          onChange={(e) => patch({ symbology: e.target.value as BarcodeSymbology })}
          className="border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 text-hmi-body text-ca-ink"
        >
          {BARCODE_SYMBOLOGIES.map((s) => (
            <option key={s} value={s}>
              {SYMBOLOGY_LABEL[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-hmi-1">
        <span className="text-hmi-body text-ca-ink">
          Expected payload{" "}
          <span className="text-hmi-caption text-ca-ink-muted">(empty = accept any decode)</span>
        </span>
        <input
          type="text"
          value={p.expected}
          spellCheck={false}
          onChange={(e) => patch({ expected: e.target.value })}
          className="border border-ca-border bg-ca-bg px-hmi-2 py-hmi-1 font-hmi-mono text-hmi-body text-ca-ink"
          placeholder={p.matchMode === "regex" ? "^LOT-\\d{6}$" : "e.g. LOT-000123"}
        />
      </label>

      <fieldset className="flex flex-col gap-hmi-1">
        <legend className="text-hmi-body text-ca-ink">Match mode</legend>
        <div className="grid grid-cols-2 gap-hmi-1">
          {MATCH_MODES.map((m) => (
            <label
              key={m.value}
              className={`flex cursor-pointer items-center gap-hmi-2 border px-hmi-2 py-hmi-1 text-hmi-body ${
                p.matchMode === m.value
                  ? "border-ca-primary text-ca-ink"
                  : "border-ca-border text-ca-ink-muted"
              }`}
              title={m.hint}
            >
              <input
                type="radio"
                name="barcode-match-mode"
                value={m.value}
                checked={p.matchMode === m.value}
                onChange={() => patch({ matchMode: m.value })}
                className="accent-ca-primary"
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex items-center gap-hmi-2 text-hmi-body text-ca-ink">
        <input
          type="checkbox"
          checked={p.trim}
          onChange={(e) => patch({ trim: e.target.checked })}
          className="accent-ca-primary"
        />
        Trim whitespace before matching
      </label>

      {errors.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-hmi-1 border border-ca-ng bg-ca-bg p-hmi-2">
          {errors.map((e) => (
            <li key={e.code} className="text-hmi-caption text-ca-ng">
              [{e.code}] {e.message}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
