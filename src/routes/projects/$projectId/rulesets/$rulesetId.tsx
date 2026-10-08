import { SectionDensityType } from "@/components/ui/section";
import { EditorToolFamilyType } from "@/lib/editor/types";
import { SectionVariantType } from "@/components/ui/section";
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
  createFileRoute,
  notFound,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { Plus, FileImage, Camera, Save, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import {
  VisualToolWorkpieceCanvas,
  type WorkpieceRoi,
} from "@/components/vision/workpiece";
import { RightRail } from "@/components/editor/rail";
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
import { Section } from "@/components/ui/section";
import { SaveRuleSetButton } from "@/features/rules/save/SaveRuleSetButton";
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
  // Legacy-URL redirect. The child `/rules/$ruleId` route never mounts
  // because this parent doesn't render an <Outlet />, so we intercept
  // the pathname here and hop to the integer-alias URL (or `/setup/roi`
  // when the alias resolves). Split into two components so the redirect
  // path never runs the editor's hooks (avoids hook-order violations).
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

  return (
    <RulesetEditorBody
      key={ruleset.id}
      project={project}
      ruleset={ruleset}
      searchRule={search.rule}
    />
  );
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const updateRulesetImageRef = useProjectStore((s) => s.updateRulesetImageRef);

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

  const activeRoi: WorkpieceRoi = useMemo(() => {
    if (!activeRule) {
      return { x: 50, y: 50, width: 200, height: 200 };
    }

    return {
      x: activeRule.x,
      y: activeRule.y,
      width: activeRule.width,
      height: activeRule.height,
    };
  }, [activeRule]);

  const handleCanvasChangeRoi = useCallback(
    (nextRoi: WorkpieceRoi) => {
      if (!activeRule || activeRule.isLocked) return;
      const nextRules = rules.map((r) =>
        r.id === activeRule.id
          ? {
              ...r,
              x: Math.round(nextRoi.x),
              y: Math.round(nextRoi.y),
              width: Math.round(nextRoi.width),
              height: Math.round(nextRoi.height),
            }
          : r,
      );
      commit(nextRules, "roi-drag");
    },
    [activeRule, rules, commit],
  );

  const addRule = useCallback(() => {
    void navigate({
      to: "/projects/$projectId/rulesets/$rulesetId/add-rule",
      params: { projectId, rulesetId },
    });
  }, [navigate, projectId, rulesetId]);

  const onImportImage = useCallback(
    (file: File) => {
      setImportError(null);
      try {
        const reader = new FileReader();

        reader.onload = () => {
          const dataUrl = reader.result as string;
          updateRulesetImageRef(ruleset.id, dataUrl);
          toast.success(`Imported image: ${file.name}`);
        };

        reader.onerror = () => {
          setImportError("Failed to read image file");
        };

        reader.readAsDataURL(file);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setImportError(`Image import failed: ${message}`);
      }
    },
    [ruleset.id, updateRulesetImageRef],
  );

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

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto bg-[#0b0c10] text-ca-ink font-mono antialiased p-4">
      <div className="mx-auto w-full max-w-[1720px]">
        {/*
         * Compact single-band toolbar.
         */}
        <div
          role="toolbar"
          aria-label="Ruleset actions"
          className="mb-4 flex flex-wrap items-center gap-2 border-b border-[#333] bg-[#1a1c23] p-2"
        >
          <Link
            to="/projects/$projectId"
            params={{ projectId }}
            className="inline-flex items-center gap-2 border border-[#444] bg-[#0b0c10] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ca-ink transition hover:border-ca-primary hover:text-ca-primary focus-visible:outline-none"
            title="Return to Inspection Analysis on Project Page"
          >
            <ScanSearch size={14} className="text-ca-select" />
            Project Analysis
          </Link>
          <span className="ml-hmi-2 mr-auto text-hmi-caption text-ca-ink-muted">
            {rules.length} {rules.length === 1 ? "rule" : "rules"}
          </span>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) void onImportImage(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="inline-flex items-center gap-2 border border-[#444] bg-[#0b0c10] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ca-ink transition hover:border-ca-primary hover:text-ca-primary focus-visible:outline-none"
            title="Import an image file as reference"
          >
            <FileImage aria-hidden size={14} />
            Import image
          </button>
          <button
            type="button"
            onClick={() => {
              void navigate({
                to: "/projects/$projectId/camera",
                params: { projectId },
              });
            }}
            className="inline-flex items-center gap-2 border border-cyan-500 bg-cyan-950/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400 transition hover:bg-cyan-900 focus-visible:outline-none"
            title="Live Camera Mode: Capture frame from camera stream"
          >
            <Camera aria-hidden size={14} className="text-cyan-400" />
            Camera mode (capture from camera)
          </button>
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-2 border border-[#444] bg-[#0b0c10] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ca-ink transition hover:border-ca-primary hover:text-ca-primary focus-visible:outline-none"
          >
            <Plus aria-hidden size={14} />
            Add rule
          </button>
          <button
            type="button"
            onClick={handleSaveRuleSet}
            disabled={isSaving}
            className="inline-flex items-center gap-2 bg-ca-primary px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black transition hover:brightness-110 focus-visible:outline-none disabled:opacity-30"
          >
            <Save aria-hidden size={14} />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>

        {importError ? (
          <p role="alert" className="mb-hmi-3 text-hmi-caption text-ca-ng">
            Import failed: {importError}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
          <Section density={SectionDensityType.Compact} variant={SectionVariantType.Panel}>
            <div className="h-[74vh] min-h-[500px] w-full p-0 flex flex-col overflow-hidden border border-[#333] bg-[#000]">
              <VisualToolWorkpieceCanvas
                imageRef={ruleset.imageRef || "/src/assets/samples/pocket-1-filled.jpg"}
                roi={activeRoi}
                onChangeRoi={handleCanvasChangeRoi}
                toolCode={typeof activeRule?.params?.toolCode === "string" ? activeRule.params.toolCode : undefined}
                toolName={activeRule?.name}
                toolParams={activeRule?.params}
                isEditable={false}
                overlayRules={rules}
                selectedRuleId={activeRule?.id}
                onSelectRule={(id) => {
                  setSelectedIds([id]);
                  useRulesStore.getState().setSelection([id], "canvas.click");
                }}
                onLaunchPatternTuner={() => {
                  if (activeRule) {
                    void navigate({
                      to: "/projects/$projectId/rulesets/$rulesetId/tune/$ruleId",
                      params: { projectId, rulesetId, ruleId: activeRule.id },
                    });
                  }
                }}
              />
            </div>
          </Section>

          <div className="flex h-[74vh] min-h-[500px] flex-col overflow-hidden border border-[#333] bg-[#1a1c23]">
            <RightRail
              rules={rules}
              selectedIds={selectedIds}
              onSelect={railHandlers.onSelect}
              onToggleHidden={railHandlers.onToggleHidden}
              onToggleLocked={railHandlers.onToggleLocked}
              onReorder={railHandlers.onReorder as any}
              onReorderToIndex={railHandlers.onReorderToIndex}
              onUpdateParams={railHandlers.onUpdateParams}
              onDelete={railHandlers.onDelete}
              onDuplicate={railHandlers.onDuplicate}
              onImportRules={railHandlers.onImportRules}
              onImportError={railHandlers.onImportError}
            />
          </div>
        </div>
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
