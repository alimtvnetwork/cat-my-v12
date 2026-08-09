import { Circle, Square, ScanText, Type, Sigma, type LucideIcon } from "lucide-react";
import type { EditorRuleKind } from "./types";

// Vibrant per-kind identity. Used by ToolRibbon chips and RuleRow badges so
// the rail and canvas share the same visual key per rule kind.
export const KIND_ICON: Record<EditorRuleKind, LucideIcon> = {
  C: Circle,
  R: Square,
  K: ScanText,
  S: Type,
  E: Sigma,
};

export const KIND_COLOR: Record<EditorRuleKind, string> = {
  C: "oklch(0.68 0.24 300)",
  R: "oklch(0.70 0.26 330)",
  K: "oklch(0.78 0.18 195)",
  S: "oklch(0.82 0.17 82)",
  E: "oklch(0.76 0.20 155)",
};
