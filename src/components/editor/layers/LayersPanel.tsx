import { ReorderPositionType } from "@/lib/editor/store/rules-slice";
// Plan 35 step 9: LayersPanel. Photoshop-style ordered list of rules
// with optional groups. Rules and categories render as separate sections,
// but categories use the same row interactions as rules.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen, Layers as LayersIcon } from "lucide-react";
import type { EditorRule } from "@/lib/editor/types";
import type { RuleGroup } from "@/lib/editor/store/rules-slice";
import { LayerRow } from "./LayerRow";
import { LayersToolbar, type LayersImportedSvg } from "./LayersToolbar";
import { SelectionModeType } from "@/lib/enums/editor";
import { useLayerDnd, type LayerDndReorderArgs } from "@/hooks/editor/useLayerDnd";
import { useKeyboardDnd } from "@/lib/editor/dnd/keyboard-controller";
import { DndModeType } from "@/types/rules/DndMode";
import { DndAxisType } from "@/types/rules/DndAxis";
import { DndStepType } from "@/lib/editor/dnd/constants";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { HtmlTag } from "@/lib/enums/html";

export interface LayersPanelProps {
  rules: readonly EditorRule[];
  selectedIds: readonly string[];
  groups: readonly RuleGroup[];
  onSelect: (id: string, mode: SelectionModeType) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  /** Step 10/11 wiring. When omitted, DnD and keyboard reorder are inert. */
  onReorder?: (args: LayerDndReorderArgs) => void;
  /** Step 16 shortcuts. Omit any handler to leave that shortcut inert. */
  onGroupSelected?: () => void;
  onUngroupSelected?: () => void;
  onMergeSelected?: () => void;
  onDeleteSelected?: () => void;
}

interface FlatEntry {
  kind: "group-header" | "layer";
  id: string;
  groupId?: string;
  rule?: EditorRule;
  group?: RuleGroup;
  indented?: boolean;
}

export enum LayerSectionKindType {
  Rules = "rules",
  Categories = "categories",
}
export type LayerSectionKind = LayerSectionKindType;

interface LayerSection {
  kind: LayerSectionKind;
  label: string;
  count: number;
  entries: FlatEntry[];
}

