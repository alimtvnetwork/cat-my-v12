import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 35 step 13: InspectorSurface. Store-connected composition of
// LayersToolbar + LayersPanel + PropertiesPanel that RightRail (step 14)
// will drop in place of the legacy RuleList + inline editor stack. Kept
// as its own file so step 13 does not disturb `EditorSetupExperience`
// or `RightRail`, and so tests can mount the full inspector in isolation.
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { nextRuleId } from "@/lib/editor/store/ids";
import type { EditorRect, EditorRule } from "@/lib/editor/types";
import { LayersPanel, LayersToolbar, type LayersImportedSvg } from "./layers";
import { SelectionModeType, PresenceModeType } from "@/lib/enums/editor";
import { PropertiesPanel } from "./PropertiesPanel";
import { readConditions, writeConditions } from "./panels/AcceptancePanel";
import { PreviewSettingsPanel } from "./PreviewSettingsPanel";
// CollapsiblePanelSection wrapper removed (v3.947.0): the outer panel already provides the title.

export interface InspectorSurfaceProps {
  imageBounds: EditorRect;
}

export function InspectorSurface({ imageBounds }: InspectorSurfaceProps): React.JSX.Element | null {
  const rules = useRulesStore((s) => s.rules);
  const selectedIds = useRulesStore((s) => s.selectedIds);
  const groups = useRulesStore((s) => s.groups);

  const setSelection = useRulesStore((s) => s.setSelection);
  const setHidden = useRulesStore((s) => s.setHidden);
  const setLocked = useRulesStore((s) => s.setLocked);
  const deleteRules = useRulesStore((s) => s.deleteRules);
  const duplicateRules = useRulesStore((s) => s.duplicateRules);
  const setRuleName = useRulesStore((s) => s.setRuleName);
  const setKind = useRulesStore((s) => s.setKind);
  const updateParams = useRulesStore((s) => s.updateParams);
  const setRuleBounds = useRulesStore((s) => s.setRuleBounds);
  const reorderRule = useRulesStore((s) => s.reorderRule);
  const groupSelected = useRulesStore((s) => s.groupSelected);
  const ungroup = useRulesStore((s) => s.ungroup);
  const mergeSelected = useRulesStore((s) => s.mergeSelected);

  const onSelect = useCallback(
    (id: string, mode: SelectionModeType) => {
      if (SelectionModeType.isToggle(mode)) {
        const next = selectedIds.includes(id)
          ? selectedIds.filter((s) => s !== id)
          : [...selectedIds, id];
        setSelection(next, "inspector.toggle");

        return;
      }

      if (SelectionModeType.isRange(mode) && selectedIds.length > 0) {
        const order = rules.map((r) => r.id);
        const anchorIdx = order.indexOf(selectedIds[selectedIds.length - 1]);
        const targetIdx = order.indexOf(id);

        if (anchorIdx >= 0 && targetIdx >= 0) {
          const [lo, hi] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
          setSelection(order.slice(lo, hi + 1), "inspector.range");

          return;
        }
      }

      setSelection([id], "inspector.replace");
    },
    [rules, selectedIds, setSelection],
  );

  const onGroup = useCallback(() => {
    groupSelected(`g-${nextRuleId()}`, `Group ${groups.length + 1}`);
  }, [groupSelected, groups.length]);

  const onUngroup = useCallback(() => {
    const targets = groups
      .filter((g) => g.ruleIds.some((id) => selectedIds.includes(id)))
      .map((g) => g.id);

    if (targets.length > 0) ungroup(targets);
  }, [groups, selectedIds, ungroup]);

  const onDeleteSelected = useCallback(() => {
    if (selectedIds.length > 0) deleteRules(selectedIds.slice());
  }, [selectedIds, deleteRules]);

  // Quick "+ Present" / "+ Absent" stamp from the layers toolbar. Appends
  // a new acceptance condition to every selected, unlocked rule, matching
  // the AcceptancePanel list contract.
  const onSetAcceptance = useCallback(
    (mode: PresenceModeType.Present | PresenceModeType.Absent) => {
      selectedIds.forEach((id) => {
        const rule = rules.find((r) => r.id === id);

        if (!rule || rule.isLocked) return;
        const list = readConditions(rule);
        const next = [
          ...list,
          {
            id: `ac-${Math.random().toString(36).slice(2, 10)}`,
            presence: mode,
            targetColor: "",
            similarityPct: 80,
          },
        ];
        updateParams(id, writeConditions(rule, next));
      });
    },
    [rules, selectedIds, updateParams],
  );

  /**
   * Plan 66 step 12 (RE-09): stamp an imported SVG onto every selected,
   * unlocked rule. Stored as three primitive params so the rest of the
   * rule pipeline (EditorRuleParams is Record<string, primitive>) can
   * consume them without schema surgery. `shapeSvg` holds the raw source
   * for round-trip; `shapeSvgPath` is the parsed absolute-command path;
   * `shapeSvgViewBoxW/H` carry the viewBox extents.
   */
  const onImportSvg = useCallback(
    (payload: LayersImportedSvg) => {
      let applied = 0;
      selectedIds.forEach((id) => {
        const rule = rules.find((r) => r.id === id);

        if (!rule || rule.isLocked) return;
        updateParams(id, {
          shapeSvg: payload.svg,
          shapeSvgPath: payload.svgPath,
          shapeSvgViewBoxW: payload.viewBoxW,
          shapeSvgViewBoxH: payload.viewBoxH,
          shapeSvgSource: payload.source,
        });
        applied += 1;
      });
      ClientLogger.info("[inspector] shapeSvg imported", {
        fileName: payload.fileName,
        source: payload.source,
        rules: applied,
        bytes: payload.svg.length,
      });
    },
    [rules, selectedIds, updateParams],
  );

  return (
    <div className="editor-scroll-fancy flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain scroll-smooth touch-pan-y [-webkit-overflow-scrolling:touch]">
      {/* Consolidated Inspector: single panel + segmented tab bar
          (Preview | Layers | Properties). Replaces the previous three
          stacked CollapsiblePanelSection headers per user request to
          collapse chrome density. Storage key preserved as
          `inspector.main` and mirrored in WindowMenu. */}
      {/* Chrome flattened: previously wrapped in CollapsiblePanelSection "Inspector"
          which duplicated the outer panel title. Tabs are their own header. */}
      <InspectorTabs
        rules={rules}
        groups={groups}
        selectedIds={selectedIds}
        imageBounds={imageBounds}
        onSelect={onSelect}
        onGroup={onGroup}
        onUngroup={onUngroup}
        onMergeSelected={() => {
          mergeSelected();
        }}
        onDeleteSelected={onDeleteSelected}
        onSetAcceptance={onSetAcceptance}
        onImportSvg={onImportSvg}
        setHidden={setHidden}
        setLocked={setLocked}
        setRuleName={setRuleName}
        setKind={setKind}
        updateParams={updateParams}
        setRuleBounds={setRuleBounds}
        reorderRule={reorderRule}
        deleteRules={deleteRules}
        duplicateRules={duplicateRules}
      />
    </div>
  );
}

