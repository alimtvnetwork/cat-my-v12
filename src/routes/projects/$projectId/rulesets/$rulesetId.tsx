import { EditorToolFamilyType } from "@/lib/editor/types";
import { CommandIdType } from "@/lib/command-bus";
import { EditorRuleKindType } from "@/lib/editor/types";
// Per-ruleset editor (Plan 34, step 15 + 16). HMI shell content that shows
// the ruleset's imageRef and mounts the full `RightRail`. Every callback
// (select, hidden, locked, reorder, params, delete, duplicate, import) is
// routed through `updateRulesetRules(rulesetId, next)` so edits persist to
// the project store and survive reload / navigation.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  Navigate,
  Outlet,
  createFileRoute,
  notFound,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bug,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleDot,
  CopyPlus,
  Crosshair,
  Eye,
  EyeOff,
  FolderGit2,
  Grid2X2,
  PaintBucket,
  Plus,
  QrCode,
  RefreshCw,
  Ruler,
  Save,
  ScanSearch,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Type,
  type LucideIcon,
} from "lucide-react";
import {
  VISION_TOOL_CATALOG,
  InspectionCategoryType,
  type VisionToolDefinition,
} from "@/lib/vision/tool-catalog";
import { useSitemapStateCacheStore } from "@/lib/stores/sitemap-state-cache-store";
import { toast } from "sonner";
import { visualTunerBus } from "@/lib/editor/selection/visual-tuner-bus";
import { saveRuleSet } from "@/lib/rules/saveRuleSet";
import {
  useProjectStore,
  selectProject,
  selectRuleset,
  type Project,
  type RuleSet,
} from "@/lib/projects/store";
import type { EditorRule, EditorRuleParams, RuleCameraSettings } from "@/lib/editor/types";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { onCommand, type CommandPayloads } from "@/lib/command-bus";
import {
  useValidationStore,
  useValidationResult,
  ValidationStatusType,
  type ValidationResult,
  runStubValidation,
} from "@/lib/editor/validation-store";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { markSaved, useSaveStatus } from "@/lib/editor/store/save-status";
import { openRuleBus } from "@/lib/editor/selection/open-bus";
import { fromIntId, toIntId } from "@/lib/rules/rule-id-alias";
import { projectRulesetToEnvelope, envelopeToProjectRuleset } from "@/lib/rules/envelopeAdapter";
import type { RuleSetEnvelope } from "@/lib/rules/draftStore";
import { persistRulesetDraft } from "@/lib/rules/draftPersistence";
import { useDataSource } from "@/lib/data-source";
import { useRulesetHydration } from "@/lib/rules/useRulesetHydration";
import { resolveIdParam, IntAliasNamespaceType } from "@/lib/ids/int-alias";

const pid = (id: string): string => resolveIdParam(IntAliasNamespaceType.Project, id) || id;

export const Route = createFileRoute("/projects/$projectId/rulesets/$rulesetId")({
  component: RulesetEditor,
  errorComponent: RulesetEditorError,
  notFoundComponent: RulesetEditorNotFound,
  validateSearch: (search: Record<string, unknown>) => {
    const rule = search.rule;

    return typeof rule === "string" && rule.length > 0 ? { rule } : {};
  },
});

function newRuleId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };

  if (g.crypto?.randomUUID) return g.crypto.randomUUID();

  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function useProjectStoreHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const persistApi = useProjectStore.persist;

    if (!persistApi) {
      setIsHydrated(true);

      return;
    }

    if (persistApi.hasHydrated()) {
      setIsHydrated(true);

      return;
    }

    return persistApi.onFinishHydration(() => setIsHydrated(true));
  }, []);

  return isHydrated;
}

function RulesetEditor() {
  // Legacy rule URLs are still intercepted here because `/rules/$ruleId`
  // only redirects to the older setup flow. Actual setup children like
  // `/add-rule` and `/tune/$ruleId` render through <Outlet /> below.
  const { projectId, rulesetId } = Route.useParams();
  const search = Route.useSearch() as { rule?: string };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHydrated = useProjectStoreHydrated();

  const project = useProjectStore((s) => selectProject(s, projectId));
  const ruleset = useProjectStore((s) => {
    const direct = selectRuleset(s, rulesetId);
    if (direct) return direct;
    const realRid = resolveIdParam(IntAliasNamespaceType.Ruleset, rulesetId);
    return Object.values(s.rulesets).find(
      (r) =>
        r.id === rulesetId ||
        r.id === realRid ||
        resolveIdParam(IntAliasNamespaceType.Ruleset, r.id) === rulesetId,
    );
  });

  const legacyRuleSeg = useMemo(() => {
    const tail = pathname.split("/rules/")[1];

    if (!tail) return null;
    const seg = tail.split("/")[0];

    return seg ? seg : null;
  }, [pathname]);

  if (legacyRuleSeg) {
    if (/^\d+$/.test(legacyRuleSeg) === false) {
      const intId = toIntId(legacyRuleSeg);
      console.info("[rulesets/$rulesetId] migrating legacy rule id", {
        legacy: legacyRuleSeg,
        intId,
      });

      return (
        <Navigate
          to="/projects/$projectId/rulesets/$rulesetId/rules/$ruleId"
          params={{ projectId, rulesetId, ruleId: String(intId) }}
          replace
        />
      );
    }

    const resolved = fromIntId(Number(legacyRuleSeg));

    if (resolved) {
      return (
        <Navigate
          to="/setup/roi"
          search={{ project: projectId, ruleset: rulesetId, rule: resolved }}
          replace
        />
      );
    }

    console.warn("[rulesets/$rulesetId] unknown integer alias", { legacyRuleSeg });
  }

  if (!isHydrated) {
    return (
      <div className="flex flex-1 items-center justify-center p-hmi-6 text-hmi-body text-ca-ink-muted">
        Loading rule set...
      </div>
    );
  }

  if (!project || !ruleset) {
    return <RulesetEditorNotFound />;
  }

  const isMatchingProject = Boolean(
    ruleset.projectId === project.id ||
      pid(ruleset.projectId) === pid(project.id) ||
      project.rulesetIds.includes(ruleset.id),
  );

  if (!isMatchingProject) {
    return <RulesetEditorNotFound />;
  }

  if (pathname.endsWith("/add-rule") || pathname.includes("/tune/")) {
    return <Outlet />;
  }

  return (
    <RulesetEditorBody
      key={ruleset.id}
      project={project}
      ruleset={ruleset}
      searchRule={search.rule}
    />
  );
}

