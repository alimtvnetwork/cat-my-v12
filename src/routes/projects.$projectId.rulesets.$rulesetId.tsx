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
import { Plus, Shapes, FileImage, FileCode2, ScanSearch } from "lucide-react";
import { useProjectStore, selectProject, selectRuleset } from "@/lib/projects/store";
import type { EditorRule, EditorRuleParams } from "@/lib/editor/types";
import { RightRail } from "@/components/editor/rail";
import { DesignModeOverlay } from "@/components/editor/design-mode/DesignModeOverlay";
import { ValidateAgainstImageDialog } from "@/components/editor/validation/ValidateAgainstImageDialog";
import { parseSvgSource } from "@/components/editor/design-mode/svg-import";
import { readMaskFile, MAX_MASK_BYTES } from "@/components/editor/design-mode/image-import";
import { compileShape } from "@/lib/shapes.functions";
import { useServerFn } from "@tanstack/react-start";
import { reportLovableError } from "@/lib/lovable-error-reporting";
import { onCommand, type CommandPayloads } from "@/lib/command-bus";
import { useValidationStore } from "@/lib/editor/validation-store";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { markSaved, useSaveStatus } from "@/lib/editor/store/save-status";
import { openRuleBus } from "@/lib/editor/selection/open-bus";
import { fromIntId, toIntId } from "@/lib/rules/rule-id-alias";
import { Section } from "@/components/ui/section";
import { SaveRuleSetButton } from "@/features/rules/save/SaveRuleSetButton";
import { projectRulesetToEnvelope, envelopeToProjectRuleset } from "@/lib/rules/envelopeAdapter";
import type { RuleSetEnvelope } from "@/lib/rules/draftStore";
import { persistRulesetDraft } from "@/lib/rules/draftPersistence";

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

function RulesetEditor() {
  // Legacy-URL redirect. The child `/rules/$ruleId` route never mounts
  // because this parent doesn't render an <Outlet />, so we intercept
  // the pathname here and hop to the integer-alias URL (or `/setup/roi`
  // when the alias resolves). Split into two components so the redirect
  // path never runs the editor's hooks (avoids hook-order violations).
  const { projectId, rulesetId } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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

  return <RulesetEditorBody />;
}