export function LayersPanel({
  rules,
  selectedIds,
  groups,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onRename,
  onDelete,
  onDuplicate,
  onReorder,
  onGroupSelected,
  onUngroupSelected,
  onMergeSelected,
  onDeleteSelected,
}: LayersPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const focusedId = selectedIds[selectedIds.length - 1] ?? rules[0]?.id ?? null;
  const keyboardDnd = useKeyboardDnd();

  // Plan 100 Phase E step 46: selection-driven scroll. When the canvas
  // selection updates focusedId, ensure that row is visible in the
  // Layers panel. Uses `scrollIntoView({ block: "nearest" })` so long
  // lists follow the user's ROI clicks without ping-ponging the
  // scrollport. Silent-failure guard: log if the ref map is missing an
  // entry so we can catch orphaned focusedIds in the wild.
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const registerRowRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) rowRefs.current.set(id, node);
    else rowRefs.current.delete(id);
  }, []);
  const isNonFocusedId = !focusedId;

  useEffect(() => {
    if (isNonFocusedId) return;
    const node = rowRefs.current.get(focusedId);

    if (!node) {
      console.info("[layers/scroll] focused row not mounted", { focusedId });

      return;
    }
    // Defensive: `scrollIntoView` is not implemented in jsdom and some
    // older WebKit builds. Scrolling is a nice-to-have here (keeps the
    // focused row visible), so we log and skip instead of throwing and
    // taking down the whole panel render.
    if (typeof node.scrollIntoView !== "function") {
      console.info("[layers/scroll] scrollIntoView unavailable in this environment", {
        focusedId,
      });

      return;
    }

    node.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focusedId]);

  const ruleEntries = useMemo<FlatEntry[]>(() => {
    const grouped = new Set<string>();
    const out: FlatEntry[] = [];
    for (const g of groups) {
      const ruleIds = g.ruleIds.filter((id) => rules.some((r) => r.id === id && !r.isCategory));

      if (ruleIds.length === 0) continue;
      out.push({ kind: "group-header", id: `g:${g.id}`, groupId: g.id, group: { ...g, ruleIds } });

      if (!collapsed[g.id]) {
        for (const rid of ruleIds) {
          const r = rules.find((rr) => rr.id === rid);

          if (r) {
            out.push({ kind: "layer", id: `r:${r.id}`, rule: r, indented: true });
            grouped.add(r.id);
          }
        }
      } else {
        for (const rid of ruleIds) grouped.add(rid);
      }
    }

    for (const r of rules) {
      if (r.isCategory) continue;

      if (grouped.has(r.id)) continue;
      out.push({ kind: "layer", id: `r:${r.id}`, rule: r });
    }

    return out;
  }, [rules, groups, collapsed]);

  const categoryEntries = useMemo<FlatEntry[]>(
    () =>
      rules
        .filter((r) => r.isCategory)
        .map((rule) => ({ kind: "layer", id: `c:${rule.id}`, rule })),
    [rules],
  );

  const sections = useMemo<LayerSection[]>(() => {
    const ruleCount = ruleEntries.filter((e) => e.kind === "layer").length;
    const categoryCount = categoryEntries.length;

    return [
      { kind: LayerSectionKindType.Rules, label: "Rules", count: ruleCount, entries: ruleEntries },
      {
        kind: LayerSectionKindType.Categories,
        label: "Categories",
        count: categoryCount,
        entries: categoryEntries,
      },
    ];
  }, [categoryEntries, ruleEntries]);

  const entries = useMemo(() => sections.flatMap((section) => section.entries), [sections]);

  const orderedRuleIds = useMemo(
    () => entries.filter((e) => e.kind === "layer" && e.rule).map((e) => e.rule!.id),
    [entries],
  );
  const groupedIds = useMemo(() => {
    const s = new Set<string>();
    for (const g of groups) for (const id of g.ruleIds) s.add(id);

    return s;
  }, [groups]);
  const noop = () => {};
  const dnd = useLayerDnd({
    orderedRuleIds,
    reorder: onReorder ?? noop,
    isGroupMember: (id) => groupedIds.has(id),
  });

  const dropIndex = useMemo(() => {
    if (!dnd.hover) return null;
    const idx = orderedRuleIds.indexOf(dnd.hover.targetId);

    if (idx < 0) return null;

    if (dnd.hover.position === "into") return idx;

    return dnd.hover.position === "before" ? idx : idx + 1;
  }, [dnd.hover, orderedRuleIds]);
  const hoverRule = dnd.hover ? (rules.find((r) => r.id === dnd.hover!.targetId) ?? null) : null;

  const handleListDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (!dnd.draggingId) return;
      setPointer({ x: e.clientX, y: e.clientY });
    },
    [dnd.draggingId],
  );
  const clearPointer = useCallback(() => setPointer(null), []);

  const handlePanelKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement | null;
      // Never hijack keys while renaming a layer or typing anywhere.
      if (
        target &&
        (target.tagName === HtmlTag.Input ||
          target.tagName === HtmlTag.Textarea ||
          target.isContentEditable)
      ) {
        return;
      }

      // If dragging via keyboard, hijack navigation
      if (DndModeType.isKeyboardGrabbed(keyboardDnd.mode)) {
        e.preventDefault();
        e.stopPropagation();

        if (KeyboardKeyType.isEscape(e.key)) {
          keyboardDnd.cancel();

          return;
        }

        if (KeyboardKeyType.isEnterOrSpace(e.key)) {
          keyboardDnd.drop();

          return;
        }

        if (KeyboardKeyType.isArrowUp(e.key))
          keyboardDnd.move(DndAxisType.Y, -1, e.shiftKey ? DndStepType.Coarse : DndStepType.Fine);

        if (KeyboardKeyType.isArrowDown(e.key))
          keyboardDnd.move(DndAxisType.Y, 1, e.shiftKey ? DndStepType.Coarse : DndStepType.Fine);

        if (KeyboardKeyType.isArrowLeft(e.key))
          keyboardDnd.move(DndAxisType.X, -1, e.shiftKey ? DndStepType.Coarse : DndStepType.Fine);

        if (KeyboardKeyType.isArrowRight(e.key))
          keyboardDnd.move(DndAxisType.X, 1, e.shiftKey ? DndStepType.Coarse : DndStepType.Fine);

        if (KeyboardKeyType.isHome(e.key)) keyboardDnd.jumpEdge(DndAxisType.X, false);

        if (KeyboardKeyType.isEnd(e.key)) keyboardDnd.jumpEdge(DndAxisType.X, true);

        if (KeyboardKeyType.isPageUp(e.key)) keyboardDnd.jumpEdge(DndAxisType.Y, false);

        if (KeyboardKeyType.isPageDown(e.key)) keyboardDnd.jumpEdge(DndAxisType.Y, true);

        return; // Consume the event if grabbed
      }

      const mod = e.metaKey || e.ctrlKey;

      if (KeyboardKeyType.isEnterOrSpace(e.key)) {
        if (focusedId) {
          e.preventDefault();
          const rule = rules.find((r) => r.id === focusedId);

          if (rule && !rule.isLocked) {
            keyboardDnd.grab(rule);
          }
        }

        return;
      }

      if (KeyboardKeyType.isEscape(e.key)) {
        keyboardDnd.cancel();

        return;
      }

      if ((KeyboardKeyType.isDelete(e.key) || KeyboardKeyType.isBackspace(e.key)) && !mod) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        console.info("[layers/shortcut] delete", { count: selectedIds.length });
        onDeleteSelected?.();

        return;
      }

      if (mod && (KeyboardKeyType.isG(e.key) || KeyboardKeyType.isGUpper(e.key))) {
        e.preventDefault();

        if (e.shiftKey) {
          console.info("[layers/shortcut] ungroup");
          onUngroupSelected?.();
        } else {
          console.info("[layers/shortcut] group", { count: selectedIds.length });
          onGroupSelected?.();
        }

        return;
      }

      if (mod && (KeyboardKeyType.isE(e.key) || KeyboardKeyType.isEUpper(e.key))) {
        e.preventDefault();
        console.info("[layers/shortcut] merge", { count: selectedIds.length });
        onMergeSelected?.();

        return;
      }

      if (KeyboardKeyType.isPageUp(e.key) || KeyboardKeyType.isPageDown(e.key)) {
        if (focusedId && onReorder) {
          e.preventDefault();
          const isUp = KeyboardKeyType.isPageUp(e.key);
          const tgtIdx = isUp ? 0 : orderedRuleIds.length - 1;
          const tgtId = orderedRuleIds[tgtIdx];

          if (tgtId && tgtId !== focusedId) {
            onReorder({
              sourceId: focusedId,
              targetId: tgtId,
              position: isUp ? ReorderPositionType.Before : ReorderPositionType.After,
            });
          }
        }

        return;
      }

      if (KeyboardKeyType.isArrowUpOrDown(e.key)) {
        if (orderedRuleIds.length === 0) return;
        e.preventDefault();
        const cursor = focusedId ?? orderedRuleIds[0];
        const idx = orderedRuleIds.indexOf(cursor);
        const next = KeyboardKeyType.isArrowUp(e.key)
          ? orderedRuleIds[Math.max(0, idx - 1)]
          : orderedRuleIds[Math.min(orderedRuleIds.length - 1, idx + 1)];

        if (!next || next === cursor) return;
        onSelect(next, e.shiftKey ? SelectionModeType.Range : SelectionModeType.Replace);
      }
    },
    [
      selectedIds,
      orderedRuleIds,
      focusedId,
      onSelect,
      onGroupSelected,
      onUngroupSelected,
      onMergeSelected,
      onDeleteSelected,
    ],
  );

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-hmi-2 p-hmi-6 text-center text-ca-ink-muted">
        <LayersIcon size={28} aria-hidden />
        <p className="text-hmi-body">No layers yet.</p>
        <p className="text-hmi-caption">Draw a rule on the canvas to add one.</p>
      </div>
    );
  }

  return (
    <div
      className="editor-layers-panel motion-panel-in flex min-h-0 flex-1 flex-col outline-none"
      role="region"
      aria-label="Layers"
      tabIndex={0}
      onKeyDown={handlePanelKeyDown}
    >
      {/* Plan 87 UI cleanup: the outer "Layers · Run order" strip was redundant
          with the panel title and the two sticky section heads below. The
          section heads already show counts. Panel title lives on the window
          chrome. Removing this band reclaims 26px of vertical space and
          eliminates the "5 stacked headers" complaint. */}

      <div
        className="relative min-h-0 flex-1 overflow-y-auto"
        role="listbox"
        aria-label="Layer list"
        aria-activedescendant={focusedId ? `layer-row-${focusedId}` : undefined}
        onDragOver={handleListDragOver}
        onDragLeave={clearPointer}
        onDrop={clearPointer}
      >
        {sections.map((section) => (
          <LayerTypeSection key={section.kind} section={section}>
            {section.entries.map((e) =>
              e.kind === "group-header" && e.group ? (
                <GroupHeader
                  key={e.id}
                  group={e.group}
                  collapsed={Boolean(collapsed[e.group.id])}
                  onToggle={() => setCollapsed((c) => ({ ...c, [e.group!.id]: !c[e.group!.id] }))}
                />
              ) : e.rule ? (
                <LayerRow
                  key={e.id}
                  ref={(node) => registerRowRef(e.rule!.id, node)}
                  rule={e.rule}
                  orderIndex={rules.indexOf(e.rule) + 1}
                  orderTotal={rules.length}
                  selected={selectedIds.includes(e.rule.id)}
                  focused={e.rule.id === focusedId}
                  indented={e.indented}
                  sourceRule={
                    e.rule.sourceRuleId
                      ? (rules.find((r) => r.id === e.rule!.sourceRuleId) ?? null)
                      : null
                  }
                  onSelect={(mode) => onSelect(e.rule!.id, mode)}
                  onToggleHidden={() => onToggleHidden(e.rule!.id)}
                  onToggleLocked={() => onToggleLocked(e.rule!.id)}
                  onRename={(name) => onRename(e.rule!.id, name)}
                  onDelete={onDelete ? () => onDelete(e.rule!.id) : undefined}
                  onDuplicate={onDuplicate ? () => onDuplicate(e.rule!.id) : undefined}
                  dragHandleProps={onReorder ? dnd.getDraggableProps(e.rule.id) : undefined}
                  dropTargetProps={onReorder ? dnd.getDropTargetProps(e.rule.id) : undefined}
                  dropIndicator={dnd.hover?.targetId === e.rule.id ? dnd.hover.position : null}
                  ariaGrabbed={keyboardDnd.grabbedId === e.rule.id}
                  onReorderKey={
                    onReorder
                      ? (ev) => {
                          dnd.handleKeyDown(e.rule!.id, ev);
                        }
                      : undefined
                  }
                />
              ) : null,
            )}
          </LayerTypeSection>
        ))}
        {dnd.draggingId && pointer && hoverRule ? (
          <div
            className="pointer-events-none fixed z-50 rounded-md border border-ca-border bg-ca-panel-2/95 px-hmi-2 py-hmi-1 text-hmi-caption text-ca-ink shadow-lg"
            style={{ left: pointer.x + 14, top: pointer.y + 14 }}
            aria-live="polite"
            data-testid="layer-dnd-cursor"
          >
            <div className="font-semibold">
              {dnd.hover?.position === "into"
                ? "Into"
                : dnd.hover?.position === "before"
                  ? "Above"
                  : "Below"}{" "}
              <span className="text-ca-ink-muted">"{hoverRule.name ?? hoverRule.id}"</span>
            </div>
            <div className="text-ca-ink-muted">
              Position {dropIndex !== null ? dropIndex + 1 : "?"} of {orderedRuleIds.length} ·{" "}
              {pointer.x},{pointer.y}
            </div>
          </div>
        ) : null}
        {keyboardDnd.announcement ? (
          <div aria-live="polite" className="sr-only">
            {keyboardDnd.announcement}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LayerTypeSection({ section, children }: { section: LayerSection; children: ReactNode }) {
  const Icon = section.kind === "categories" ? FolderOpen : LayersIcon;

  return (
    <section aria-label={section.label} data-layer-section={section.kind}>
      <div className="editor-layer-section-head">
        <span className="inline-flex items-center gap-hmi-1">
          <Icon size={13} aria-hidden />
          {section.label}
        </span>
        <span aria-live="polite">{section.count}</span>
      </div>
      {section.count === 0 ? (
        <div className="py-hmi-1 pl-[12px] pr-hmi-3 text-hmi-caption text-ca-ink-muted opacity-70">
          None.
        </div>
      ) : (
        children
      )}
    </section>
  );
}

function GroupHeader({
  group,
  collapsed,
  onToggle,
}: {
  group: RuleGroup;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const Chevron = collapsed ? ChevronRight : ChevronDown;

  return (
    <div role="listitem" className="editor-layer-group-row">
      <Folder size={16} aria-hidden className="text-ca-ink-muted" />
      <span className="min-w-0 flex-1 truncate font-semibold">{group.name}</span>
      <span className="text-hmi-caption text-ca-ink-muted">{group.ruleIds.length}</span>
      <button
        type="button"
        aria-expanded={!collapsed}
        aria-label={collapsed ? `Expand group ${group.name}` : `Collapse group ${group.name}`}
        onClick={onToggle}
        className="editor-rule-icon"
      >
        <Chevron size={16} />
      </button>
    </div>
  );
}
