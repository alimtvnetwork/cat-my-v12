import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, notFound, useNavigate, useRouter } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  CopyPlus,
  Cpu,
  Image as ImageIcon,
  Layers,
  Loader2,
  MinusCircle,
  Play,
  Plus,
  ScanSearch,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { useProjectStore, selectProject, selectRulesetsForProject } from "@/lib/projects/store";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { runRuleset, useTrialStore } from "@/lib/projects/trials";
import { notifySuccess, notifyWarning } from "@/lib/notify";
import { toIntParam, IntAliasNamespaceType } from "@/lib/ids/int-alias";
import { VISION_TOOL_CATALOG } from "@/lib/vision/tool-catalog";
import type { EditorRule } from "@/lib/editor/types";
import { useSitemapStateCacheStore } from "@/lib/stores/sitemap-state-cache-store";

export const Route = createFileRoute("/projects/$projectId/rulesets/")({
  component: RulesetsList,
  errorComponent: RulesetsError,
  notFoundComponent: RulesetsNotFound,
});

function getEstimatedLatencyMs(toolCode: string): number {
  switch (toolCode) {
    case "T101":
      return 3.2;
    case "T105":
      return 4.8;
    case "T102":
      return 8.5;
    case "T104":
      return 3.8;
    case "T109":
      return 6.2;
    case "T108":
      return 5.5;
    case "T107":
      return 7.0;
    case "T110":
      return 4.2;
    case "T111":
      return 4.5;
    case "T103":
      return 13.5;
    case "T106":
      return 16.0;
    default:
      return 5.0;
  }
}

function getToolBadgeColor(toolCode: string): { bg: string; border: string; text: string } {
  if (toolCode === "T102" || toolCode === "T105" || toolCode === "T101" || toolCode === "T104") {
    return { bg: "bg-cyan-500/10", border: "border-cyan-400/30", text: "text-cyan-300" };
  }

  if (toolCode === "T109" || toolCode === "T108" || toolCode === "T107") {
    return { bg: "bg-amber-500/10", border: "border-amber-400/30", text: "text-amber-300" };
  }

  if (toolCode === "T110" || toolCode === "T111") {
    return { bg: "bg-emerald-500/10", border: "border-emerald-400/30", text: "text-emerald-300" };
  }

  if (toolCode === "T103" || toolCode === "T106") {
    return { bg: "bg-purple-500/10", border: "border-purple-400/30", text: "text-purple-300" };
  }

  return { bg: "bg-blue-500/10", border: "border-blue-400/30", text: "text-blue-300" };
}