function getRuleCategory(rule: EditorRule): InspectionCategoryType {
  const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "";
  const catalogTool = VISION_TOOL_CATALOG.find((t) => t.code === toolCode);

  if (catalogTool) {
    return catalogTool.category;
  }

  const name = rule.name.toLowerCase();

  if (
    name.includes("pin 1") ||
    name.includes("pin1") ||
    name.includes("pattern") ||
    name.includes("orient") ||
    name.includes("presence") ||
    name.includes("area")
  ) {
    return InspectionCategoryType.PresenceAbsence;
  }

  if (
    name.includes("blob") ||
    name.includes("bridge") ||
    name.includes("void") ||
    name.includes("scratch") ||
    name.includes("crack") ||
    name.includes("flaw")
  ) {
    return InspectionCategoryType.FlawDetection;
  }

  if (
    name.includes("caliper") ||
    name.includes("pitch") ||
    name.includes("width") ||
    name.includes("gauge") ||
    name.includes("circle") ||
    name.includes("measure")
  ) {
    return InspectionCategoryType.CountMeasure;
  }

  if (
    name.includes("qr") ||
    name.includes("code") ||
    name.includes("datamatrix") ||
    name.includes("ocr") ||
    name.includes("marking") ||
    name.includes("text")
  ) {
    return InspectionCategoryType.IdOcr;
  }

  if (name.includes("color") || name.includes("coating")) {
    return InspectionCategoryType.ColorCoating;
  }

  return InspectionCategoryType.PresenceAbsence;
}

function getCategoryColor(category: InspectionCategoryType): {
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  stripeBg: string;
  glowClass: string;
  iconBg: string;
  iconText: string;
} {
  switch (category) {
    case InspectionCategoryType.PresenceAbsence:
      return {
        badgeBg: "bg-cyan-500/10",
        badgeBorder: "border-cyan-400/30",
        badgeText: "text-cyan-300",
        stripeBg: "bg-cyan-400",
        glowClass: "border-cyan-400/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]",
        iconBg: "bg-cyan-500/15 border-cyan-400/30",
        iconText: "text-cyan-300",
      };

    case InspectionCategoryType.FlawDetection:
      return {
        badgeBg: "bg-amber-500/10",
        badgeBorder: "border-amber-400/30",
        badgeText: "text-amber-300",
        stripeBg: "bg-amber-400",
        glowClass: "border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
        iconBg: "bg-amber-500/15 border-amber-400/30",
        iconText: "text-amber-300",
      };

    case InspectionCategoryType.CountMeasure:
      return {
        badgeBg: "bg-emerald-500/10",
        badgeBorder: "border-emerald-400/30",
        badgeText: "text-emerald-300",
        stripeBg: "bg-emerald-400",
        glowClass: "border-emerald-400/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]",
        iconBg: "bg-emerald-500/15 border-emerald-400/30",
        iconText: "text-emerald-300",
      };

    case InspectionCategoryType.IdOcr:
      return {
        badgeBg: "bg-purple-500/10",
        badgeBorder: "border-purple-400/30",
        badgeText: "text-purple-300",
        stripeBg: "bg-purple-400",
        glowClass: "border-purple-400/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]",
        iconBg: "bg-purple-500/15 border-purple-400/30",
        iconText: "text-purple-300",
      };

    case InspectionCategoryType.ColorCoating:
    default:
      return {
        badgeBg: "bg-blue-500/10",
        badgeBorder: "border-blue-400/30",
        badgeText: "text-blue-300",
        stripeBg: "bg-blue-400",
        glowClass: "border-blue-400/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]",
        iconBg: "bg-blue-500/15 border-blue-400/30",
        iconText: "text-blue-300",
      };
  }
}

function getRuleIcon(rule: EditorRule): LucideIcon {
  const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "";
  const normalized = `${toolCode} ${rule.name}`.toLowerCase();

  if (normalized.includes("pin 1") || normalized.includes("pin1") || toolCode === "T105") return CircleDot;
  if (normalized.includes("pattern") || toolCode === "T102") return ScanSearch;
  if (normalized.includes("area") || normalized.includes("intensity") || toolCode === "T101") return Grid2X2;
  if (normalized.includes("edge") || normalized.includes("lead") || toolCode === "T104") return Activity;
  if (normalized.includes("blob") || normalized.includes("bridge") || toolCode === "T109") return Bug;
  if (normalized.includes("void") || normalized.includes("porosity") || toolCode === "T108") return Crosshair;
  if (normalized.includes("crack") || normalized.includes("scratch") || toolCode === "T107") return AlertTriangle;
  if (normalized.includes("caliper") || normalized.includes("pitch") || toolCode === "T110") return Ruler;
  if (normalized.includes("circle") || normalized.includes("gauge") || toolCode === "T111") return Crosshair;
  if (normalized.includes("qr") || normalized.includes("datamatrix") || toolCode === "T103") return QrCode;
  if (normalized.includes("ocr") || normalized.includes("marking") || toolCode === "T106") return Type;
  if (normalized.includes("coating") || normalized.includes("color") || toolCode === "T112") return PaintBucket;

  return SlidersHorizontal;
}

