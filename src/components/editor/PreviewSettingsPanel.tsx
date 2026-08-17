import { EditorPreviewModeType } from "@/lib/editor/preview-mode-store";
// Preview settings block shown at the top of the right-hand inspector.
// Mirrors the HUD focus popover so the operator can control preview
// visualization from either place:
//   - Preview mode: Off / Selection / All rules
//   - Peek full image: transient override that unblurs everything
//
// The state lives in preview-mode-store so both the canvas overlay HUD
// and this panel stay in sync without prop drilling.
import { useEffect, useState } from "react";
import {
  getPreviewState,
  setPreviewMode,
  setPeekAll,
  setDebugOverlay,
  subscribe as subscribePreview,
  type EditorPreviewMode,
} from "@/lib/editor/preview-mode-store";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { editorKindLabel } from "@/lib/editor/tools";
import { logger } from "@/lib/editor/errors";

interface PreviewModeOption {
  value: EditorPreviewModeType;
  label: string;
  hint: string;
}

const MODES: PreviewModeOption[] = [
  { value: EditorPreviewModeType.Off, label: "Off", hint: "Show entire image crisp" },
  { value: EditorPreviewModeType.Selection, label: "Selection", hint: "Reveal selected rule only" },
  { value: EditorPreviewModeType.AllRules, label: "All rules", hint: "Reveal every rule ROI" },
];

export function PreviewSettingsPanel(): React.JSX.Element | null {
  const [state, setState] = useState(() => getPreviewState());
  useEffect(() => subscribePreview(setState), []);
  // Show which rule "Selection" mode will spotlight, so the label is
  // never opaque. Subscribes to the same commit boundary the canvas uses.
  const selectedRule = useRulesStore((s) => {
    const id = s.selectedIds[0];

    return id ? (s.rules.find((r) => r.id === id) ?? null) : null;
  });
  // Hotkey `P` cycles Off -> Selection -> All rules -> Off. Guarded against
  // typing targets so it never fires while the operator is renaming a rule.
  useEffect(() => {
    const isTyping = (t: EventTarget | null): boolean => {
      const el = t as HTMLElement | null;

      if (!el || !el.tagName) return false;
      const tag = el.tagName.toLowerCase();

      return (
        tag === "input" || tag === "textarea" || tag === "select" || el.isContentEditable === true
      );
    };
    const order: EditorPreviewMode[] = [
      EditorPreviewModeType.Off,
      EditorPreviewModeType.Selection,
      EditorPreviewModeType.AllRules,
    ];
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      switch (e.key) {
        case KeyboardKeyType.P:
        case KeyboardKeyType.PUpper: {
          if (isTyping(e.target)) return;
          const current = getPreviewState().mode;
          const idx = order.indexOf(current);
          const next = order[(idx + 1) % order.length];
          e.preventDefault();
          logger.info("I_UI_PREVIEW_HOTKEY", { from: current, to: next });
          setPreviewMode(next);
          break;
        }
      }
    };
    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="editor-preview-settings" role="region" aria-label="Preview settings">
      <header className="editor-preview-settings-head">
        <span className="editor-preview-settings-title">Preview</span>
        <span className="editor-preview-settings-hint">
          Controls how rule ROIs highlight during validation
        </span>
      </header>
      <div
        className="editor-preview-settings-selection text-hmi-caption text-ca-ink-muted"
        aria-live="polite"
        data-testid="preview-selection-label"
      >
        {selectedRule ? (
          <>
            Selection: <span className="text-ca-ink">{selectedRule.name}</span>{" "}
            <span aria-hidden>({editorKindLabel(selectedRule.kind)})</span>
          </>
        ) : (
          <span>No rule selected</span>
        )}
      </div>
      <div className="editor-preview-settings-modes" role="group" aria-label="Preview mode">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            className={`editor-preview-settings-mode${state.mode === m.value ? " is-active" : ""}`}
            aria-pressed={state.mode === m.value}
            title={`${m.hint} (press P to cycle)`}
            onClick={() => setPreviewMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>
      <label className="editor-preview-settings-peek">
        <input
          type="checkbox"
          checked={state.peekAll}
          onChange={(e) => setPeekAll(e.target.checked)}
        />
        <span>Peek full image</span>
        <span className="editor-preview-settings-peek-hint">Temporarily disable blur</span>
      </label>
      <label className="editor-preview-settings-peek">
        <input
          type="checkbox"
          checked={state.debugOverlay}
          onChange={(e) => setDebugOverlay(e.target.checked)}
        />
        <span>Debug overlay</span>
        <span className="editor-preview-settings-peek-hint">
          Show mask alpha, spotlight clip, effective ROI
        </span>
      </label>
    </section>
  );
}