function RulesetEditorBody() {
  const { projectId, rulesetId } = Route.useParams();
  const search = Route.useSearch() as { rule?: string };
  const navigate = useNavigate();
  const project = useProjectStore((s) => selectProject(s, projectId));

  const ruleset = useProjectStore((s) => selectRuleset(s, rulesetId));
  const updateRulesetRules = useProjectStore((s) => s.updateRulesetRules);

  if (!project) {
    console.warn("[rulesets/$rulesetId] project not found", { projectId });

    throw notFound();
  }

  if (!ruleset || ruleset.projectId !== projectId) {
    console.warn("[rulesets/$rulesetId] ruleset not found for project", {
      projectId,
      rulesetId,
    });

    throw notFound();
  }

  // Plan 90 Step 140. Save flow state. `savedVersion` is the last server-
  // committed Version; feed it into `projectRulesetToEnvelope` so the BE's
  // optimistic-lock check operates on the correct baseline. 0 means the
  // ruleset has never been saved to the server; the BE treats that as
  // create-or-fail.
  const [savedVersion, setSavedVersion] = useState<number>(0);
  const getEnvelope = useCallback((): RuleSetEnvelope => {
    // Read the freshest ruleset from the store at click time, not the
    // closed-over `ruleset` from render, so a concurrent edit right before
    // the click is captured.
    const fresh = selectRuleset(useProjectStore.getState(), rulesetId);

    if (!fresh) throw new Error(`[rulesets/$rulesetId] ruleset gone at save: ${rulesetId}`);
    const { envelope, droppedCategories } = projectRulesetToEnvelope(fresh, {
      version: savedVersion,
    });

    if (droppedCategories > 0) {
      console.info("[rulesets/$rulesetId] envelope stripped categories", {
        RuleSetId: envelope.RuleSetId,
        DroppedCategories: droppedCategories,
      });
    }

    return envelope;
  }, [rulesetId, savedVersion]);
  const onSaved = useCallback((committed: RuleSetEnvelope) => {
    setSavedVersion(committed.Version);
    markSaved();
    console.info("[rulesets/$rulesetId] saved", {
      RuleSetId: committed.RuleSetId,
      Version: committed.Version,
    });
  }, []);
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
        projectId,
        categoryName: ruleset.categoryName,
        rulesetId,
      });
      updateRulesetRules(rulesetId, back.rules);
      useRulesStore
        .getState()
        .replaceAll(back.rules, back.rules.length > 0 ? [back.rules[0].id] : [], []);
      setSavedVersion(env.Version);
      setSelectedIds(back.rules.length > 0 ? [back.rules[0].id] : []);
      console.info("[rulesets/$rulesetId] server reloaded after conflict", {
        RuleSetId: env.RuleSetId,
        Version: env.Version,
        Rules: back.rules.length,
      });
    },
    [projectId, rulesetId, ruleset.categoryName, updateRulesetRules],
  );

  // Store is the source of truth: read rules directly so external mutations
  // (import, cross-tab persist) surface immediately.
  const rules = ruleset.rules;
  const initialSelectedId =
    (search.rule && rules.some((r) => r.id === search.rule) ? search.rule : rules[0]?.id) ?? null;
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedId ? [initialSelectedId] : [],
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [designOpen, setDesignOpen] = useState(false);
  const [validateOpen, setValidateOpen] = useState(false);
  const shapeInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);
  const compile = useServerFn(compileShape);

  useEffect(() => {
    const preferred =
      search.rule && ruleset.rules.some((r) => r.id === search.rule)
        ? search.rule
        : (ruleset.rules[0]?.id ?? null);
    setSelectedIds(preferred ? [preferred] : []);
    setImportError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesetId, search.rule]);

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

      if (fresh) persistRulesetDraft(fresh, { version: savedVersion });
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
    (next: EditorRule[], op: string) => {
      updateRulesetRules(rulesetId, next);
      console.info("[rulesets/$rulesetId] rules committed", {
        rulesetId,
        op,
        count: next.length,
      });
    },
    [rulesetId, updateRulesetRules],
  );

  const addRule = useCallback(() => {
    const rule: EditorRule = {
      id: newRuleId(),
      name: `Rule ${rules.length + 1}`,
      kind: EditorRuleKindType.C,
      isHidden: false,
      isLocked: false,
      x: 100,
      y: 100,
      width: 200,
      height: 200,
    };
    commit([...rules, rule], "add");
    setSelectedIds([rule.id]);
  }, [rules, commit]);

  /**
   * Import Shape (SVG). Root cause it addresses: operators had no way
   * to reuse externally authored SVG assets (spec 09-UI-improvements-v2
   * line 42, spec 36-shape-svg-asset). Flow:
   *   1. Read file text.
   *   2. Parse with `parseSvgSource`, absolute commands only (matches
   *      the server `normaliseSvgPath` regex).
   *   3. Best-effort call `compileShape` server fn to persist the asset.
   *      Cloud failure surfaces in the alert region but never blocks
   *      the local rule creation.
   *   4. Create a rule sized to the shape viewBox with `params.shapeSvgPath`,
   *      `params.shapeViewBoxW/H`, `params.shapeSource` so future rule
   *      renderers can draw the actual outline instead of just a rect.
   */
  const onImportShape = useCallback(
    async (file: File) => {
      setImportError(null);
      try {
        const text = await file.text();
        const shape = parseSvgSource(text);
        const name = file.name.replace(/\.svg$/i, "") || `Shape ${rules.length + 1}`;
        console.info("[import-shape] parsed", {
          file: file.name,
          source: shape.source,
          bytes: shape.svgPath.length,
        });
        let shapeAssetId: string | null = null;
        try {
          const compiled = await compile({
            data: {
              name,
              svgPath: shape.svgPath,
              viewBoxW: shape.viewBoxW,
              viewBoxH: shape.viewBoxH,
            },
          });
          shapeAssetId = compiled.id;
          console.info("[import-shape] compiled", { id: compiled.id });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.warn("[import-shape] cloud compile failed, keeping local rule", { message });
        }

        const params: EditorRuleParams = {
          shapeSvgPath: shape.svgPath,
          shapeViewBoxW: shape.viewBoxW,
          shapeViewBoxH: shape.viewBoxH,
          shapeSource: shape.source,
          shapeFilename: file.name,
        };

        if (shapeAssetId) params.shapeAssetId = shapeAssetId;
        const rule: EditorRule = {
          id: newRuleId(),
          name,
          kind: EditorRuleKindType.R,
          family: EditorToolFamilyType.Rect,
          isHidden: false,
          isLocked: false,
          x: 100,
          y: 100,
          width: Math.min(600, Math.max(40, shape.viewBoxW)),
          height: Math.min(600, Math.max(40, shape.viewBoxH)),
          params,
        };
        commit([...rules, rule], "import-shape");
        setSelectedIds([rule.id]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[import-shape] failed", err);
        setImportError(`Shape import failed: ${message}`);
      }
    },
    [rules, commit, compile],
  );

  /**
   * Import Mask (image). Root cause it addresses: rectangular masks from
   * an external source could not become rule assets, so mask-based flaw
   * detection had no on-ramp (spec 09-UI-improvements-v2 line 46). Flow:
   *   1. Read the file as a data URL, validate MIME and size cap
   *      (`readMaskFile` raises explicit errors, no silent truncation).
   *   2. Create a new rect rule sized to the natural image dimensions
   *      (clamped to 40..1200 so the canvas stays usable).
   *   3. Stash the data URL and metadata on `params` so the rail /
   *      canvas can render the mask overlay in a follow-up turn.
   */
  const onImportMask = useCallback(
    async (file: File) => {
      setImportError(null);
      try {
        const mask = await readMaskFile(file);
        const name = file.name.replace(/\.[^.]+$/, "") || `Mask ${rules.length + 1}`;
        console.info("[import-mask] loaded", {
          file: file.name,
          w: mask.width,
          h: mask.height,
          bytes: mask.bytes,
        });
        const params: EditorRuleParams = {
          maskImage: mask.dataUrl,
          maskFilename: mask.filename,
          maskMime: mask.mime,
          maskWidth: mask.width,
          maskHeight: mask.height,
          maskBytes: mask.bytes,
        };
        const rule: EditorRule = {
          id: newRuleId(),
          name,
          kind: EditorRuleKindType.R,
          family: EditorToolFamilyType.Rect,
          isHidden: false,
          isLocked: false,
          x: 100,
          y: 100,
          width: Math.min(1200, Math.max(40, mask.width)),
          height: Math.min(1200, Math.max(40, mask.height)),
          params,
        };
        commit([...rules, rule], "import-mask");
        setSelectedIds([rule.id]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[import-mask] failed", err);
        setImportError(`Mask import failed: ${message}`);
      }
    },
    [rules, commit],
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
      onCommand(CommandIdType.CmdValidate, () => setValidateOpen(true)),
      onCommand(CommandIdType.CmdDesignMode, () => setDesignOpen((v) => !v)),
    ];

    return () => {
      for (const u of unsubs) u();
    };
  }, [addRuleWithPreset]);

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-auto p-hmi-4">
      <div className="mx-auto w-full max-w-6xl">
        {/*
         * Compact single-band toolbar. The redundant H1 + subtitle stack
         * was removed: the sticky Titlebar breadcrumb + address bar
         * already carry the ruleset identity, so a second header only
         * duplicated it and pushed the canvas below the fold. Rule count
         * moved inline into the toolbar as a muted chip.
         */}
        <div
          role="toolbar"
          aria-label="Ruleset actions"
          className="mb-hmi-3 flex flex-wrap items-center gap-hmi-1 rounded-md border border-ca-border/60 bg-ca-panel/50 p-hmi-1"
        >
          <span className="ml-hmi-2 mr-auto text-hmi-caption text-ca-ink-muted">
            {rules.length} {rules.length === 1 ? "rule" : "rules"}
          </span>
          <input
            ref={shapeInputRef}
            type="file"
            accept=".svg,image/svg+xml"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) void onImportShape(file);
              e.target.value = "";
            }}
          />
          <input
            ref={maskInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) void onImportMask(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => shapeInputRef.current?.click()}
            className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-caption font-semibold text-ca-ink transition hover:border-ca-select hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            title="Import an .svg file as a new shape rule."
          >
            <FileCode2 aria-hidden size={14} />
            Import shape
          </button>
          <button
            type="button"
            onClick={() => maskInputRef.current?.click()}
            className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-caption font-semibold text-ca-ink transition hover:border-ca-select hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            title={`Import a raster mask (PNG / JPEG / WebP / GIF, up to ${(MAX_MASK_BYTES / 1024 / 1024).toFixed(0)} MB).`}
          >
            <FileImage aria-hidden size={14} />
            Import mask
          </button>
          <button
            type="button"
            onClick={() => setDesignOpen(true)}
            className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-caption font-semibold text-ca-ink transition hover:border-ca-select hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            <Shapes aria-hidden size={14} />
            Design mode
          </button>
          <button
            type="button"
            onClick={() => setValidateOpen(true)}
            disabled={rules.length === 0}
            className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-2 py-hmi-1 text-hmi-caption font-semibold text-ca-ink transition hover:border-ca-select hover:bg-ca-panel-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus disabled:cursor-not-allowed disabled:opacity-40"
            title="Validate this rule set against a candidate image."
          >
            <ScanSearch aria-hidden size={14} />
            Validate
          </button>
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-2 py-hmi-1 text-hmi-caption font-semibold text-ca-bg transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          >
            <Plus aria-hidden size={14} />
            Add rule
          </button>
          <SaveRuleSetButton
            getEnvelope={getEnvelope}
            onSaved={onSaved}
            onServerReloaded={onServerReloaded}
            className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-2 py-hmi-1 text-hmi-caption font-semibold text-ca-bg transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
          />
        </div>

        {importError ? (
          <p role="alert" className="mb-hmi-3 text-hmi-caption text-ca-ng">
            Import failed: {importError}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-hmi-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Section density={SectionDensityType.Compact} variant={SectionVariantType.Panel}>
            {ruleset.imageRef ? (
              <img
                src={ruleset.imageRef}
                alt={`${ruleset.name} reference`}
                className="mx-auto max-h-[70vh] w-auto rounded-sm border border-ca-border object-contain"
              />
            ) : (
              <div className="flex min-h-64 items-center justify-center text-hmi-body text-ca-ink-muted">
                No reference image on this rule set.
              </div>
            )}
          </Section>

          <div className="flex min-h-[24rem] flex-col overflow-hidden rounded-lg border border-ca-border">
            <RightRail
              rules={rules}
              selectedIds={selectedIds}
              onSelect={railHandlers.onSelect}
              onToggleHidden={railHandlers.onToggleHidden}
              onToggleLocked={railHandlers.onToggleLocked}
              onReorder={railHandlers.onReorder}
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
      <DesignModeOverlay
        open={designOpen}
        imageRef={ruleset.imageRef ?? null}
        suggestedName={`${ruleset.name} shape`}
        onClose={() => setDesignOpen(false)}
      />
      <ValidateAgainstImageDialog
        open={validateOpen}
        rulesetId={rulesetId}
        rules={rules}
        defaultImageRef={ruleset.imageRef ?? null}
        onClose={() => setValidateOpen(false)}
      />
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