function getRuleParameterSummary(rule: EditorRule): string {
  const toolCode = typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "";

  if (toolCode === "T102") {
    const match = rule.params?.minMatchPercent ?? 80;
    const tol = rule.params?.tolerancePx ?? 8;

    return `Constellation Match ≥${match}% · Tol ±${tol}px`;
  }

  if (toolCode === "T105") {
    const dia = rule.params?.expectedDiameterPx ?? 24;
    const circ = rule.params?.minCircularityPct ?? 75;

    return `Pin 1 Dimple Ø ${dia}px · Circularity ≥${circ}%`;
  }

  if (toolCode === "T101") {
    const min = rule.params?.minAreaPx ?? 4000;
    const max = rule.params?.maxAreaPx ?? 30000;

    return `Pixel Area Gate · ${min} - ${max} px`;
  }

  if (toolCode === "T104") {
    const count = rule.params?.expectedCount ?? 16;

    return `Lead Profile Count · ${count} pins expected`;
  }

  if (toolCode === "T109") {
    const thresh = rule.params?.binarizeThreshold ?? 140;

    return `Bridge Blob · Thresh ${thresh} · Zero Tolerance`;
  }

  if (toolCode === "T108") {
    const maxVoid = rule.params?.maxTotalVoidPct ?? 25;

    return `Void Porosity · Max ${maxVoid}% Area`;
  }

  if (toolCode === "T107") {
    const minLen = rule.params?.minCrackLengthPx ?? 12;

    return `Surface Scratch/Crack · Min Len ${minLen}px`;
  }

  if (toolCode === "T110") {
    const nom = rule.params?.nominalDimensionMm ?? 0.5;
    const tol = rule.params?.upperToleranceMm ?? 0.05;

    return `Metrology Caliper · Nom ${nom}mm ±${tol}mm`;
  }

  if (toolCode === "T111") {
    const dia = rule.params?.nominalDiameterMm ?? 1.2;

    return `Circle Gauge · Nom Ø ${dia}mm`;
  }

  if (toolCode === "T103") {
    const symbology = rule.params?.symbology ?? "DataMatrix";

    return `2D Decoder · ${symbology} ECC200`;
  }

  if (toolCode === "T106") {
    const expected = rule.params?.expectedString ?? "STM32";

    return `Laser OCR · Expected "${expected}"`;
  }

  return `Geometric Bounds · ${Math.round(rule.width)} × ${Math.round(rule.height)} px`;
}

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

interface RulesetEditorBodyProps {
  project: Project;
  ruleset: RuleSet;
  searchRule?: string;
}

