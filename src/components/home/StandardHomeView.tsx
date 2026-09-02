import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import {
  CatalogCategoryIdType,
  type CatalogTool,
  getCategoryById,
  getToolsForCategory,
  getToolById,
  getDefaultToolForCategory,
  StandardCatalogHeader,
  StandardCategoryGrid,
  StandardToolGrid,
  StandardToolDetailPanel,
} from "./standard";

/** Deterministic mapping table for legacy/seed rules without a stored conditions[0].toolType */
const LEGACY_RULE_TOOL_MAP: Record<string, readonly string[]> = {
  "rule-label-presence": ["tool-pattern-presence", "tool-area"],
  "rule-logo-match": ["tool-pattern-presence"],
  "rule-pill-presence": ["tool-area", "tool-pattern-presence"],
  "rule-empty-pocket": ["tool-area"],
  "rule-solder-bridge": ["tool-defect", "tool-blob-presence"],
  "rule-silkscreen-ocr": ["tool-ocr2"],
  "rule-lot-code-ocr": ["tool-ocr2"],
  "rule-pocket-count": ["tool-blob-presence", "tool-edge-pitch"],
  "rule-cap-color": ["tool-intensity"],
  "rule-cap-color-delta": ["tool-intensity"],
  "rule-fill-height": ["tool-edge-position", "tool-profile-position"],
  "rule-ic-placement": ["tool-shapetrax3", "tool-edge-position"],
  "rule-pin1-marker": ["tool-pattern-presence", "tool-shapetrax3"],
  "rule-torque-mark": ["tool-edge-position", "tool-shapetrax3"],
  "rule-yield-ratio": ["tool-functions"],
};

const LEGACY_CATEGORY_TOOL_MAP: Record<string, readonly string[]> = {
  "cat-ocr": ["tool-ocr2"],
  "cat-text": ["tool-ocr2"],
  "cat-presence": ["tool-pattern-presence", "tool-area"],
  "cat-absence": ["tool-area", "tool-blob-presence"],
  "cat-color": ["tool-intensity"],
  "cat-geometry": ["tool-edge-position", "tool-edge-width", "tool-edge-pitch"],
  "cat-math": ["tool-functions", "tool-chain-events"],
  "cat-label": ["tool-pattern-presence", "tool-area"],
  "cat-solder": ["tool-defect", "tool-blob-presence"],
};

export interface StandardHomeViewProps {
  recentProjects?: Array<{ projectId: string; name: string; openedAt: number }>;
}

