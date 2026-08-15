// Panel resolver, Plan 31 step 17.
// Dispatches on ControllerKind (schema.ts) to render the correct panel with
// per-kind typed params. Consumers (EditorSetupExperience) mount one instance
// and forward the active rule.
//
// PatternEdge (SG-31-01) schema shipped in Plan 32 slice 1 (v3.202.0).
// Slice 2 (v3.204.0) wires the dedicated PatternEdgePanel, so patternEdge no
// longer falls through to the legacy placeholder cluster.
//
// Kinds without a scaffolded panel (presence, absence, ocr, textMatch, math,
// pattern) render an empty placeholder so the resolver stays exhaustive under
// the ControllerKind union. Those panels arrive with future plans.

import { BlobPanel } from "./BlobPanel";
import { ColorPanel } from "./ColorPanel";
import { NumberPanel } from "./NumberPanel";
import { ReferenceAssetPanel } from "./ReferenceAssetPanel";
import { PatternEdgePanel } from "./PatternEdgePanel";
import {
  ControllerKindType,
  type ControllerKind,
  type ControllerParamsByKind,
  type EditorRuleV2,
} from "@/lib/editor/schema";

type Patch<K extends ControllerKind> = Partial<ControllerParamsByKind[K]>;

export interface ControllerPanelProps {
  rule: EditorRuleV2;
  onChange: (patch: Patch<ControllerKind>) => void;
  onUploadAsset?: (file: File) => Promise<string>;
  disabled?: boolean;
}

export function ControllerPanel({ rule, onChange, onUploadAsset, disabled }: ControllerPanelProps) {
  switch (rule.controller) {
    case ControllerKindType.Number:
      return (
        <div data-panel-controller="number">
          <NumberPanel
            value={rule.params as ControllerParamsByKind[ControllerKindType.Number]}
            onChange={onChange as (p: Patch<ControllerKindType.Number>) => void}
            disabled={disabled}
          />
        </div>
      );
    case ControllerKindType.Color:
      return (
        <div data-panel-controller="color">
          <ColorPanel
            value={rule.params as ControllerParamsByKind[ControllerKindType.Color]}
            onChange={onChange as (p: Patch<ControllerKindType.Color>) => void}
            disabled={disabled}
          />
        </div>
      );
    case ControllerKindType.Blob:
      return (
        <div data-panel-controller="blob">
          <BlobPanel
            value={rule.params as ControllerParamsByKind[ControllerKindType.Blob]}
            onChange={onChange as (p: Patch<ControllerKindType.Blob>) => void}
            disabled={disabled}
          />
        </div>
      );
    case ControllerKindType.Pattern:
      return (
        <div data-panel-controller="pattern">
          <ReferenceAssetPanel
            value={rule.params as ControllerParamsByKind[ControllerKindType.Pattern]}
            onChange={onChange as (p: Patch<ControllerKindType.Pattern>) => void}
            onUpload={onUploadAsset ?? (async () => "")}
            disabled={disabled}
          />
        </div>
      );
    case ControllerKindType.PatternEdge:
      return (
        <div data-panel-controller="patternEdge">
          <PatternEdgePanel
            value={rule.params as ControllerParamsByKind[ControllerKindType.PatternEdge]}
            onChange={onChange as (p: Patch<ControllerKindType.PatternEdge>) => void}
            disabled={disabled}
          />
        </div>
      );
    case ControllerKindType.Presence:
    case ControllerKindType.Absence:
    case ControllerKindType.Ocr:
    case ControllerKindType.TextMatch:
    case ControllerKindType.Math:
      return (
        <section
          data-panel-controller={rule.controller}
          aria-label={`${rule.controller} rule (legacy panel)`}
          className="border border-ca-border bg-ca-panel p-hmi-3 text-hmi-body text-ca-ink-muted"
        >
          {rule.controller} panel not yet migrated to panels/ folder.
        </section>
      );
    default: {
      const _exhaustive: never = rule.controller;

      return _exhaustive;
    }
  }
}