// Local segmented-tab wrapper. Kept co-located so consumers see the
// consolidated panel as a single unit; splitting into its own file is
// premature until a second surface reuses it.

interface InspectorTabsProps {
  rules: readonly EditorRule[];
  groups: ReturnType<typeof useRulesStore.getState>["groups"];
  selectedIds: readonly string[];
  imageBounds: EditorRect;
  onSelect: (id: string, mode: SelectionModeType) => void;
  onGroup: () => void;
  onUngroup: () => void;
  onMergeSelected: () => void;
  onDeleteSelected: () => void;
  onSetAcceptance: (mode: PresenceModeType.Present | PresenceModeType.Absent) => void;
  onImportSvg: (payload: LayersImportedSvg) => void;
  setHidden: (ids: string[], hidden: boolean) => void;
  setLocked: (ids: string[], locked: boolean) => void;
  setRuleName: (id: string, name: string) => void;
  setKind: ReturnType<typeof useRulesStore.getState>["setKind"];
  updateParams: ReturnType<typeof useRulesStore.getState>["updateParams"];
  setRuleBounds: ReturnType<typeof useRulesStore.getState>["setRuleBounds"];
  reorderRule: ReturnType<typeof useRulesStore.getState>["reorderRule"];
  deleteRules: (ids: string[]) => void;
  duplicateRules: ReturnType<typeof useRulesStore.getState>["duplicateRules"];
}

