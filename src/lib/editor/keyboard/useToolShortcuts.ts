import { ClientLogger } from "@/lib/observability/client-logger";
import { ToolIdType } from "@/components/rules/tools/toolTooltipMap";
// Plan 100 step 37. Consolidate the route-scoped tool hotkey registration
// used by the RuleEditor so the editor component holds only composition
// and the shortcut wiring is testable in isolation.
//
// Root cause context: RuleEditor previously inlined a `useEffect` that
// registered TOOL_TOOLTIPS entries under `route:rules`. Keeping that
// inline made the editor route responsible for keyboard concerns and
// forced future edits (extra tools, group changes) to touch the render
// tree. This hook is the single seam.

import { useEffect } from "react";
import { TOOL_TOOLTIPS, type ToolId } from "@/components/rules/tools/toolTooltipMap";
import { registerShortcut } from "@/lib/shortcuts/registry";
import type { ShortcutScopeType } from "@/lib/shortcuts/scopes";

export interface UseToolShortcutsOptions {
  onSelect: (tool: ToolId) => void;
  onVariantSelect?: (tool: ToolId, variantId: string) => void;
  scope?: ShortcutScopeType;
}

const TEXT_TOOL_ALIASES = [
  { combo: "O", label: "OCR", variantId: "textTools.ocr" },
  { combo: "T", label: "Text", variantId: "textTools.text" },
  { combo: "E", label: "Math", variantId: "textTools.math" },
] as const;

export function useToolShortcuts({
  onSelect,
  onVariantSelect,
  scope = "route:rules",
}: UseToolShortcutsOptions): void {
  useEffect(() => {
    const toolUnsubs = (Object.keys(TOOL_TOOLTIPS) as ToolId[])
      .filter((toolId) => toolId !== "textTools")
      .map((toolId) => {
        const tip = TOOL_TOOLTIPS[toolId];

        return registerShortcut({
          id: `editor.tool.${toolId}`,
          scope,
          combo: tip.hotkey.toUpperCase(),
          label: `Tool: ${tip.title}`,
          group: "Editor",
          run: () => {
            try {
              onSelect(toolId);
            } catch (err) {
              // Surface, do not swallow: keyboard-triggered tool switches
              // are user-facing and a silent failure would look like a
              // dead hotkey.
              ClientLogger.error("[useToolShortcuts] tool select failed", {
                toolId,
                err,
              });
            }
          },
        });
      });
    const textUnsubs = TEXT_TOOL_ALIASES.map((alias) =>
      registerShortcut({
        id: `editor.tool.textTools.${alias.combo.toLowerCase()}`,
        scope,
        combo: alias.combo,
        label: `Tool: ${alias.label}`,
        group: "Editor",
        run: () => {
          try {
            onVariantSelect?.(ToolIdType.Texttools, alias.variantId);
            onSelect(ToolIdType.Texttools);
          } catch (err) {
            ClientLogger.error("[useToolShortcuts] text tool select failed", {
              variantId: alias.variantId,
              err,
            });
          }
        },
      }),
    );
    const unsubs = [...toolUnsubs, ...textUnsubs];

    return () => {
      for (const u of unsubs) u();
    };
  }, [onSelect, onVariantSelect, scope]);
}
