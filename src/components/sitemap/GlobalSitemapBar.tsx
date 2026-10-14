import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useMatches, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  Compass,
  FolderKanban,
  History,
  Home,
  Layers,
  MapPin,
  Play,
  RotateCcw,
  ScanSearch,
  Settings,
  Sparkles,
  TestTube2,
  Trash2,
  Wrench,
  Zap,
} from "lucide-react";
import { useProjectStore, selectProject, selectRulesetsForProject } from "@/lib/projects/store";
import { resolveCrumb } from "@/lib/breadcrumb-tokens";
import {
  useSitemapStateCacheStore,
  type PathStateSnapshot,
} from "@/lib/stores/sitemap-state-cache-store";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toIntParam, IntAliasNamespaceType } from "@/lib/ids/int-alias";
import { fromIntId } from "@/lib/rules/rule-id-alias";
import type { RuleSet } from "@/lib/projects/types";

const EMPTY_RULESETS: RuleSet[] = [];

export function GlobalSitemapBar(): React.JSX.Element {
  const location = useLocation();
  const pathname = location.pathname;
  const searchParams = location.search as Record<string, string>;
  const searchText = typeof window !== "undefined" ? window.location.search : "";
  const matches = useMatches();
  const navigate = useNavigate();
  const lastSavedSnapshotKeyRef = useRef<string>("");

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSitemapHydrated, setIsSitemapHydrated] = useState(false);

  const saveSnapshot = useSitemapStateCacheStore((s) => s.saveSnapshot);
  const getSnapshot = useSitemapStateCacheStore((s) => s.getSnapshot);
  const getPreviousSnapshot = useSitemapStateCacheStore((s) => s.getPreviousSnapshot);
  const historyTrail = useSitemapStateCacheStore((s) => s.historyTrail);
  const clearCache = useSitemapStateCacheStore((s) => s.clearCache);

  // Extract route parameters
  const lastMatch = matches[matches.length - 1];
  const params = (lastMatch?.params ?? {}) as Record<string, string>;
  const activeProjectId = params["projectId"];
  const activeRulesetId = params["rulesetId"];
  const activeRuleId = params["ruleId"];

  const project = useProjectStore((s) =>
    activeProjectId ? selectProject(s, activeProjectId) : undefined,
  );
  const rulesets = useProjectStore((s) =>
    activeProjectId ? selectRulesetsForProject(s, activeProjectId) : EMPTY_RULESETS,
  );

  const activeRuleset = useMemo(() => {
    if (!activeRulesetId) return undefined;

    return rulesets.find((r) => r.id === activeRulesetId);
  }, [rulesets, activeRulesetId]);

  const activeRule = useMemo(() => {
    if (!activeRuleId || !activeRuleset) return undefined;

    const num = Number(activeRuleId);
    const resolvedFromAlias = Number.isFinite(num) ? fromIntId(num) : null;

    return activeRuleset.rules?.find(
      (r) => r.id === activeRuleId || (resolvedFromAlias ? r.id === resolvedFromAlias : false),
    );
  }, [activeRuleset, activeRuleId]);

  // Construct clickable crumbs with human labels
  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const trail: Array<{ to: string; label: string; isCurrent: boolean }> = [];

    // Root node
    trail.push({
      to: "/",
      label: "Home",
      isCurrent: pathname === "/",
    });

    let currentPath = "";
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      currentPath += `/${seg}`;
      const isCurrent = currentPath === pathname;

      let label = resolveCrumb(seg);

      if (seg === activeProjectId && project) {
        label = project.name;
      } else if (seg === activeRulesetId && activeRuleset) {
        label = activeRuleset.name;
      } else if (seg === activeRuleId && activeRule) {
        label = activeRule.name;
      }

      trail.push({
        to: currentPath,
        label,
        isCurrent,
      });
    }

    return trail;
  }, [pathname, activeProjectId, activeRulesetId, activeRuleId, project, activeRuleset, activeRule]);

  const currentTitle = useMemo(() => {
    const lastCrumb = crumbs[crumbs.length - 1];

    if (!lastCrumb) return "Control Automation";

    if (project && pathname.includes("/projects/")) {
      return `${lastCrumb.label} · ${project.name}`;
    }

    return lastCrumb.label;
  }, [crumbs, project, pathname]);

  useEffect(() => {
    setIsSitemapHydrated(true);
  }, []);

  // Automatically save state snapshot on navigation
  useEffect(() => {
    const snapshotKey = JSON.stringify({
      pathname,
      search: searchText,
      searchParams,
      title: currentTitle,
    });

    if (lastSavedSnapshotKeyRef.current === snapshotKey) {
      return;
    }

    lastSavedSnapshotKeyRef.current = snapshotKey;

    saveSnapshot({
      pathname,
      search: searchText,
      searchParams,
      title: currentTitle,
    });
  }, [pathname, searchText, searchParams, currentTitle, saveSnapshot]);

  const previousSnapshot = useMemo(() => {
    if (!isSitemapHydrated) {
      return undefined;
    }

    return getPreviousSnapshot(pathname);
  }, [pathname, getPreviousSnapshot, isSitemapHydrated]);

  const hasPrevious = Boolean(previousSnapshot);
  const hasActiveProject = Boolean(project);

  const handleNavigateToCrumb = (targetPath: string) => {
    const cached = getSnapshot(targetPath);

    if (cached && Object.keys(cached.searchParams).length > 0) {
      void navigate({
        to: targetPath as any,
        search: cached.searchParams as any,
      });

      return;
    }

    void navigate({ to: targetPath as any });
  };

  const handleRestorePrevious = () => {
    if (!previousSnapshot) return;

    void navigate({
      to: previousSnapshot.pathname as any,
      search: previousSnapshot.searchParams as any,
    });
  };

  const isCollapsed = crumbs.length > 2;
  const visibleCrumbs = isCollapsed ? crumbs.slice(-2) : crumbs;
  const hiddenCrumbs = isCollapsed ? crumbs.slice(0, -2) : [];
  const fullLabel = crumbs.map((c) => c.label).join(" / ");

  return (
    <nav
      aria-label="Breadcrumb"
      data-testid="global-sitemap-bar"
      className="flex min-w-0 shrink items-center gap-1.5 sm:gap-2 select-none"
    >
      <span className="sr-only">{fullLabel}</span>

      {/* Previous Cached State Return Button */}
      {hasPrevious && previousSnapshot ? (
        <button
          type="button"
          onClick={handleRestorePrevious}
          title={`Restore previous view: ${previousSnapshot.title}`}
          className="group inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-200 transition-all hover:border-amber-400 hover:from-amber-500/25 hover:to-orange-500/20 hover:text-white active:scale-95 shadow-sm cursor-pointer"
        >
          <ArrowLeft size={11} className="transition-transform group-hover:-translate-x-0.5 text-amber-300" />
          <span className="hidden xl:inline text-[9px] uppercase font-mono tracking-wider text-amber-300/90">Back:</span>
          <span className="max-w-[70px] sm:max-w-[100px] truncate text-[10px] text-amber-100">{previousSnapshot.title}</span>
        </button>
      ) : null}

      {/* Strict Space Breadcrumb Sequence */}
      <div className="flex min-w-0 max-w-[160px] xs:max-w-[200px] sm:max-w-[240px] md:max-w-[280px] lg:max-w-[340px] items-center gap-1 text-xs">
        {isCollapsed ? (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title="Expand intermediate path crumbs"
                  className="inline-flex shrink-0 items-center justify-center rounded px-1 py-0.5 font-mono text-[11px] font-bold text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
                >
                  …
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="w-56 p-2 bg-[#0c1017] border border-white/10 rounded-xl shadow-xl z-50 text-xs font-sans text-white"
              >
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-400 px-2 py-1">
                  Path Hierarchy
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  {hiddenCrumbs.map((c) => (
                    <button
                      key={c.to}
                      type="button"
                      onClick={() => handleNavigateToCrumb(c.to)}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-white/10 rounded-md text-left truncate cursor-pointer"
                    >
                      <ChevronRight size={11} className="text-cyan-400 shrink-0" />
                      <span className="truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <span className="shrink-0 text-white/30 text-[11px] font-mono" aria-hidden>
              /
            </span>
          </>
        ) : null}

        {visibleCrumbs.map((crumb, index) => {
          const isLast = index === visibleCrumbs.length - 1;

          return (
            <React.Fragment key={crumb.to}>
              {index > 0 ? (
                <span className="shrink-0 text-white/30 text-[11px] font-mono" aria-hidden>
                  /
                </span>
              ) : null}

              {isLast ? (
                <span
                  title={crumb.label}
                  className="inline-flex min-w-0 shrink items-center gap-1 rounded-md border border-cyan-400/40 bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-indigo-500/15 px-2 py-0.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(34,211,238,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                  <span className="truncate max-w-[80px] sm:max-w-[120px]">{crumb.label}</span>
                </span>
              ) : (
                <button
                  type="button"
                  title={crumb.label}
                  onClick={() => handleNavigateToCrumb(crumb.to)}
                  className="group inline-flex min-w-0 shrink items-center gap-1 rounded-md border border-transparent px-1.5 py-0.5 text-xs font-medium text-slate-300 transition-all hover:border-white/10 hover:bg-white/[0.08] hover:text-white cursor-pointer"
                >
                  {!isCollapsed && index === 0 ? (
                    <Home size={12} className="shrink-0 text-cyan-400/70 group-hover:text-cyan-300" />
                  ) : null}
                  <span className="truncate max-w-[70px] sm:max-w-[100px]">{crumb.label}</span>
                </button>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Concise Sitemap Index Trigger */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Sitemap Index & State Cache"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.04] px-2 py-0.5 text-xs font-semibold text-slate-200 transition-all hover:border-cyan-400/50 hover:bg-white/[0.08] hover:text-white active:scale-95 shadow-sm cursor-pointer"
          >
            <Compass size={13} className="text-cyan-400 transition-transform group-hover:rotate-45" />
            <span className="hidden xl:inline tracking-wide text-[11px]">Sitemap</span>
            {historyTrail.length > 0 ? (
              <span className="rounded-full bg-cyan-500/20 border border-cyan-400/30 px-1.5 py-0.2 font-mono text-[9px] text-cyan-300">
                {historyTrail.length}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>

          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[420px] max-w-[95vw] rounded-2xl border border-white/[0.12] bg-[#07090f]/95 p-4 text-xs font-sans text-white shadow-[0_16px_48px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl"
          >
            {/* Popover Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
                  <Compass size={15} />
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold text-white">Application Sitemap</h3>
                  <p className="font-mono text-[10px] text-white/50">
                    Instant topology jump · Cached state restore
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {historyTrail.length} Views Cached
              </span>
            </div>

            {/* Tree Sections */}
            <div className="mt-3 max-h-[420px] space-y-4 overflow-y-auto pr-1">
              {/* Section 1: Main Application Suites */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Core Workspaces
                </h4>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <Link
                    to="/"
                    onClick={() => setIsPopoverOpen(false)}
                    className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                  >
                    <Home size={14} className="text-cyan-400" />
                    <span className="font-semibold text-white/90">Home Launcher</span>
                  </Link>

                  <Link
                    to="/projects"
                    onClick={() => setIsPopoverOpen(false)}
                    className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                  >
                    <FolderKanban size={14} className="text-sky-400" />
                    <span className="font-semibold text-white/90">Projects Hub</span>
                  </Link>

                  <Link
                    to="/analyze"
                    onClick={() => setIsPopoverOpen(false)}
                    className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                  >
                    <Zap size={14} className="text-amber-400" />
                    <span className="font-semibold text-white/90">Workpiece Analyzer</span>
                  </Link>

                  <Link
                    to="/run"
                    onClick={() => setIsPopoverOpen(false)}
                    className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                  >
                    <Play size={14} className="text-emerald-400" />
                    <span className="font-semibold text-white/90">Production Run</span>
                  </Link>

                  <Link
                    to="/setup"
                    onClick={() => setIsPopoverOpen(false)}
                    className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                  >
                    <Wrench size={14} className="text-indigo-400" />
                    <span className="font-semibold text-white/90">Hardware Setup</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setIsPopoverOpen(false)}
                    className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                  >
                    <Settings size={14} className="text-purple-400" />
                    <span className="font-semibold text-white/90">System Settings</span>
                  </Link>
                </div>
              </div>

              {/* Section 2: Active Project Views (If Project Bound) */}
              {hasActiveProject && project ? (
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      Active Project: {project.name}
                    </h4>
                    <span className="font-mono text-[9px] text-white/40">
                      ID: #{project.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <Link
                      to="/projects/$projectId"
                      params={{ projectId: project.id }}
                      onClick={() => setIsPopoverOpen(false)}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      <Layers size={13} className="text-cyan-400" />
                      <span>Project Overview</span>
                    </Link>

                    <Link
                      to="/projects/$projectId/rulesets"
                      params={{ projectId: project.id }}
                      onClick={() => setIsPopoverOpen(false)}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      <ScanSearch size={13} className="text-cyan-400" />
                      <span>Rulesets ({rulesets.length})</span>
                    </Link>

                    <Link
                      to="/projects/$projectId/camera"
                      params={{ projectId: project.id }}
                      onClick={() => setIsPopoverOpen(false)}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      <Camera size={13} className="text-sky-400" />
                      <span>Camera & Optics</span>
                    </Link>

                    <Link
                      to="/projects/$projectId/trial-run"
                      params={{ projectId: project.id }}
                      onClick={() => setIsPopoverOpen(false)}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      <TestTube2 size={13} className="text-emerald-400" />
                      <span>Trial Testing</span>
                    </Link>

                    <Link
                      to="/projects/$projectId/runs"
                      params={{ projectId: project.id }}
                      onClick={() => setIsPopoverOpen(false)}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      <Activity size={13} className="text-indigo-400" />
                      <span>Execution Runs</span>
                    </Link>

                    <Link
                      to="/projects/$projectId/ai-testing"
                      params={{ projectId: project.id }}
                      search={{ rulesetId: undefined }}
                      onClick={() => setIsPopoverOpen(false)}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-2 transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      <Sparkles size={13} className="text-fuchsia-400" />
                      <span>AI Verification</span>
                    </Link>
                  </div>

                  {/* Rulesets Deep Links */}
                  {rulesets.length > 0 ? (
                    <div className="mt-2 rounded-xl border border-white/[0.06] bg-black/40 p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                        Ruleset Pipelines
                      </div>
                      <div className="mt-1.5 space-y-1">
                        {rulesets.map((r) => {
                          const isSelected = activeRulesetId === r.id;

                          return (
                            <Link
                              key={r.id}
                              to="/projects/$projectId/rulesets/$rulesetId"
                              params={{
                                projectId: project.id,
                                rulesetId: toIntParam(IntAliasNamespaceType.Ruleset, r.id),
                              }}
                              onClick={() => setIsPopoverOpen(false)}
                              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                                isSelected
                                  ? "border border-cyan-400/40 bg-cyan-500/20 text-cyan-200"
                                  : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                              }`}
                            >
                              <span className="font-semibold">{r.name}</span>
                              <span className="font-mono text-[10px] text-white/40">
                                {r.rules.length} tools
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Section 3: Recent Navigation State Cache Trail */}
              {historyTrail.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                      <History size={11} />
                      <span>Cached State History Trail</span>
                    </h4>
                    <button
                      type="button"
                      onClick={clearCache}
                      className="text-[10px] text-white/40 hover:text-rose-400"
                    >
                      Clear Cache
                    </button>
                  </div>

                  <div className="mt-1.5 space-y-1">
                    {historyTrail.slice(0, 6).map((entry) => {
                      const isCurrent = entry.pathname === pathname;

                      return (
                        <button
                          key={`${entry.pathname}-${entry.timestamp}`}
                          type="button"
                          onClick={() => {
                            setIsPopoverOpen(false);
                            void navigate({
                              to: entry.pathname as any,
                              search: entry.searchParams as any,
                            });
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                            isCurrent
                              ? "border border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                              : "border border-white/5 bg-white/[0.01] text-white/70 hover:bg-white/[0.05] hover:text-white"
                          }`}
                        >
                          <span className="truncate max-w-[240px] font-medium">{entry.title}</span>
                          <span className="font-mono text-[9px] text-white/40">
                            {new Date(entry.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
    </nav>
  );
}
