import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { StandardAppShell } from "@/components/layout/StandardAppShell";
import { useRulesLibrary } from "@/lib/rules/useRulesLibrary";
import { createDefaultPatternSearchSettings } from "@/domain/vision/pattern-search";
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
  const { rules, save, remove } = useRulesLibrary();

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

    const isGreyscaleTool = selectedTool.id === "tool-greyscale-pattern-matching";

    const matched = rules.filter((r) => {
      if (r.isCategory) return false;

      // 1. Greyscale Pattern Matching (T116) - dedicated, strict matcher
      if (isGreyscaleTool) {
        if (
          r.id === "rule-logo-match" ||
          r.id === "rule-logo-presence" ||
          (r.conditions?.[0] as any)?.type === "defect_match" ||
          (r.conditions?.[0] as any)?.toolType === "Defect Matching" ||
          Boolean((r.conditions?.[0] as any)?.isDefectReject)
        ) {
          return false;
        }

        const cond = r.conditions?.[0] as { toolType?: string; type?: string } | undefined;

        return (
          cond?.type === "pattern_match" ||
          cond?.toolType === "Greyscale Pattern Matching" ||
          cond?.toolType === "tool-greyscale-pattern-matching" ||
          r.id === "rule-greyscale-pattern-01" ||
          r.id.startsWith("rule-greyscale-pattern-match-") ||
          r.name.startsWith("greyscale-pattern-match-") ||
          Boolean((cond as any)?.constellation)
        );
      }

      const isPin1Tool = selectedTool.id === "tool-pin1-config";
      if (isPin1Tool) {
        const cond = r.conditions?.[0] as any;

        return (
          cond?.type === "pin1_config" ||
          cond?.toolType === "Pin 1 Orientation Config" ||
          r.id.startsWith("rule-pin1-") ||
          r.name.toLowerCase().includes("pin 1") ||
          r.name.toLowerCase().includes("pin1") ||
          Boolean(cond?.pin1Config)
        );
      }

      const isDefectMatchingTool = selectedTool.id === "tool-defect-matching";
      if (isDefectMatchingTool) {
        const cond = r.conditions?.[0] as any;

        return (
          cond?.type === "defect_match" ||
          cond?.toolType === "Defect Matching" ||
          cond?.toolType === "tool-defect-matching" ||
          r.id.startsWith("rule-defect-match-") ||
          r.name.startsWith("defect-match-") ||
          r.name.toLowerCase().includes("defect match") ||
          Boolean(cond?.isDefectReject)
        );
      }

      const isSimulationTool = selectedTool.id === "tool-greyscale-simulation";
      if (isSimulationTool) {
        const cond = r.conditions?.[0] as any;

        return (
          cond?.type === "greyscale_simulation" ||
          cond?.toolType === "Greyscle simulation" ||
          cond?.toolType === "tool-greyscale-simulation" ||
          r.id.startsWith("rule-greyscale-simulation-") ||
          r.name.toLowerCase().includes("greyscle simulation") ||
          r.name.toLowerCase().includes("greyscale simulation")
        );
      }

      // 2. Strict canonical match for rules with stored toolType
      const cond = r.conditions?.[0] as { toolType?: string; type?: string } | undefined;

      if (cond && typeof cond.toolType === "string") {
        if (cond.toolType === selectedTool.name || cond.toolType === selectedTool.id) {
          return true;
        }
      }

      // 3. Deterministic lookup for legacy/seed rules without conditions[0].toolType
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

    // For greyscale pattern matching, enforce strictly 1 canonical rule
    if (isGreyscaleTool && matched.length > 1) {
      const canonical =
        matched.find((r) => r.id.startsWith("rule-greyscale-pattern-match-")) ??
        matched.find((r) => r.id === "rule-greyscale-pattern-01") ??
        matched[0];

      return [canonical];
    }

    return matched;
  }, [selectedTool, rules]);

  // Automatically prune any legacy duplicate pattern rules from library
  React.useEffect(() => {
    if (!selectedTool || !rules) return;

    if (selectedTool.id === "tool-greyscale-pattern-matching") {
      const patternRules = rules.filter((r) => {
        const cond = r.conditions?.[0] as any;

        return (
          !r.isCategory &&
          r.id !== "rule-logo-match" &&
          r.id !== "rule-logo-presence" &&
          (cond?.type === "pattern_match" ||
            cond?.toolType === "Greyscale Pattern Matching" ||
            r.id === "rule-greyscale-pattern-01" ||
            r.id.startsWith("rule-greyscale-pattern-match-") ||
            r.id.startsWith("rule-pattern-") ||
            r.id.includes("greyscale-pattern"))
        );
      });

      // Automatically prune any stale or duplicate pattern rules lacking threshold or constellation
      const staleOrDuplicate = rules.filter((r) => {
        const cond = r.conditions?.[0] as any;
        const isPattern =
          !r.isCategory &&
          r.id !== "rule-logo-match" &&
          r.id !== "rule-logo-presence" &&
          (cond?.type === "pattern_match" ||
            cond?.toolType === "Greyscale Pattern Matching" ||
            r.id === "rule-greyscale-pattern-01" ||
            r.id.startsWith("rule-greyscale-pattern-match-") ||
            r.id.startsWith("rule-pattern-") ||
            r.id.includes("greyscale-pattern"));

        if (!isPattern) return false;
        // Stale if missing threshold or missing constellation
        const isMissingConfig = cond?.threshold === undefined || !Array.isArray(cond?.constellation);
        return isMissingConfig;
      });

      for (const stale of staleOrDuplicate) {
        void remove(stale.id).catch(() => {});
      }

      if (patternRules.length > 1) {
        const canonical =
          patternRules.find((r) => r.id.startsWith("rule-greyscale-pattern-match-")) ??
          patternRules.find((r) => r.id === "rule-greyscale-pattern-01") ??
          patternRules[0];
        const duplicates = patternRules.filter((r) => r.id !== canonical.id);

        for (const dup of duplicates) {
          void remove(dup.id).catch(() => {});
        }
      }
    }

    if (selectedTool.id === "tool-pin1-config") {
      const stalePin1 = rules.filter((r) => {
        const cond = r.conditions?.[0] as any;
        const isPin1 =
          !r.isCategory &&
          (cond?.type === "pin1_config" ||
            cond?.toolType === "Pin 1 Orientation Config" ||
            r.id.includes("pin1"));

        if (!isPin1) return false;

        return !cond?.pin1Config?.registeredPin1;
      });

      for (const stale of stalePin1) {
        void remove(stale.id).catch(() => {});
      }
    }
  }, [selectedTool, rules, remove]);

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

      // 4. For pattern tool without existing rule, open white-boxes tool directly
      const isPatternTool = tool.id === "tool-greyscale-pattern-matching";
      if (isPatternTool) {
        void navigate({ to: "/setup/white-boxes" });
        return;
      }

      const isPin1Tool = tool.id === "tool-pin1-config";
      if (isPin1Tool) {
        void navigate({ to: "/setup/pin1" });
        return;
      }

      // 5. Otherwise create a new rule with this tool pre-configured
      try {
        const newId = `rule-${tool.id.replace("tool-", "")}-${Date.now().toString(36).slice(-4)}`;
        const newRuleName = `${tool.name} 01`;

        const conditionPayload = {
          toolType: tool.name,
        } as any;

        await save({
          id: newId as any,
          name: newRuleName,
          isCategory: false,
          appliesBefore: [],
          conditions: [conditionPayload as any],
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
      if (tool.id === "tool-greyscale-pattern-matching") {
        void navigate({ to: "/setup/white-boxes" });
        return;
      }

      if (tool.id === "tool-pin1-config") {
        void navigate({ to: "/setup/pin1" });
        return;
      }

      if (tool.id === "tool-defect-matching") {
        void navigate({ to: "/setup/defect-matching" });
        return;
      }

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
