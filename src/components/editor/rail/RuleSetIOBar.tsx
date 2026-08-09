import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { logger } from "@/lib/editor/errors";
import {
  parseRuleSet,
  RuleSetImportError,
  RuleSetMigrationError,
  serializeRuleSet,
} from "@/lib/editor/ruleset-io";
import type { EditorRule } from "@/lib/editor/types";
import type { RuleGroup } from "@/lib/editor/store/rules-slice";

export interface RuleSetIOBarProps {
  rules: readonly EditorRule[];
  groups?: readonly RuleGroup[];
  onImport: (rules: EditorRule[], groups: RuleGroup[]) => void;
  onError?: (message: string) => void;
}

export function RuleSetIOBar({ rules, groups = [], onImport, onError }: RuleSetIOBarProps) {
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

  const openPicker = () => inputRef.current?.click();

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
        // Coded, surfaced, structured. Missing this log = the bug (03-error-manage.md).
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
    <div className="editor-ruleset-bar">
      <span className="min-w-0 truncate text-hmi-body font-bold text-ca-ink-muted">
        {rules.length} active layer{rules.length === 1 ? "" : "s"}
      </span>
      <button type="button" onClick={exportRules} className="editor-ruleset-button">
        <Download aria-hidden size={16} /> Export
      </button>
      <button type="button" onClick={openPicker} className="editor-ruleset-button">
        <Upload aria-hidden size={16} /> Import
      </button>
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
