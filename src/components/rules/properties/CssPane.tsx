// Plan 80 step 22. CSS pane as read-only export view of the selected ROI's
// generated styles. Derived from useRulesStore + KIND_COLOR so what the
// operator copies matches what they see on canvas.
import { useState } from "react";
import { PaneShell } from "./paneShell";
import { PalettePlaceholder } from "../PropertiesPalette";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { KIND_COLOR } from "@/lib/editor/kind-icons";

export function CssPane() {
  const rule = useRulesStore((s) => {
    const id = s.selectedIds[0];

    return id ? (s.rules.find((r) => r.id === id) ?? null) : null;
  });
  const [copied, setCopied] = useState(false);

  if (!rule) {
    // Plan 100 Phase E step 50: adopt shared PalettePlaceholder so the
    // CSS pane no longer renders a bespoke "/* No selection */" swatch
    // when there is no ROI to export. Keeps the palette body honest.
    return (
      <PaneShell>
        <PalettePlaceholder hint="Select an ROI on the canvas to copy its generated CSS." />
      </PaneShell>
    );
  }

  const styles: Record<string, string> = {
    position: "absolute",
    left: `${Math.round(rule.x)}px`,
    top: `${Math.round(rule.y)}px`,
    width: `${Math.round(rule.width)}px`,
    height: `${Math.round(rule.height)}px`,
    transform: `rotate(${(rule.rotation ?? 0).toFixed(2)}deg)`,
    "border-color": KIND_COLOR[rule.kind],
    "border-radius": rule.kind === "C" ? "9999px" : "var(--radius-md)",
    "background-color": "var(--ca-panel-2)",
    "box-shadow": "var(--shadow-hmi-popover)",
  };

  const header = `/* ${rule.name} - ${rule.kind} */`;
  const text = [header, ...Object.entries(styles).map(([k, v]) => `${k}: ${v};`)].join("\n");

  return (
    <PaneShell>
      <pre className="ca-focus-fluid max-h-40 overflow-auto rounded-sm border border-ca-border bg-ca-panel-2/70 p-hmi-2 font-mono text-[11px] leading-relaxed text-ca-ink">
        {text}
      </pre>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard
            ?.writeText(text)
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            })
            .catch(() => setCopied(false));
        }}
        className="ca-focus-fluid self-start rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-0.5 text-[11px] hover:bg-ca-panel"
      >
        {copied ? "Copied" : "Copy CSS"}
      </button>
    </PaneShell>
  );
}