function RulesetsList() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const project = useProjectStore((s) => selectProject(s, projectId));
  const rulesets = useProjectStore((s) => selectRulesetsForProject(s, projectId));
  const deleteRuleset = useProjectStore((s) => s.deleteRuleset);
  const cloneRuleset = useProjectStore((s) => s.cloneRuleset);
  const createRuleset = useProjectStore((s) => s.createRuleset);
  const updateRulesetRules = useProjectStore((s) => s.updateRulesetRules);
  const updateRulesetCategory = useProjectStore((s) => s.updateRulesetCategory);
  const runsByRuleset = useTrialStore((s) => s.runsByRuleset);

  const currentPathname = typeof window !== "undefined" ? window.location.pathname : "";
  const cachedSnapshot = useSitemapStateCacheStore((s) => s.snapshots[currentPathname]);
  const saveSnapshot = useSitemapStateCacheStore((s) => s.saveSnapshot);

  const [searchQuery, setSearchQuery] = useState(cachedSnapshot?.searchQuery ?? "");

  useEffect(() => {
    if (!currentPathname || !project) return;

    saveSnapshot({
      pathname: currentPathname,
      search: window.location.search,
      searchParams: {},
      title: `Inspection Rulesets · ${project.name}`,
      searchQuery,
      filterType: "ALL",
    });
  }, [currentPathname, project, searchQuery, saveSnapshot]);

  const totalRulesAcrossAllRulesets = useMemo(() => {
    return rulesets.reduce((sum, r) => sum + r.rules.length, 0);
  }, [rulesets]);

  const rulesetsWithAlignmentCount = useMemo(() => {
    return rulesets.filter((r) =>
      r.rules.some((rule) => {
        const code = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "";
        const name = rule.name.toLowerCase();

        return (
          code === "T105" ||
          code === "T102" ||
          name.includes("pin 1") ||
          name.includes("pin1") ||
          name.includes("pattern")
        );
      }),
    ).length;
  }, [rulesets]);

  const aggregateCycleTimeMs = useMemo(() => {
    if (rulesets.length === 0) return 12.0;

    let totalSum = 0;
    let counted = 0;

    for (const r of rulesets) {
      if (r.rules.length > 0) {
        const latency =
          4.5 +
          r.rules
            .filter((x) => !x.isHidden)
            .reduce((s, x) => s + getEstimatedLatencyMs(x.params?.toolCode || ""), 0);
        totalSum += latency;
        counted++;
      }
    }

    if (counted === 0) return 12.0;

    return totalSum / counted;
  }, [rulesets]);

  const aggregateFps = useMemo(() => {
    return Math.min(120, Math.round(1000 / Math.max(1, aggregateCycleTimeMs)));
  }, [aggregateCycleTimeMs]);

  const trialVerdicts = useMemo(() => {
    let passCount = 0;
    let failCount = 0;

    for (const r of rulesets) {
      const runs = runsByRuleset[r.id] ?? [];
      const latest = runs[0];

      if (latest) {
        if (latest.verdict === "OK") passCount++;
        else if (latest.verdict === "NG") failCount++;
      }
    }

    return { passCount, failCount };
  }, [rulesets, runsByRuleset]);

  const filteredRulesets = useMemo(() => {
    const trimmed = searchQuery.trim();

    if (!trimmed) return rulesets;

    const q = trimmed.toLowerCase();

    return rulesets.filter((r) => {
      const hasNameMatch = r.name.toLowerCase().includes(q);
      const hasCategoryMatch = Boolean(r.categoryName && r.categoryName.toLowerCase().includes(q));
      const hasIdMatch = r.id.toLowerCase().includes(q);
      const hasRuleMatch = r.rules.some((rule) => {
        const code = typeof rule.params?.toolCode === "string" ? rule.params.toolCode.toLowerCase() : "";

        return rule.name.toLowerCase().includes(q) || code.includes(q);
      });

      return hasNameMatch || hasCategoryMatch || hasIdMatch || hasRuleMatch;
    });
  }, [rulesets, searchQuery]);

  const handleDuplicate = useCallback(
    (sourceId: string, name: string) => {
      const newId = cloneRuleset(projectId, sourceId, `${name} (Copy)`, "snapshot");
      notifySuccess(`Duplicated program: ${name}`);
      void navigate({
        to: "/projects/$projectId/rulesets/$rulesetId",
        params: {
          projectId,
          rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, newId),
        },
      });
    },
    [cloneRuleset, navigate, projectId],
  );

  const handleCreatePreset = useCallback(
    (presetKey: "carrier-tape" | "solder-flaw" | "wafer-ocr") => {
      let programName = "";
      let categoryName = "";
      let toolCodes: string[] = [];

      if (presetKey === "carrier-tape") {
        programName = "Carrier Tape Strip Metrology";
        categoryName = "Surface Metrology & Alignment";
        toolCodes = ["T105", "T102", "T110"];
      } else if (presetKey === "solder-flaw") {
        programName = "SMT Solder Joint & Flaw Quality";
        categoryName = "Flaw Detection";
        toolCodes = ["T101", "T109", "T107"];
      } else {
        programName = "Wafer & Lot Identification OCR";
        categoryName = "ID / OCR";
        toolCodes = ["T103", "T106"];
      }

      const newRid = createRuleset(projectId, programName);
      updateRulesetCategory(newRid, categoryName);

      const presetRules: EditorRule[] = toolCodes.map((code, idx) => {
        const def = VISION_TOOL_CATALOG.find((t) => t.code === code) || VISION_TOOL_CATALOG[0];

        return {
          id: `r-preset-${Date.now()}-${idx}`,
          name: def.name,
          kind: def.kind,
          family: def.family,
          isHidden: false,
          isLocked: false,
          x: 100 + idx * 30,
          y: 100 + idx * 30,
          width: 180,
          height: 180,
          cameraSettings: {
            exposureUs: Math.round(def.defaultExposureMs * 1000),
            gainDb: def.defaultGainDb,
            whiteBalanceKelvin: 5000,
            gamma: 1.0,
          },
          lightSettings: {
            channel: def.defaultChannels[0] || 1,
            intensity: def.defaultLightPct,
            strobeDurationUs: def.defaultStrobeUs,
            hasStrobe: true,
          },
          params: {
            ...def.defaultParamValues,
            toolCode: def.code,
          },
        };
      });

      updateRulesetRules(newRid, presetRules);
      notifySuccess(`Initialized preset program: ${programName}`);
      void navigate({
        to: "/projects/$projectId/rulesets/$rulesetId",
        params: {
          projectId,
          rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, newRid),
        },
      });
    },
    [createRuleset, navigate, projectId, updateRulesetCategory, updateRulesetRules],
  );

  if (!project) {
    if (typeof window === "undefined") {
      return null;
    }

    console.warn("[projects/$projectId/rulesets] project not found", { projectId });

    return <RulesetsNotFound />;
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[#05070c] p-4 font-sans text-ca-ink antialiased selection:bg-cyan-500/20 lg:p-6">
      {/* Cybernetic ambient backdrop lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-cyan-600/10 blur-[130px]" />
        <div className="absolute right-12 top-60 h-80 w-80 rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-emerald-600/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-3.5">
        {/* Compact Hero Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] via-white/[0.02] to-black/70 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-white/40">
              <Link to="/projects" className="transition hover:text-white/80">
                Projects
              </Link>
              <ChevronRight size={11} />
              <Link
                to="/projects/$projectId"
                params={{ projectId }}
                className="transition hover:text-white/80"
              >
                {project.name}
              </Link>
              <ChevronRight size={11} />
              <span className="font-semibold text-white/90">Inspection Rulesets</span>
            </div>

            <div className="mt-1 flex items-center">
              <h1 className="font-display text-lg font-bold tracking-tight text-white">
                Inspection Rulesets & Programs
              </h1>
            </div>

            <p className="mt-0.5 text-xs text-white/50">
              Industrial computer vision programs, multi-pocket carrier tape inspection, and optical metrology recipes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Initialize New Program */}
            <Link
              to="/projects/$projectId/rulesets/new"
              params={{ projectId }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 transition-colors hover:border-cyan-400 hover:bg-cyan-500/20 hover:text-white active:scale-95 focus-visible:outline-none"
            >
              <Plus size={14} />
              <span>New Ruleset</span>
            </Link>
          </div>
        </div>

        {/* Industrial Telemetry HUD (4 Cards) */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Enrolled Programs & Instruments */}
          <div className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/50 p-3 shadow-md backdrop-blur-md transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                Inspection Programs
              </span>
              <span className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-1 text-cyan-300">
                <Layers size={14} />
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-xl font-bold text-white">{rulesets.length}</span>
              <span className="text-xs text-white/50">
                {totalRulesAcrossAllRulesets} Instruments enrolled
              </span>
            </div>
            <div className="mt-1 text-[10px] text-white/40">
              Configured multi-pocket inspection suites
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-cyan-400/25 transition-all duration-200 group-hover:bg-cyan-400 group-hover:shadow-[0_0_10px_#22d3ee]" />
          </div>

          {/* Card 2: Pocket & Pin 1 Alignment Readiness */}
          <div className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/50 p-3 shadow-md backdrop-blur-md transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                Pocket Alignment
              </span>
              <span
                className={`rounded-lg p-1 ${
                  rulesetsWithAlignmentCount > 0
                    ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    : "border border-amber-400/30 bg-amber-500/10 text-amber-300"
                }`}
              >
                {rulesetsWithAlignmentCount > 0 ? <CircleDot size={14} /> : <AlertTriangle size={14} />}
              </span>
            </div>
            <div className="mt-1">
              <div
                className={`text-[11px] font-bold uppercase tracking-wide ${
                  rulesetsWithAlignmentCount > 0 ? "text-emerald-300" : "text-amber-300"
                }`}
              >
                {rulesetsWithAlignmentCount > 0 ? "ALIGNMENT LOCKED" : "ALIGNMENT PENDING"}
              </div>
              <div className="mt-0.5 font-mono text-xs font-semibold text-white">
                {rulesetsWithAlignmentCount} / {rulesets.length} Programs Aligned
              </div>
            </div>
            <div className="mt-1 text-[10px] text-white/40">
              Pin 1 & pattern anchor tracking enabled
            </div>
            <div
              className={`absolute inset-x-0 bottom-0 h-0.5 transition-all duration-200 ${
                rulesetsWithAlignmentCount > 0
                  ? "bg-emerald-400/25 group-hover:bg-emerald-400 group-hover:shadow-[0_0_10px_#34d399]"
                  : "bg-amber-400/25 group-hover:bg-amber-400 group-hover:shadow-[0_0_10px_#fbbf24]"
              }`}
            />
          </div>

          {/* Card 3: Metrology Cycle Latency */}
          <div className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/50 p-3 shadow-md backdrop-blur-md transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                Metrology Latency
              </span>
              <span className="rounded-lg border border-sky-400/30 bg-sky-500/10 p-1 text-sky-300">
                <Clock size={14} />
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-xl font-bold text-white">
                ~{aggregateCycleTimeMs.toFixed(1)}
              </span>
              <span className="font-mono text-xs text-white/50">ms / part avg</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-mono text-sky-300">
              <Cpu size={11} />
              <span>HIGH SPEED (~{aggregateFps} FPS Line Throughput)</span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-400/25 transition-all duration-200 group-hover:bg-sky-400 group-hover:shadow-[0_0_10px_#38bdf8]" />
          </div>

          {/* Card 4: Trial & Validation Health */}
          <div className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-black/50 p-3 shadow-md backdrop-blur-md transition-all duration-200 hover:border-white/15 hover:bg-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                Validation Verdicts
              </span>
              <span className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 p-1 text-indigo-300">
                <Activity size={14} />
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-xl font-bold text-emerald-400">
                {trialVerdicts.passCount} PASS
              </span>
              {trialVerdicts.failCount > 0 ? (
                <span className="font-mono text-xs text-rose-400">
                  · {trialVerdicts.failCount} NG
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-[10px] text-white/40">
              Inline trial validation run history
            </div>
            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-400/25 transition-all duration-200 group-hover:bg-indigo-400 group-hover:shadow-[0_0_10px_#818cf8]" />
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 p-2 shadow-inner backdrop-blur-md">
          {/* Search Box */}
          <div className="relative w-full">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search programs by name, rule code, or ID..."
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-8 font-mono text-xs text-white placeholder-white/40 transition focus:border-cyan-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>

        {/* Rulesets List / Empty State */}
        {rulesets.length === 0 ? (
          /* Empty State: Cybernetic Blueprint Quick-Enroll Station */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
              <ScanSearch size={32} />
            </div>
            <h2 className="text-base font-bold text-white">No Inspection Rulesets Configured</h2>
            <p className="mt-1.5 max-w-md text-xs text-white/60">
              Initialize your project with one of our high-speed industrial inspection recipe
              templates below, or author a custom blank program:
            </p>

            {/* 3 Preset Recipes */}
            <div className="mt-6 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
              {/* Carrier Tape Metrology */}
              <div className="flex flex-col justify-between rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-4 text-left transition hover:border-cyan-400/60 hover:bg-cyan-500/10">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-300">
                    <CircleDot size={15} />
                    <span>IC Carrier Tape Strip</span>
                  </div>
                  <p className="mt-1.5 text-xs text-white/60">
                    Preconfigured with T105 Pin 1 Orientation, T102 Pattern Matching, and T110 Lead
                    Pitch Caliper metrology.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCreatePreset("carrier-tape")}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/30 active:scale-95"
                >
                  <Plus size={13} />
                  Quick Initialize Preset
                </button>
              </div>

              {/* Solder Joint Quality */}
              <div className="flex flex-col justify-between rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 text-left transition hover:border-amber-400/60 hover:bg-amber-500/10">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-300">
                    <AlertTriangle size={15} />
                    <span>SMT Solder Joint & Flaws</span>
                  </div>
                  <p className="mt-1.5 text-xs text-white/60">
                    Preconfigured with T101 Area Gate, T109 Solder Bridge Blob, and T107 Scratch &
                    Crack defect inspection.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCreatePreset("solder-flaw")}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30 active:scale-95"
                >
                  <Plus size={13} />
                  Quick Initialize Preset
                </button>
              </div>

              {/* Wafer Lot OCR */}
              <div className="flex flex-col justify-between rounded-xl border border-purple-400/30 bg-purple-500/5 p-4 text-left transition hover:border-purple-400/60 hover:bg-purple-500/10">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-purple-300">
                    <ScanSearch size={15} />
                    <span>Wafer & Lot Traceability</span>
                  </div>
                  <p className="mt-1.5 text-xs text-white/60">
                    Preconfigured with T103 2D ECC200 DataMatrix decoder and T106 Laser Marking OCR
                    character recognition.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCreatePreset("wafer-ocr")}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-400/40 bg-purple-500/20 px-3 py-1.5 text-xs font-bold text-purple-200 transition hover:bg-purple-500/30 active:scale-95"
                >
                  <Plus size={13} />
                  Quick Initialize Preset
                </button>
              </div>
            </div>

            {/* Custom Blank Button */}
            <Link
              to="/projects/$projectId/rulesets/new"
              params={{ projectId }}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/20 px-5 py-2 text-xs font-bold uppercase tracking-wider text-white transition hover:border-cyan-400 hover:bg-white/10"
            >
              <Plus size={14} />
              Author Blank Ruleset
            </Link>
          </div>
        ) : filteredRulesets.length === 0 ? (
          /* Empty Search Results */
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 p-8 text-center shadow-inner backdrop-blur-md">
            <Search size={28} className="text-white/30" />
            <h3 className="mt-3 text-sm font-bold text-white">No Matching Ruleset Programs</h3>
            <p className="mt-1 text-xs text-white/50">
              No programs match &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
              }}
              className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.08]"
            >
              Clear Search
            </button>
          </div>
        ) : (
          /* Rich Program Cards Grid */
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRulesets.map((r) => {
              const hasAnchor = r.rules.some((rule) => {
                const code = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "";
                const name = rule.name.toLowerCase();

                return (
                  code === "T105" ||
                  code === "T102" ||
                  name.includes("pin 1") ||
                  name.includes("pin1") ||
                  name.includes("pattern")
                );
              });

              const activeRuleCount = r.rules.filter((rule) => !rule.isHidden).length;
              const estLatencyMs =
                4.5 +
                r.rules
                  .filter((x) => !x.isHidden)
                  .reduce((sum, x) => sum + getEstimatedLatencyMs(x.params?.toolCode || ""), 0);

              return (
                <li
                  key={r.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] via-white/[0.01] to-black/60 shadow-[0_4px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition-all duration-200 hover:border-cyan-400/50 hover:shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(6,182,212,0.15)]"
                >
                  {/* Main Card Body */}
                  <div className="flex flex-1 flex-col p-5">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 shadow-sm">
                          <ScanSearch size={18} />
                        </span>
                        <div>
                          <Link
                            to="/projects/$projectId/rulesets/$rulesetId"
                            params={{
                              projectId,
                              rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, r.id),
                            }}
                            className="block font-sans text-base font-bold text-white transition hover:text-cyan-300 focus-visible:outline-none"
                          >
                            {r.name}
                          </Link>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/50">
                            <span>{r.categoryName || "Surface Metrology"}</span>
                            <span>·</span>
                            <span className="font-mono text-[10px] text-white/40">#{r.id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions: Duplicate & Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDuplicate(r.id, r.name)}
                          className="rounded-lg border border-white/5 bg-white/[0.02] p-1.5 text-white/40 shadow-sm transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                          title="Duplicate Program"
                        >
                          <CopyPlus size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const isConfirmed = window.confirm(
                              `Delete ruleset "${r.name}"? This removes its rules from this project.`,
                            );

                            if (!isConfirmed) return;

                            deleteRuleset(r.id);
                            notifySuccess(`Ruleset "${r.name}" deleted.`);
                          }}
                          className="rounded-lg border border-white/5 bg-white/[0.02] p-1.5 text-white/40 shadow-sm transition hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400"
                          title="Delete Program"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Enrolled Instruments Preview Chips */}
                    <div className="mt-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                        Configured Vision Pipeline ({r.rules.length} Tools)
                      </div>
                      {r.rules.length === 0 ? (
                        <p className="mt-1.5 text-xs text-white/40 italic">
                          No tools enrolled yet — click configure to initialize instruments.
                        </p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {r.rules.slice(0, 4).map((rule) => {
                            const code =
                              typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "Rule";
                            const color = getToolBadgeColor(code);

                            return (
                              <span
                                key={rule.id}
                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${color.bg} ${color.border} ${color.text}`}
                              >
                                <span>{code}</span>
                                <span className="max-w-[100px] truncate font-sans text-[10px] text-white/70">
                                  {rule.name}
                                </span>
                              </span>
                            );
                          })}
                          {r.rules.length > 4 ? (
                            <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/50">
                              +{r.rules.length - 4} more
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Status & Calibration Readout */}
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-semibold">
                      {hasAnchor ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-emerald-400">
                          <CheckCircle2 size={11} />
                          Anchor Calibrated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-400">
                          <AlertTriangle size={11} />
                          Anchor Missing
                        </span>
                      )}

                      {r.imageRef ? (
                        <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-sky-300">
                          Ref Image Bound
                        </span>
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-white/60">
                          Live Workpiece Mode
                        </span>
                      )}

                      <span className="ml-auto font-mono text-white/50">
                        ~{estLatencyMs.toFixed(1)}ms / part
                      </span>
                    </div>
                  </div>

                  {/* Lucrative Footer Controls */}
                  <div className="flex items-center justify-between border-t border-white/[0.08] bg-black/40 px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Tune / Configure CTA */}
                      <Link
                        to="/projects/$projectId/rulesets/$rulesetId"
                        params={{
                          projectId,
                          rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, r.id),
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-white/90 shadow-sm transition hover:border-cyan-400/40 hover:bg-cyan-500/15 hover:text-cyan-200"
                      >
                        <Settings2 size={12} />
                        <span>Configure</span>
                      </Link>

                      {/* Live Analyzer CTA */}
                      <button
                        type="button"
                        onClick={() => {
                          void navigate({
                            to: "/analyze",
                            search: { project: projectId, ruleset: r.id },
                          });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-500/20"
                      >
                        <Zap size={12} />
                        <span>Analyze</span>
                      </button>
                    </div>

                    {/* Inline Trial Run */}
                    <RulesetTestRunPill ruleset={r} />
                  </div>

                  {/* Bottom Highlight Line */}
                  <div className="h-0.5 w-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 opacity-25 transition-all duration-200 group-hover:opacity-100 group-hover:shadow-[0_0_10px_rgba(6,182,212,0.7)]" />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function RulesetsError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error("[projects/$projectId/rulesets] error boundary", error);
    reportLovableError(error, { boundary: "projects_$projectId_rulesets_error_component" });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <div className="max-w-md rounded-2xl border border-rose-500/20 bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-rose-400">
          Rule sets didn't load
        </h1>
        <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">{error.message}</p>
        <button
          type="button"
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-lg bg-ca-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-black hover:brightness-110"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

function RulesetsNotFound() {
  const { projectId } = Route.useParams();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <div className="max-w-md rounded-2xl border border-white/10 bg-black/40 p-8 shadow-2xl backdrop-blur-xl">
        <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-white">
          Project not found
        </h1>
        <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
          No project matches <span className="font-mono text-ca-primary">{projectId}</span>.
        </p>
        <Link
          to="/projects"
          className="mt-6 inline-flex rounded-lg bg-ca-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-ca-primary/20 transition hover:brightness-110"
        >
          All projects
        </Link>
      </div>
    </div>
  );
}

type RulesetLike = ReturnType<typeof selectRulesetsForProject>[number];

function RulesetTestRunPill({ ruleset }: { ruleset: RulesetLike }) {
  const appendRun = useTrialStore((s) => s.appendRun);
  const latest = useTrialStore((s) => (s.runsByRuleset[ruleset.id] ?? [])[0] ?? null);
  const [isRunning, setIsRunning] = useState(false);
  const isRunnable = Boolean(ruleset.imageRef) && ruleset.rules.length > 0;

  const verdictBadge = useMemo(() => {
    if (!latest) return null;

    if (latest.verdict === "OK") {
      return {
        Icon: CheckCircle2,
        cls: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        label: "Pass",
      };
    }

    if (latest.verdict === "NG") {
      return {
        Icon: XCircle,
        cls: "text-rose-400 border-rose-500/30 bg-rose-500/10",
        label: "Fail",
      };
    }

    return {
      Icon: MinusCircle,
      cls: "text-white/40 border-white/10 bg-white/5",
      label: "Skipped",
    };
  }, [latest]);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!isRunnable || isRunning) return;

    setIsRunning(true);
    try {
      const run = runRuleset({
        rulesetId: ruleset.id,
        imageRef: ruleset.imageRef ?? "",
        rules: ruleset.rules,
      });

      appendRun(run);
      console.info("[rulesets/list] inline test run", {
        rulesetId: ruleset.id,
        runId: run.id,
        verdict: run.verdict,
      });

      if (run.verdict === "OK") {
        notifySuccess(`${ruleset.name}: pass`);
      } else {
        notifyWarning(`${ruleset.name}: fail`);
      }
    } catch (err) {
      console.error("[rulesets/list] inline test run failed", err);
      reportLovableError(err instanceof Error ? err : new Error(String(err)), {
        boundary: "rulesets_list_inline_test_run",
      });
      notifyWarning("Test run failed", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {verdictBadge ? (
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${verdictBadge.cls}`}
          title={`Last run ${new Date(latest!.createdAt).toLocaleString()}`}
        >
          <verdictBadge.Icon aria-hidden size={11} />
          {verdictBadge.label}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onClick}
        disabled={!isRunnable || isRunning}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:border-ca-select hover:bg-white/10 hover:text-ca-select active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        title={
          isRunnable ? "Test run against the attached image" : "Attach an image to enable test run"
        }
        data-testid={`ruleset-test-run-${ruleset.id}`}
      >
        {isRunning ? (
          <Loader2 aria-hidden size={12} className="animate-spin text-ca-primary" />
        ) : (
          <Play aria-hidden size={12} className="text-ca-primary fill-ca-primary" />
        )}
        {isRunning ? "Running" : "Test Run"}
      </button>
    </div>
  );
}