export enum InspectorTabType {
  Preview = "preview",
  Layers = "layers",
  Properties = "properties",
}
export type InspectorTab = InspectorTabType;

interface InspectorTabItem {
  id: InspectorTabType;
  label: string;
}

const INSPECTOR_TABS: InspectorTabItem[] = [
  { id: InspectorTabType.Preview, label: "Preview" },
  { id: InspectorTabType.Layers, label: "Layers" },
  { id: InspectorTabType.Properties, label: "Properties" },
];

function InspectorTabs(props: InspectorTabsProps) {
  const [tab, setTab] = useState<InspectorTab>(InspectorTabType.Layers);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const find = () =>
      document.querySelector<HTMLElement>('[data-panel-id="rules"] [data-inspector-tabs-mount]');
    setMount(find());
    const obs = new MutationObserver(() => setMount(find()));
    obs.observe(document.body, { childList: true, subtree: true });

    return () => obs.disconnect();
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const label = INSPECTOR_TABS.find((t) => t.id === tab)?.label ?? "Layers";
    window.dispatchEvent(new CustomEvent("hmi:inspector-tab-title", { detail: { label } }));
  }, [tab]);

  const tabStrip = (
    <div role="tablist" aria-label="Inspector sections" className="inspector-tabs-inline">
      {INSPECTOR_TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={tab === t.id}
          data-active={tab === t.id ? "true" : undefined}
          className="inspector-tab-underline hmi-focus-ring-inset"
          onClick={() => setTab(t.id)}
        >
          <span className="inspector-tab-underline-label">{t.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {mount ? createPortal(tabStrip, mount) : null}
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        data-testid="inspector-tab-body"
      >
        {tab === "preview" && <PreviewSettingsPanel />}

        {tab === "layers" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <LayersToolbar
              rules={props.rules}
              groups={props.groups}
              selectedIds={props.selectedIds}
              onGroup={props.onGroup}
              onUngroup={props.onUngroup}
              onMerge={props.onMergeSelected}
              onDelete={props.onDeleteSelected}
              onSetAcceptance={props.onSetAcceptance}
              onImportSvg={props.onImportSvg}
            />
            <LayersPanel
              rules={props.rules}
              selectedIds={props.selectedIds}
              groups={props.groups}
              onSelect={props.onSelect}
              onToggleHidden={(id) => {
                const r = props.rules.find((rr) => rr.id === id);

                if (r) props.setHidden([id], !r.isHidden);
              }}
              onToggleLocked={(id) => {
                const r = props.rules.find((rr) => rr.id === id);

                if (r) props.setLocked([id], !r.isLocked);
              }}
              onRename={(id, name) => props.setRuleName(id, name)}
              onDelete={(id) => props.deleteRules([id])}
              onDuplicate={(id) =>
                props.duplicateRules([id], {
                  newIds: [nextRuleId()],
                  imageBounds: props.imageBounds,
                })
              }
              onReorder={({ sourceId, targetId, position }) =>
                props.reorderRule(sourceId, targetId, position)
              }
              onGroupSelected={props.onGroup}
              onUngroupSelected={props.onUngroup}
              onMergeSelected={props.onMergeSelected}
              onDeleteSelected={props.onDeleteSelected}
            />
          </div>
        )}
        {tab === "properties" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PropertiesPanel
              rules={props.rules}
              selectedIds={props.selectedIds}
              imageBounds={props.imageBounds}
              onRename={props.setRuleName}
              onSetKind={props.setKind}
              onUpdateParams={props.updateParams}
              onSetBounds={(id, rect) => props.setRuleBounds(id, rect, props.imageBounds)}
              onSetHidden={(ids, hidden) => props.setHidden(ids, hidden)}
              onSetLocked={(ids, locked) => props.setLocked(ids, locked)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