function RulesetEditorBody({ project, ruleset, searchRule }: RulesetEditorBodyProps) {
  const { projectId } = Route.useParams();
  const rulesetId = ruleset.id;
  const navigate = useNavigate();
  const updateRulesetRules = useProjectStore((s) => s.updateRulesetRules);

  // Plan 90 Step 140. Save flow state. `savedVersion` is the last server-
  // committed Version; feed it into `projectRulesetToEnvelope` so the BE's
  // optimistic-lock check operates on the correct baseline. 0 means the
  // ruleset has never been saved to the server; the BE treats that as
  // create-or-fail.
  const [savedVersion, setSavedVersion] = useState<number>(0);
  const savedVersionRef = useRef<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    return visualTunerBus.subscribe((ruleId) => {
      setSelectedIds([ruleId]);
      void navigate({
        to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId",
        params: { projectId, rulesetId, ruleId },
      });
    });
  }, [navigate, projectId, rulesetId]);

  const updateSavedVersion = useCallback((v: number) => {
    savedVersionRef.current = v;
    setSavedVersion(v);
  }, []);

  const getEnvelope = useCallback((): RuleSetEnvelope => {
    // Read the freshest ruleset from the store at click time, not the
    // closed-over `ruleset` from render, so a concurrent edit right before
    // the click is captured.
    const fresh = selectRuleset(useProjectStore.getState(), rulesetId);

    if (!fresh) {
      throw new Error(`[rulesets/$rulesetId] ruleset gone at save: ${rulesetId}`);
    }

    const { envelope, droppedCategories } = projectRulesetToEnvelope(fresh, {
      version: savedVersionRef.current,
    });

    if (droppedCategories > 0) {
      console.info("[rulesets/$rulesetId] envelope stripped categories", {
        RuleSetId: envelope.RuleSetId,
        DroppedCategories: droppedCategories,
      });
    }

    return envelope;
  }, [rulesetId]);

  const onSaved = useCallback(
    (committed: RuleSetEnvelope) => {
      updateSavedVersion(committed.Version);
      markSaved();
      toast.success("Rule set and optical settings saved to server!");
      console.info("[rulesets/$rulesetId] saved", {
        RuleSetId: committed.RuleSetId,
        Version: committed.Version,
      });
    },
    [updateSavedVersion],
  );


  const onServerReloaded = useCallback(
    (env: RuleSetEnvelope) => {
      // Plan 90 Step 143. Close the loop from Step 142's reverse adapter:
      // convert the server envelope back into a legacy `RuleSet` and rebind
      // BOTH stores (project store = persistence + navigation source of
      // truth; rules-slice = editor selection/inspector source of truth).
      // Without this rebind, `useSaveConflictResolvers.onReloadServer`
      // would only update `savedVersion` and the editor would keep
      // rendering the stale local draft the operator was told to
      // discard - a silent data-loss trap.
      const back = envelopeToProjectRuleset(env, {
        projectId: project.id,
        categoryName: ruleset.categoryName,
        rulesetId: ruleset.id,
      });
      updateRulesetRules(ruleset.id, back.rules);
      useRulesStore
        .getState()
        .replaceAll(back.rules, back.rules.length > 0 ? [back.rules[0].id] : [], []);
      updateSavedVersion(env.Version);
      setSelectedIds(back.rules.length > 0 ? [back.rules[0].id] : []);
      console.info("[rulesets/$rulesetId] server reloaded after conflict", {
        RuleSetId: env.RuleSetId,
        Version: env.Version,
        Rules: back.rules.length,
      });
    },
    [project.id, projectId, ruleset.id, rulesetId, ruleset.categoryName, updateRulesetRules, updateSavedVersion],
  );

  const dataSource = useDataSource();
  useRulesetHydration({
    rulesetId: ruleset.id,
    dataSource,
    onHydrated: onServerReloaded,
  });

  const rules = ruleset.rules;

  const handleSaveRuleSet = useCallback(async () => {
    setIsSaving(true);
    try {
      const liveRules = useRulesStore.getState().rules;
      const rulesToSave = liveRules.length > 0 ? liveRules : rules;
      updateRulesetRules(ruleset.id, rulesToSave);

      let isServerSaved = false;
      try {
        const env = getEnvelope();
        const committed = await saveRuleSet(env);
        updateSavedVersion(committed.Version);
        isServerSaved = true;
      } catch (err) {
        console.warn("[rulesets/save] backend sync unavailable, saved locally", err);
      }

      markSaved();

      if (isServerSaved) {
        toast.success("Rule set and optical settings saved to server!");
      } else {
        toast.success("Rule set and optical settings saved locally!");
      }
    } catch (e) {
      console.error("[rulesets/save] failed", e);
      toast.error(e instanceof Error ? e.message : "Failed to save rule set");
    } finally {
      setIsSaving(false);
    }
  }, [ruleset.id, rules, updateRulesetRules, getEnvelope, updateSavedVersion]);
  const initialSelectedId =
    (searchRule && rules.some((r) => r.id === searchRule) ? searchRule : rules[0]?.id) ?? null;
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedId ? [initialSelectedId] : [],
  );
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    const preferred =
      searchRule && ruleset.rules.some((r) => r.id === searchRule)
        ? searchRule
        : (ruleset.rules[0]?.id ?? null);
    setSelectedIds(preferred ? [preferred] : []);
    setImportError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesetId, searchRule]);

  // Backlog item 2: LayerRow (Enter, Pencil edit button) fires openRuleBus.
  // Route the deep link so the URL is shareable and the pre-select path
  // above kicks in on reload.
  useEffect(() => {
    const unsub = openRuleBus.subscribe((ruleId) => {
      if (ruleset.rules.some((r) => r.id === ruleId) === false) {
        console.warn("[rulesets/$rulesetId] open-rule-bus: rule not in this ruleset", {
          ruleId,
          rulesetId,
        });

        return;
      }
      // Route through the integer-aliased deep link so the URL shows a
      // friendly numeric id. The route resolves the alias back to the
      // string id and redirects to /setup/roi.
      const intId = toIntId(ruleId);
      void navigate({
        to: "/projects/$projectId/rulesets/$rulesetId/rules/$ruleId",
        params: { projectId, rulesetId, ruleId: String(intId) },
      });
    });

    return () => unsub();
  }, [projectId, rulesetId, ruleset.rules, navigate]);

  // Bridge the editor's rules store (source of truth for InspectorSurface
  // and every per-kind param editor) with the project store's ruleset.
  // Without this bridge, param edits (threshold / similarity / radius /
  // minArea / blur / tolerance) live only in the zustand store and are
  // discarded on reload. Seed once per ruleset, then push every store
  // mutation back through `updateRulesetRules` so the change is durably
  // persisted alongside the project.
  useEffect(() => {
    useRulesStore
      .getState()
      .replaceAll(ruleset.rules, ruleset.rules.length > 0 ? [ruleset.rules[0].id] : [], []);
    const unsub = useRulesStore.subscribe((next, prev) => {
      if (next.rules === prev.rules) return;
      updateRulesetRules(rulesetId, next.rules);
      markSaved();
      // Plan 90 Step 141: mirror every rules mutation into the IDB draft
      // store so `reconcileDrafts()` sees unsaved work and Save conflicts
      // never silently discard local edits on reload. Debounced inside
      // `persistRulesetDraft` (150 ms) to coalesce param-drag bursts.
      const fresh = selectRuleset(useProjectStore.getState(), rulesetId);

      if (fresh) persistRulesetDraft(fresh, { version: savedVersionRef.current });
    });

    return () => {
      unsub();
      useSaveStatus.getState().reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesetId]);

  // Point the validation store's activeRulesetId cursor at this ruleset
  // so <ValidationChip ruleId=... /> can look up its persisted result
  // without threading rulesetId through every Layers descendant.
  // Clearing on unmount is important: a stale cursor after navigating
  // away would let chips on an unrelated ruleset render results from
  // this one.
  useEffect(() => {
    useValidationStore.getState().setActiveRuleset(rulesetId);
    console.info("[rulesets/$rulesetId] active validation ruleset set", { rulesetId });

    return () => {
      const current = useValidationStore.getState().activeRulesetId;

      if (current === rulesetId) {
        useValidationStore.getState().setActiveRuleset(null);
      }
    };
  }, [rulesetId]);

  const commit = useCallback(
    (next: EditorRule[], op: string, nextSelected?: string[]) => {
      updateRulesetRules(rulesetId, next);
      const currentSelected = nextSelected ?? (selectedIds.length > 0 ? selectedIds : useRulesStore.getState().selectedIds);
      useRulesStore.getState().replaceAll(next, currentSelected, []);
      console.info("[rulesets/$rulesetId] rules committed", {
        rulesetId,
        op,
        count: next.length,
      });
    },
    [rulesetId, updateRulesetRules, selectedIds],
  );

  const activeRule = useMemo(() => {
    return rules.find((r) => selectedIds.includes(r.id)) ?? rules[0];
  }, [rules, selectedIds]);

  const addRule = useCallback(() => {
    void navigate({
      to: "/projects/$projectId/rulesets/$rulesetId/add-rule",
      params: { projectId, rulesetId: ruleset.id },
    });
  }, [navigate, projectId, ruleset.id]);

  const railHandlers = useMemo(
    () => ({
      onSelect: (id: string) => setSelectedIds([id]),
      onToggleHidden: (id: string) =>
        commit(
          rules.map((r) => (r.id === id ? { ...r, isHidden: !r.isHidden } : r)),
          "toggle-hidden",
        ),
      onToggleLocked: (id: string) =>
        commit(
          rules.map((r) => (r.id === id ? { ...r, isLocked: !r.isLocked } : r)),
          "toggle-locked",
        ),
      onReorder: (id: string, direction: "up" | "down") => {
        const idx = rules.findIndex((r) => r.id === id);

        if (idx < 0) return;
        const target = direction === "up" ? idx - 1 : idx + 1;

        if (target < 0 || target >= rules.length) return;
        const next = rules.slice();
        const [row] = next.splice(idx, 1);
        next.splice(target, 0, row);
        commit(next, `reorder-${direction}`);
      },
      onReorderToIndex: (id: string, targetIndex: number) => {
        const idx = rules.findIndex((r) => r.id === id);

        if (idx < 0) return;
        const clamped = Math.max(0, Math.min(rules.length - 1, targetIndex));

        if (clamped === idx) return;
        const next = rules.slice();
        const [row] = next.splice(idx, 1);
        next.splice(clamped, 0, row);
        commit(next, "reorder-to-index");
      },
      onUpdateParams: (id: string, params: EditorRuleParams) =>
        commit(
          rules.map((r) => (r.id === id ? { ...r, params } : r)),
          "update-params",
        ),
      onDelete: (id: string) => {
        commit(
          rules.filter((r) => r.id !== id),
          "delete",
        );
        setSelectedIds((prev) => prev.filter((sid) => sid !== id));
      },
      onDuplicate: (id: string) => {
        const src = rules.find((r) => r.id === id);

        if (!src) return;
        const clone: EditorRule = {
          ...src,
          id: newRuleId(),
          name: `${src.name} copy`,
        };
        const idx = rules.findIndex((r) => r.id === id);
        const next = rules.slice();
        next.splice(idx + 1, 0, clone);
        commit(next, "duplicate");
        setSelectedIds([clone.id]);
      },
      onImportRules: (imported: EditorRule[]) => {
        commit(imported, "import");
        setSelectedIds(imported.length > 0 ? [imported[0].id] : []);
        setImportError(null);
      },
      onImportError: (message: string) => {
        console.warn("[rulesets/$rulesetId] import error", { message });
        setImportError(message);
      },
    }),
    [rules, commit],
  );

  /**
   * Plan 64 step 94: react to global V/R/C/M/B/F/J hotkeys emitted by
   * `HmiShell`. Each command inserts a rule with a preset kind + params
   * so operators can build up a rule set without leaving the keyboard.
   * B / F / J don't have first-class `EditorRuleKind` values yet, so
   * they fall back to a rect rule with `params.preset` tagging the
   * intended detector; the rail can specialise on that in a follow-up.
   */
  const addRuleWithPreset = useCallback(
    (preset: "R" | "C" | "B" | "F" | "J") => {
      const presetLabel: Record<typeof preset, string> = {
        R: "Rectangle",
        C: "Circle",
        B: "Blob",
        F: "Flaw",
        J: "JS Function",
      };
      const kind: EditorRule["kind"] =
        preset === EditorRuleKindType.C ? EditorRuleKindType.C : EditorRuleKindType.R;
      const family: EditorRule["family"] = EditorToolFamilyType.Rect;
      const params: EditorRuleParams = {};

      if (preset === "B" || preset === "F" || preset === "J") {
        params.preset = preset === "B" ? "blob" : preset === "F" ? "flaw" : "jsFunction";
      }

      const rule: EditorRule = {
        id: newRuleId(),
        name: `${presetLabel[preset]} ${rules.length + 1}`,
        kind,
        family,
        isHidden: false,
        isLocked: false,
        x: 100,
        y: 100,
        width: preset === "C" ? 160 : 200,
        height: preset === "C" ? 160 : 200,
        params,
      };
      commit([...rules, rule], `add-${preset}`);
      setSelectedIds([rule.id]);
    },
    [rules, commit],
  );

  useEffect(() => {
    const unsubs = [
      onCommand(CommandIdType.CmdAddRule, (p: CommandPayloads["cmd:add-rule"]) => {
        addRuleWithPreset(p.preset);
      }),
    ];

    return () => {
      for (const u of unsubs) u();
    };
  }, [addRuleWithPreset]);

  const currentPathname = typeof window !== "undefined" ? window.location.pathname : "";
  const cachedSnapshot = useSitemapStateCacheStore((s) => s.snapshots[currentPathname]);
  const saveSnapshot = useSitemapStateCacheStore((s) => s.saveSnapshot);

  const [searchQuery, setSearchQuery] = useState(cachedSnapshot?.searchQuery ?? "");

  useEffect(() => {
    if (!currentPathname) return;

    saveSnapshot({
      pathname: currentPathname,
      search: window.location.search,
      searchParams: {},
      title: `${ruleset.name} · ${project.name}`,
      searchQuery,
      selectedCategory: "ALL",
      selectedId: selectedIds[0],
    });
  }, [currentPathname, ruleset.name, project.name, searchQuery, selectedIds, saveSnapshot]);

  const filteredRules = useMemo(() => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) return rules;

    const q = trimmedQuery.toLowerCase();

    return rules.filter((rule) => {
      const hasNameMatch = rule.name.toLowerCase().includes(q);
      const hasCodeMatch =
        typeof rule.params?.toolCode === "string" &&
        rule.params.toolCode.toLowerCase().includes(q);
      const hasDescMatch =
        typeof rule.params?.preset === "string" &&
        rule.params.preset.toLowerCase().includes(q);

      return hasNameMatch || hasCodeMatch || hasDescMatch;
    });
  }, [rules, searchQuery]);

  const addCatalogToolDirectly = useCallback(
    (toolCode: string) => {
      const toolDef =
        VISION_TOOL_CATALOG.find((t) => t.code === toolCode) || VISION_TOOL_CATALOG[0];

      const newRule: EditorRule = {
        id: newRuleId(),
        name: toolDef.name,
        kind: toolDef.kind,
        family: toolDef.family,
        isHidden: false,
        isLocked: false,
        x: 100,
        y: 100,
        width: 180,
        height: 180,
        cameraSettings: {
          exposureUs: Math.round(toolDef.defaultExposureMs * 1000),
          gainDb: toolDef.defaultGainDb,
          whiteBalanceKelvin: 5000,
          gamma: 1.0,
        },
        lightSettings: {
          channel: toolDef.defaultChannels[0] || 1,
          intensity: toolDef.defaultLightPct,
          strobeDurationUs: toolDef.defaultStrobeUs,
          hasStrobe: true,
        },
        params: {
          ...toolDef.defaultParamValues,
          toolCode: toolDef.code,
        },
      };

      commit([...rules, newRule], `add-${toolCode}`);
      setSelectedIds([newRule.id]);
      toast.success(`Enrolled ${toolDef.name} (${toolDef.code})`);
    },
    [rules, commit],
  );

  const handleMoveUp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    railHandlers.onReorder(id, "up");
  };

  const handleMoveDown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    railHandlers.onReorder(id, "down");
  };

  const handleToggleHidden = (id: string, isCurrentlyHidden: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    railHandlers.onToggleHidden(id);
    toast.success(
      isCurrentlyHidden
        ? "Tool activated in vision pipeline"
        : "Tool muted in vision pipeline",
    );
  };

  const handleDuplicate = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    railHandlers.onDuplicate(id);
    toast.success(`Duplicated ${name}`);
  };

  const handleDelete = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    railHandlers.onDelete(id);
    toast.success(`Removed ${name}`);
  };

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-[#0a0d14] p-4 font-sans text-[#f8fafc] antialiased selection:bg-[oklch(0.76_0.145_210/0.3)] lg:p-6">
      {/* Cybernetic ambient backdrop lighting */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[oklch(0.76_0.145_210/0.06)] blur-[140px]" />
        <div className="absolute right-12 top-60 h-80 w-80 rounded-full bg-indigo-600/5 blur-[140px]" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-emerald-600/5 blur-[120px]" />
      </div>

      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col gap-4">
        {/* Lucrative Hero Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 rounded-xl border border-[#222938] bg-[#0d1119]/95 p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#64748b]">
              <Link to="/projects" className="transition hover:text-[#f8fafc]">
                Projects
              </Link>
              <ChevronRight size={12} />
              <Link
                to="/projects/$projectId"
                params={{ projectId }}
                className="transition hover:text-[#f8fafc]"
              >
                {project.name}
              </Link>
              <ChevronRight size={12} />
              <span className="font-semibold text-[#f8fafc]">{ruleset.name}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#f8fafc]">
                {ruleset.name}
              </h1>

              <span className="rounded-full border border-[oklch(0.76_0.145_210/0.4)] bg-[oklch(0.76_0.145_210/0.12)] px-2.5 py-0.5 text-[11px] font-mono font-medium text-[oklch(0.76_0.145_210)]">
                {ruleset.categoryName || "Surface Metrology"} · #{ruleset.id.slice(0, 8)}
              </span>

              {savedVersion > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Server Synced · v{savedVersion}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                  Local Draft
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-[#94a3b8]">
              {project.name} · {rules.length}{" "}
              {rules.length === 1 ? "instrument" : "instruments"} enrolled · Optical inspection
              pipeline active
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveRuleSet}
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-lg border border-[#222938] bg-[#141924] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#f8fafc] shadow-sm transition hover:border-[#333e54] hover:bg-[#1a2130] active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw size={14} className="animate-spin text-ca-select" />
              ) : (
                <Save size={14} className="text-emerald-400" />
              )}
              <span>{isSaving ? "Saving..." : "Save Ruleset"}</span>
            </button>


            {/* Add Tool Primary Button */}
            <button
              type="button"
              onClick={addRule}
              data-tour="ruleset-add-rule-btn"
              className="inline-flex items-center gap-2 rounded-lg border border-[oklch(0.76_0.145_210/0.6)] bg-[oklch(0.76_0.145_210)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#0a0d14] shadow-[0_0_16px_oklch(0.76_0.145_210/0.4)] transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Tool</span>
            </button>
          </div>
        </div>

        {importError ? (
          <p
            role="alert"
            className="shrink-0 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-300 shadow-sm"
          >
            Import failed: {importError}
          </p>
        ) : null}

        {/* Instrument Search Toolbar */}
        <div className="flex items-center rounded-xl border border-[#222938] bg-[#0d1119]/90 p-2 shadow-inner backdrop-blur-md">
          {/* Search Box */}
          <div className="relative w-full">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search enrolled tools by name or code (T101, Pin 1, Caliper)..."
              className="w-full rounded-lg border border-[#222938] bg-[#141924] py-2 pl-9 pr-8 font-mono text-xs text-[#f8fafc] placeholder-[#64748b] transition focus:border-[oklch(0.76_0.145_210/0.6)] focus:bg-[#181f2c] focus:outline-none focus:ring-1 focus:ring-[oklch(0.76_0.145_210/0.4)]"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#f8fafc]"
              >
                ×
              </button>
            ) : null}
          </div>
        </div>

        {/* Rules Inspection List / Empty State */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#222938] bg-[#0d1119]/90 shadow-inner backdrop-blur-md">
          <div className="flex shrink-0 items-center justify-between border-b border-[#222938] bg-[#121622] px-5 py-3">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-[#f8fafc]">
                Inspection Sequence Pipeline
              </h2>
              <p className="text-[11px] text-[#94a3b8]">
                Instruments evaluate top-to-bottom. Calibrate parameters or reorder execution priority.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-[#64748b]">
                Showing {filteredRules.length} of {rules.length}
              </span>
              <span className="rounded-full border border-[#222938] bg-[#141924] px-3 py-0.5 font-mono text-[11px] font-bold text-[#f8fafc] shadow-inner">
                {filteredRules.length}
              </span>
            </div>
          </div>

          {rules.length === 0 ? (
            /* Cybernetic Blueprint Quick-Add Station */
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
                <ScanSearch size={32} />
              </div>
              <h3 className="text-base font-bold text-white">
                No Vision Inspection Tools Enrolled
              </h3>
              <p className="mt-1 max-w-lg text-xs text-white/60">
                Select an industrial starter instrument template below to initialize this ruleset,
                or browse the complete vision catalog:
              </p>

              {/* 4 Quick Starter Template Cards */}
              <div className="mt-6 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
                {/* T105 Pin 1 */}
                <div className="flex flex-col justify-between rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-4 text-left transition hover:border-cyan-400/60 hover:bg-cyan-500/10">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-300">
                      <CircleDot size={15} />
                      <span>T105 · Pin 1 Orientation Config</span>
                    </div>
                    <p className="mt-1.5 text-xs text-white/60">
                      Detects physical IC dimple or notch to lock orientation and establish carrier
                      tape coordinate alignment.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addCatalogToolDirectly("T105")}
                    className="mt-3.5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/30 active:scale-95"
                  >
                    <Plus size={13} />
                    Quick Enroll T105
                  </button>
                </div>

                {/* T102 Pattern Matching */}
                <div className="flex flex-col justify-between rounded-xl border border-sky-400/30 bg-sky-500/5 p-4 text-left transition hover:border-sky-400/60 hover:bg-sky-500/10">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-sky-300">
                      <ScanSearch size={15} />
                      <span>T102 · Greyscale Pattern Match</span>
                    </div>
                    <p className="mt-1.5 text-xs text-white/60">
                      2-bit constellation pattern matching for carrier tape pockets, IC marking, and
                      seated presence verification.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addCatalogToolDirectly("T102")}
                    className="mt-3.5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/20 px-3 py-1.5 text-xs font-bold text-sky-200 transition hover:bg-sky-500/30 active:scale-95"
                  >
                    <Plus size={13} />
                    Quick Enroll T102
                  </button>
                </div>

                {/* T110 Lead Pitch Caliper */}
                <div className="flex flex-col justify-between rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4 text-left transition hover:border-emerald-400/60 hover:bg-emerald-500/10">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-300">
                      <Ruler size={15} />
                      <span>T110 · Lead Pitch & Width Caliper</span>
                    </div>
                    <p className="mt-1.5 text-xs text-white/60">
                      Sub-pixel metrology caliper measuring IC pin pitch (e.g. 0.50mm), lead width,
                      and co-planarity alignment.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addCatalogToolDirectly("T110")}
                    className="mt-3.5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/30 active:scale-95"
                  >
                    <Plus size={13} />
                    Quick Enroll T110
                  </button>
                </div>

                {/* T103 DataMatrix */}
                <div className="flex flex-col justify-between rounded-xl border border-purple-400/30 bg-purple-500/5 p-4 text-left transition hover:border-purple-400/60 hover:bg-purple-500/10">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-purple-300">
                      <QrCode size={15} />
                      <span>T103 · 2D DataMatrix & QR Reader</span>
                    </div>
                    <p className="mt-1.5 text-xs text-white/60">
                      Decodes ECC200 DataMatrix laser-etched barcodes to verify silicon lot numbers
                      and PCB package serials.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addCatalogToolDirectly("T103")}
                    className="mt-3.5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-400/40 bg-purple-500/20 px-3 py-1.5 text-xs font-bold text-purple-200 transition hover:bg-purple-500/30 active:scale-95"
                  >
                    <Plus size={13} />
                    Quick Enroll T103
                  </button>
                </div>
              </div>

              {/* Full Catalog Button */}
              <button
                type="button"
                onClick={addRule}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 active:scale-95"
              >
                <span>Browse Complete Vision Catalog (12 Instruments)</span>
                <ArrowRight size={14} />
              </button>
            </div>
          ) : filteredRules.length === 0 ? (
            /* Empty Filter Results */
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <Search size={28} className="text-white/30" />
              <h3 className="mt-3 text-sm font-bold text-white">No Matching Instruments</h3>
              <p className="mt-1 text-xs text-white/50">
                No enrolled tools match &ldquo;{searchQuery}&rdquo; in the selected category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("ALL");
                }}
                className="mt-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.08]"
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            /* Rich Enrolled Instruments List */
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid gap-3">
                {filteredRules.map((rule, index) => {
                  const toolCode =
                    typeof rule.params?.toolCode === "string" ? rule.params.toolCode : "Rule";
                  const isSelected = selectedIds.includes(rule.id);
                  const category = getRuleCategory(rule);
                  const catColor = getCategoryColor(category);
                  const ToolIcon = getRuleIcon(rule);
                  const paramSummary = getRuleParameterSummary(rule);
                  const isHidden = Boolean(rule.isHidden);

                  const expText = rule.cameraSettings?.exposureUs
                    ? `${(rule.cameraSettings.exposureUs / 1000).toFixed(1)}ms`
                    : "12.5ms";
                  const strobeText = rule.lightSettings?.strobeDurationUs
                    ? `${rule.lightSettings.strobeDurationUs}µs`
                    : "300µs";

                  return (
                    <div
                      key={rule.id}
                      onClick={() => {
                        setSelectedIds([rule.id]);
                        useRulesStore.getState().setSelection([rule.id], "ruleset.rule-list");
                      }}
                      className={`group relative flex flex-col justify-between gap-3.5 rounded-xl border p-4 text-left transition-all sm:flex-row sm:items-center ${
                        isSelected
                          ? `border-[oklch(0.76_0.145_210/0.65)] bg-gradient-to-r from-[oklch(0.76_0.145_210/0.14)] via-[#141924] to-[#0c1017] shadow-[0_0_20px_oklch(0.76_0.145_210/0.25),inset_0_1px_0_rgba(255,255,255,0.1)]`
                          : "border-[#222938] bg-[#10141e]/90 hover:border-[#333e54] hover:bg-[#141924]"
                      } ${isHidden ? "opacity-60 border-dashed" : ""}`}
                    >
                      {/* Left Category Stripe */}
                      <span
                        className={`absolute bottom-3 left-0 top-3 w-1 rounded-r-full ${catColor.stripeBg}`}
                      />

                      {/* Main Left Details */}
                      <div className="flex min-w-0 flex-1 items-start gap-3.5 pl-2">
                        {/* Step Sequence Badge */}
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#222938] bg-[#0c1017] font-mono text-xs font-bold text-[#94a3b8] shadow-inner">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        {/* Tool Icon in Category Glowing Box */}
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${catColor.iconBg} ${catColor.iconText} shadow-sm`}
                        >
                          <ToolIcon size={20} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-sans text-sm font-bold text-[#f8fafc]">
                              {rule.name}
                            </span>
                            <span className="rounded-md border border-[#222938] bg-[#0c1017] px-2 py-0.5 font-mono text-[10px] font-bold text-[#f8fafc]">
                              {toolCode}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${catColor.badgeBg} ${catColor.badgeBorder} ${catColor.badgeText}`}
                            >
                              {category}
                            </span>
                            {isHidden ? (
                              <span className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[9px] font-mono text-zinc-400">
                                Muted
                              </span>
                            ) : null}
                          </div>

                          {/* Calibrated Specs Readout */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#94a3b8]">
                            <span className="flex items-center gap-1 font-mono text-[#f8fafc]">
                              <CheckCircle2 size={12} className="text-emerald-400" />
                              {paramSummary}
                            </span>
                            <span className="text-[#64748b]">·</span>
                            <span className="flex items-center gap-1 font-mono text-[11px] text-[#94a3b8]">
                              <Camera size={11} className="text-sky-400" />
                              Exp: {expText}
                            </span>
                            <span className="text-[#64748b]">·</span>
                            <span className="flex items-center gap-1 font-mono text-[11px] text-[#94a3b8]">
                              <Sun size={11} className="text-amber-400" />
                              Strobe: {strobeText}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action Toolbar */}
                      <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={(e) => handleMoveUp(rule.id, e)}
                          disabled={index === 0}
                          title="Move Up in Execution Priority"
                          className="rounded-lg border border-[#222938] bg-[#141924] p-1.5 text-[#94a3b8] transition hover:border-[#333e54] hover:bg-[#1a2130] hover:text-[#f8fafc] disabled:opacity-20"
                        >
                          <ChevronUp size={14} />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={(e) => handleMoveDown(rule.id, e)}
                          disabled={index === rules.length - 1}
                          title="Move Down in Execution Priority"
                          className="rounded-lg border border-[#222938] bg-[#141924] p-1.5 text-[#94a3b8] transition hover:border-[#333e54] hover:bg-[#1a2130] hover:text-[#f8fafc] disabled:opacity-20"
                        >
                          <ChevronDown size={14} />
                        </button>

                        {/* Visibility Toggle */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleHidden(rule.id, isHidden, e)}
                          title={isHidden ? "Activate Tool" : "Mute Tool"}
                          className={`rounded-lg border p-1.5 transition ${
                            isHidden
                              ? "border-amber-400/30 bg-amber-500/10 text-amber-300"
                              : "border-[#222938] bg-[#141924] text-[#94a3b8] hover:border-[#333e54] hover:bg-[#1a2130] hover:text-[#f8fafc]"
                          }`}
                        >
                          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={(e) => handleDuplicate(rule.id, rule.name, e)}
                          title="Duplicate Tool"
                          className="rounded-lg border border-[#222938] bg-[#141924] p-1.5 text-[#94a3b8] transition hover:border-[#333e54] hover:bg-[#1a2130] hover:text-[#f8fafc]"
                        >
                          <CopyPlus size={14} />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(rule.id, rule.name, e)}
                          title="Remove Tool"
                          className="rounded-lg border border-[#222938] bg-[#141924] p-1.5 text-[#94a3b8] transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300"
                        >
                          <Trash2 size={14} />
                        </button>

                        {/* Configure / Tune CTA */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIds([rule.id]);
                            useRulesStore.getState().setSelection([rule.id], "ruleset.rule-list");
                            void navigate({
                              to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId",
                              params: { projectId, rulesetId, ruleId: rule.id },
                            });
                          }}
                          className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-gradient-to-r from-cyan-500/20 to-sky-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-cyan-200 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-500/30 active:scale-95"
                        >
                          <Settings2 size={13} />
                          <span>Tune</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function RulesetEditorError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error("[rulesets/$rulesetId] error boundary", error);
    reportLovableError(error, {
      boundary: "projects_$projectId_rulesets_$rulesetId_error_component",
    });
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        The rule set editor didn't load
      </h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">{error.message}</p>
      {error.stack && (
        <pre className="mt-hmi-3 max-h-48 max-w-xl overflow-auto rounded bg-black/80 p-2 text-left font-mono text-[11px] text-rose-300">
          {error.stack}
        </pre>
      )}
      <button
        type="button"
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}

function RulesetEditorNotFound() {
  const { projectId, rulesetId } = Route.useParams();

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-hmi-6 text-center">
      <h1 className="font-display text-hmi-title font-extrabold uppercase tracking-wide text-ca-ink">
        Rule set not found
      </h1>
      <p className="mt-hmi-2 text-hmi-body text-ca-ink-muted">
        No rule set matches <span className="font-mono">{rulesetId}</span> in this project.
      </p>
      <Link
        to="/projects/$projectId/rulesets"
        params={{ projectId }}
        className="mt-hmi-4 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg hover:brightness-110"
      >
        Back to rule sets
      </Link>
    </div>
  );
}
