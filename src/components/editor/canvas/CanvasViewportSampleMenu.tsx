import React, { useRef } from "react";
import { CanvasViewportPresetType } from "./CanvasViewportConstants";
import { EditorPreviewModeType } from "@/lib/editor/preview-mode-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { EditorPreviewMode } from "@/lib/editor/preview-mode-store";

interface CanvasViewportSampleMenuProps {
  currentSample: { id: string; label: string; url: string };
  sampleId: string;
  applySample: (id: string) => void;
  sampleLibrary: readonly { id: string; label: string; url: string }[];
  customSample: { id: string; label: string; url: string } | null;
  onUploadFile: (file: File) => void;
  captureFromCamera: () => Promise<void>;
  previewMode: EditorPreviewMode;
  peekAll: boolean;
  applyPreviewMode: (mode: EditorPreviewMode) => void;
  setPeekAll: (peekAll: boolean) => void;
  focusSettingsOpen: boolean;
  setFocusSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  focusDim: number;
  focusBlur: number;
  focusIsolate: boolean;
  showThresholds: boolean;
  setShowThresholds: React.Dispatch<React.SetStateAction<boolean>>;
  showResults: boolean;
  setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
  applySpotlightPreset: (preset: CanvasViewportPresetType) => void;
  setFocusDim: React.Dispatch<React.SetStateAction<number>>;
  setFocusBlur: React.Dispatch<React.SetStateAction<number>>;
  setFocusIsolate: React.Dispatch<React.SetStateAction<boolean>>;
  resetSpotlight: () => void;
}