export function StandardHomeView({
  recentProjects = [],
}: StandardHomeViewProps): React.JSX.Element {
  const navigate = useNavigate();
  const { rules, save } = useRulesLibrary();

  const [activeCategory, setActiveCategory] = useState<CatalogCategoryIdType>(
    CatalogCategoryIdType.PresenceAbsence,
  );

  const activeCategoryObj = useMemo(() => {
    return (
      getCategoryById(activeCategory) ?? getCategoryById(CatalogCategoryIdType.PresenceAbsence)!
    );
  }, [activeCategory]);

  const categoryTools = useMemo(() => {
    return getToolsForCategory(activeCategory);
  }, [activeCategory]);

  const [selectedToolId, setSelectedToolId] = useState<string>(() => {
    return getDefaultToolForCategory(CatalogCategoryIdType.PresenceAbsence)?.id ?? "tool-area";
  });

  const selectedTool = useMemo(() => {
    return (
      getToolById(selectedToolId) ?? categoryTools[0] ?? getDefaultToolForCategory(activeCategory)!
    );
  }, [selectedToolId, categoryTools, activeCategory]);

  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleSelectCategory = useCallback((catId: CatalogCategoryIdType) => {
    setActiveCategory(catId);
    setSearchQuery("");
    const defaultTool = getDefaultToolForCategory(catId);
    if (defaultTool) {
      setSelectedToolId(defaultTool.id);
    }
  }, []);

  const handleSelectTool = useCallback((toolId: string) => {
    setSelectedToolId(toolId);
  }, []);

  // Match rules from shared library to currently selected tool
  const connectedRules = useMemo(() => {
    if (!selectedTool || !rules) return [];
    return rules.filter((r) => {
      if (r.isCategory) return false;

      // 1. Strict canonical match for rules with stored toolType
      const cond = r.conditions?.[0] as { toolType?: string } | undefined;
      if (cond && typeof cond.toolType === "string") {
        return cond.toolType === selectedTool.name || cond.toolType === selectedTool.id;
      }

      // 2. Deterministic lookup for legacy/seed rules without conditions[0].toolType
      const legacyToolIds = LEGACY_RULE_TOOL_MAP[r.id];
      if (legacyToolIds && legacyToolIds.includes(selectedTool.id)) {
        return true;
      }

      if (r.categoryId) {
        const catToolIds = LEGACY_CATEGORY_TOOL_MAP[r.categoryId];
        if (catToolIds && catToolIds.includes(selectedTool.id)) {
          return true;
        }
      }

      return false;
    });
  }, [selectedTool, rules]);

  const handleLaunchTool = useCallback(
    async (tool: CatalogTool, specificRuleId?: string) => {
      // 1. If explicit rule ID provided, open rule editor
      if (specificRuleId) {
        void navigate({
          to: "/setup/rules/$id",
          params: { id: specificRuleId },
        });
        return;
      }

      // 2. If target route is dedicated setup surface (ROI, Reference, Camera, Lighting, Functions)
      if (tool.targetRoute !== "/setup/rules") {
        void navigate({ to: tool.targetRoute as any });
        return;
      }

      // 3. If connected rules exist for this inspection tool, open the first rule
      if (connectedRules.length > 0) {
        const firstRule = connectedRules[0];
        void navigate({
          to: "/setup/rules/$id",
          params: { id: String(firstRule.id) },
        });
        return;
      }

      // 4. Otherwise create a new rule with this tool pre-configured
      try {
        const newId = `rule-${tool.id.replace("tool-", "")}-${Date.now().toString(36).slice(-4)}`;
        const newRuleName = `${tool.name} 01`;
        await save({
          id: newId as any,
          name: newRuleName,
          isCategory: false,
          appliesBefore: [],
          conditions: [
            {
              toolType: tool.name,
            } as any, // Standard mode demo pass-through
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: tool.shortDesc,
        });

        toast.success(`Created inspection rule: ${newRuleName}`);
        void navigate({
          to: "/setup/rules/$id",
          params: { id: newId },
        });
      } catch (err) {
        console.error("Failed to auto-create rule:", err);
        void navigate({ to: "/setup/rules" });
      }
    },
    [connectedRules, navigate, save],
  );

  const handleCreateRuleWithTool = useCallback(
    async (tool: CatalogTool) => {
      try {
        const count = connectedRules.length + 1;
        const newId = `rule-${tool.id.replace("tool-", "")}-${Date.now().toString(36).slice(-4)}`;
        const newRuleName = `${tool.name} ${count < 10 ? `0${count}` : count}`;

        await save({
          id: newId as any,
          name: newRuleName,
          isCategory: false,
          appliesBefore: [],
          conditions: [
            {
              toolType: tool.name,
            } as any, // Standard mode demo pass-through
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: tool.shortDesc,
        });

        toast.success(`Created rule: ${newRuleName}`);
        void navigate({
          to: "/setup/rules/$id",
          params: { id: newId },
        });
      } catch (err) {
        toast.error("Failed to create rule");
        console.error(err);
      }
    },
    [connectedRules.length, navigate, save],
  );

  const handleAutoTeach = useCallback(() => {
    toast.info("Auto-Teach: Initializing golden reference and auto-threshold detection...");
    void navigate({
      to: "/setup/roi" as any,
      search: { project: undefined, ruleset: undefined, rule: undefined } as any,
    });
  }, [navigate]);

  const topProject = recentProjects[0];

  return (
    <StandardAppShell
      activeNav="home"
      title="Tool Catalog"
      subtitle="Industrial Machine-Vision Inspection Launcher"
    >
      <div className="flex-1 flex flex-col min-h-0 bg-ca-bg">
        {/* Compact Industrial Status Header */}
        <StandardCatalogHeader
          activeProjectName={topProject?.name}
          activeProjectId={topProject?.projectId}
        />

        {/* Top Category Strip */}
        <StandardCategoryGrid
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
        />

        {/* Main Workspace: Central Tool Grid + Right Detail Panel */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          <StandardToolGrid
            category={activeCategoryObj}
            tools={categoryTools}
            selectedToolId={selectedTool.id}
            onSelectTool={handleSelectTool}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAutoTeach={handleAutoTeach}
          />

          <StandardToolDetailPanel
            tool={selectedTool}
            category={activeCategoryObj}
            connectedRules={connectedRules}
            onLaunchTool={handleLaunchTool}
            onCreateRuleWithTool={handleCreateRuleWithTool}
          />
        </div>
      </div>
    </StandardAppShell>
  );
}
