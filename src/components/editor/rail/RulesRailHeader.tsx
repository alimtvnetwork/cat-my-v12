// Compact CAD Toolbar header for the Rules rail. Replaces the old
// duplicate "RULES" title row + "N active layers" IO bar + "Expand all /
// Collapse all" toolbar. Everything collapses into a single 28px dense
// row: monospace layer count on the left, icon-only ⋯ menu on the right
// containing Export / Import / Expand all / Collapse all.
import { useRef } from "react";
import { MoreHorizontal, Download, Upload, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logger } from "@/lib/editor/errors";
import {
  parseRuleSet,
  RuleSetImportError,
  RuleSetMigrationError,
  serializeRuleSet,
} from "@/lib/editor/ruleset-io";
import { broadcastInspectorSections } from "../CollapsibleSection";
import type { EditorRule } from "@/lib/editor/types";
import type { RuleGroup } from "@/lib/editor/store/rules-slice";

export interface RulesRailHeaderProps {
  rules: readonly EditorRule[];
  groups?: readonly RuleGroup[];
  onImport: (rules: EditorRule[], groups: RuleGroup[]) => void;
  onError?: (message: string) => void;
}

export function RulesRailHeader({ rules, groups = [], onImport, onError }: RulesRailHeaderProps): React.JSX.Element | null {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const exportRules = () => {
    const blob = new Blob([serializeRuleSet(rules, groups)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `ruleset-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logger.info("I_UI_RULESET_EXPORTED", { count: rules.length, groups: groups.length });
  };

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      const { rules: importedRules, groups: importedGroups } = parseRuleSet(text);
      onImport(importedRules, importedGroups);
      logger.info("I_UI_RULESET_IMPORTED", {
        count: importedRules.length,
        groups: importedGroups.length,
        name: file.name,
      });
    } catch (err) {
      const message = err instanceof RuleSetImportError ? err.message : (err as Error).message;

      if (err instanceof RuleSetMigrationError) {
        logger.error("E_UI_RULE_MIGRATE_FAIL", {
          name: file.name,
          ruleIndex: err.ruleIndex,
          message,
        });
        onError?.(`Rule set migration failed at rule #${err.ruleIndex}: ${message}`);

        return;
      }

      logger.warn("W_UI_RULESET_IMPORT_FAILED", { name: file.name, message });
      onError?.(`Import failed: ${message}`);
    }
  };

  return (
    <div className="rules-rail-toolbar" role="toolbar" aria-label="Rules toolbar">
      <span className="rules-rail-count" data-testid="rules-rail-count">
        {rules.length} {rules.length === 1 ? "layer" : "layers"}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="rules-rail-menu-trigger"
          aria-label="Rules panel menu"
          title="More actions"
          data-testid="rules-rail-menu-trigger"
        >
          <MoreHorizontal size={14} aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={4} className="min-w-[180px]">
          <DropdownMenuItem onClick={exportRules} data-testid="rules-menu-export">
            <Download size={14} aria-hidden className="mr-hmi-2" />
            Export rule set…
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => inputRef.current?.click()}
            data-testid="rules-menu-import"
          >
            <Upload size={14} aria-hidden className="mr-hmi-2" />
            Import rule set…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => broadcastInspectorSections(true)}
            data-testid="rules-menu-expand-all"
          >
            <ChevronsUpDown size={14} aria-hidden className="mr-hmi-2" />
            Expand all sections
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => broadcastInspectorSections(false)}
            data-testid="rules-menu-collapse-all"
          >
            <ChevronsDownUp size={14} aria-hidden className="mr-hmi-2" />
            Collapse all sections
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";

          if (f) void importFile(f);
        }}
      />
    </div>
  );
}