export function CanvasViewportSampleMenu({
  currentSample,
  sampleId,
  applySample,
  sampleLibrary,
  customSample,
  onUploadFile,
  captureFromCamera,
  previewMode,
  peekAll,
  applyPreviewMode,
  setPeekAll,
  focusSettingsOpen,
  setFocusSettingsOpen,
  focusDim,
  focusBlur,
  focusIsolate,
  showThresholds,
  setShowThresholds,
  showResults,
  setShowResults,
  applySpotlightPreset,
  setFocusDim,
  setFocusBlur,
  setFocusIsolate,
  resetSpotlight,
}: CanvasViewportSampleMenuProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className="editor-canvas-hud editor-canvas-sample"
      role="group"
      aria-label="Sample image"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="editor-canvas-zoom-btn editor-canvas-sample-trigger"
            aria-label={`Sample image: ${currentSample.label}`}
            title="Sample image"
          >
            <span className="editor-canvas-sample-name">{currentSample.label}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          className="editor-canvas-menu"
          data-testid="canvas-sample-menu"
        >
          <DropdownMenuRadioGroup value={sampleId} onValueChange={applySample}>
            {sampleLibrary.map((s) => (
              <DropdownMenuRadioItem key={s.id} value={s.id} className="editor-canvas-menu-item">
                {s.label}
              </DropdownMenuRadioItem>
            ))}
            {customSample ? (
              <DropdownMenuRadioItem
                key={customSample.id}
                value={customSample.id}
                className="editor-canvas-menu-item"
              >
                {customSample.label}
              </DropdownMenuRadioItem>
            ) : null}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="editor-canvas-menu-item"
            onSelect={(e) => {
              e.preventDefault();
              fileInputRef.current?.click();
            }}
          >
            Upload image…
          </DropdownMenuItem>
          <DropdownMenuItem
            className="editor-canvas-menu-item"
            onSelect={(e) => {
              e.preventDefault();
              void captureFromCamera();
            }}
          >
            Take photo from camera…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => {
          const f = e.target.files?.[0];

          if (f) onUploadFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => {
          // Cycle preview mode: off -> selection -> all-rules -> off.
          // Also clear the peek override so the choice takes effect.
          const nextMode =
            previewMode === EditorPreviewModeType.Off
              ? EditorPreviewModeType.Selection
              : previewMode === EditorPreviewModeType.Selection
                ? EditorPreviewModeType.AllRules
                : EditorPreviewModeType.Off;
          applyPreviewMode(nextMode);

          if (peekAll) setPeekAll(false);
        }}
        className="editor-canvas-zoom-btn"
        aria-pressed={previewMode !== "off"}
        title="Cycle preview: Off / Selection / All rules"
      >
        {peekAll
          ? "Peek"
          : previewMode === "off"
            ? "Off"
            : previewMode === "all-rules"
              ? "All"
              : "Sel"}
      </button>
      <button
        type="button"
        onClick={() => setFocusSettingsOpen((v) => !v)}
        className="editor-canvas-zoom-btn"
        aria-expanded={focusSettingsOpen}
        aria-label="Focus settings"
        title={`Spotlight settings (dim ${Math.round(focusDim * 100)}%, blur ${focusBlur}px${focusIsolate ? ", isolated" : ""})`}
      >
        {focusIsolate ? "Iso" : `${Math.round(focusDim * 100)} / ${focusBlur}`}
      </button>
      <button
        type="button"
        onClick={() => setShowThresholds((v) => !v)}
        className="editor-canvas-zoom-btn"
        aria-pressed={showThresholds}
        title="Show rule thresholds (min/max radius, edge, similarity)"
      >
        {showThresholds ? "T on" : "T off"}
      </button>
      <button
        type="button"
        onClick={() => setShowResults((v) => !v)}
        className="editor-canvas-zoom-btn"
        aria-pressed={showResults}
        title={showResults ? "Hide Results (PASS/FAIL)" : "Show Results (PASS/FAIL)"}
      >
        {showResults ? "👁️ On" : "👁️ Off"}
      </button>
      {focusSettingsOpen ? (
        <div className="editor-canvas-focus-popover" role="dialog" aria-label="Focus settings">
          <div className="editor-canvas-focus-modes" role="group" aria-label="Preview mode">
            <span className="editor-canvas-focus-modes-label">Preview</span>
            <div className="editor-canvas-focus-modes-btns">
              <button
                type="button"
                className={`editor-canvas-focus-mode-btn${previewMode === "off" ? " is-active" : ""}`}
                aria-pressed={previewMode === "off"}
                onClick={() => applyPreviewMode(EditorPreviewModeType.Off)}
                title="No blur, entire image crisp"
              >
                Off
              </button>
              <button
                type="button"
                className={`editor-canvas-focus-mode-btn${previewMode === "selection" ? " is-active" : ""}`}
                aria-pressed={previewMode === "selection"}
                onClick={() => applyPreviewMode(EditorPreviewModeType.Selection)}
                title="Reveal only the selected rule"
              >
                Selection
              </button>
              <button
                type="button"
                className={`editor-canvas-focus-mode-btn${previewMode === "all-rules" ? " is-active" : ""}`}
                aria-pressed={previewMode === "all-rules"}
                onClick={() => applyPreviewMode(EditorPreviewModeType.AllRules)}
                title="Reveal every rule ROI, blur everything else"
              >
                All rules
              </button>
            </div>
          </div>
          <label className="editor-canvas-focus-row">
            <input
              type="checkbox"
              checked={peekAll}
              onChange={(e) => setPeekAll(e.target.checked)}
            />
            <span>Peek full image (temporarily unblur)</span>
          </label>
          <div
            className="editor-canvas-focus-presets"
            role="group"
            aria-label="Spotlight presets"
          >
            <button
              type="button"
              className="editor-canvas-focus-preset-btn"
              onClick={() => applySpotlightPreset(CanvasViewportPresetType.Subtle)}
              title="Light dim, small blur"
            >
              Subtle
            </button>
            <button
              type="button"
              className="editor-canvas-focus-preset-btn"
              onClick={() => applySpotlightPreset(CanvasViewportPresetType.Standard)}
              title="Balanced dim and blur"
            >
              Standard
            </button>
            <button
              type="button"
              className="editor-canvas-focus-preset-btn"
              onClick={() => applySpotlightPreset(CanvasViewportPresetType.Strong)}
              title="Strong dim and blur"
            >
              Strong
            </button>
          </div>
          <label className="editor-canvas-focus-row">
            <span>Dim outside</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(focusDim * 100)}
              onChange={(e) =>
                setFocusDim(Math.max(0, Math.min(100, Number(e.target.value))) / 100)
              }
              aria-label="Dim outside selection"
              disabled={focusIsolate}
            />
            <span className="editor-canvas-focus-value">{Math.round(focusDim * 100)}%</span>
          </label>
          <label className="editor-canvas-focus-row">
            <span>Blur outside</span>
            <input
              type="range"
              min={0}
              max={16}
              step={1}
              value={focusBlur}
              onChange={(e) => setFocusBlur(Math.max(0, Math.min(16, Number(e.target.value))))}
              aria-label="Blur outside selection"
              disabled={focusIsolate}
            />
            <span className="editor-canvas-focus-value">{focusBlur}px</span>
          </label>
          <label className="editor-canvas-focus-row">
            <input
              type="checkbox"
              checked={focusIsolate}
              onChange={(e) => setFocusIsolate(e.target.checked)}
            />
            <span>Isolate (hide everything outside)</span>
          </label>
          <div className="editor-canvas-focus-actions">
            <button
              type="button"
              className="editor-canvas-focus-reset-btn"
              onClick={resetSpotlight}
              title="Restore default dim and blur"
            >
              Reset
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
