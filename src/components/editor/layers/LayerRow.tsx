// Plan 35 step 9: LayerRow. Photoshop-style row for a single rule.
// Renders: drag handle (visual only until step 10), kind badge,
// inline-editable name, hidden meta, visibility toggle, lock toggle,
// delete button. Composes existing hmi editor tokens.
import { forwardRef, useRef, type CSSProperties } from "react";
import { Copy, Eye, EyeOff, GripVertical, Link2, Lock, Pencil, Trash2, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { editorKindLabel } from "@/lib/editor/tools";
import { KIND_ICON, KIND_COLOR } from "@/lib/editor/kind-icons";
import type { EditorRule } from "@/lib/editor/types";
import { SelectionModeType } from "@/lib/enums/editor";
import { ValidationChip } from "@/components/editor/validation/ValidationChip";
import { InlineEdit, type InlineEditHandle } from "@/components/ui/InlineEdit";
import { openRuleBus } from "@/lib/editor/selection/open-bus";

export interface LayerRowProps {
  rule: EditorRule;
  selected: boolean;
  focused: boolean;
  indented?: boolean;
  /**
   * 1-based execution order in the ruleset. Rules run top-to-bottom, so
   * this number reflects the position of `rule` inside the store's
   * `rules` array. Rendered as a small badge on the row so operators can
   * see the run order at a glance without opening a separate panel.
   */
  orderIndex?: number;
  /** Total rules; used to pad the order badge width and for tooltips. */
  orderTotal?: number;
  /**
   * Plan 67 step 23. When the row's rule is a "reference" clone
   * (`rule.sourceRuleId` set), pass the resolved source rule so the row
   * can render a chain badge with the source name in its tooltip.
   */
  sourceRule?: EditorRule | null;
  onSelect: (mode: SelectionModeType) => void;
  onToggleHidden: () => void;
  onToggleLocked: () => void;
  onRename: (nextName: string) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  /** Step 10 wiring: drag/drop and Alt+Arrow keyboard reorder. */
  dragHandleProps?: {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    "aria-grabbed": boolean;
  };
  dropTargetProps?: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  dropIndicator?: "before" | "after" | "into" | null;
  onReorderKey?: (e: React.KeyboardEvent) => void;
  ariaGrabbed?: boolean;
}

function getLayerRowClassName(
  selected: boolean,
  isHidden: boolean,
  dropIndicator: "before" | "after" | "into" | null,
  ariaGrabbed: boolean,
): string {
  const classes = ["editor-rule-row"];

  if (selected) classes.push("editor-rule-row-selected");

  if (isHidden) classes.push("opacity-60");

  if (dropIndicator === "before") classes.push("editor-rule-row-drop-before");

  if (dropIndicator === "after") classes.push("editor-rule-row-drop-after");

  if (dropIndicator === "into") classes.push("editor-rule-row-drop-into");

  if (ariaGrabbed) classes.push("ring-2 ring-offset-2 ring-[var(--ca-focus)]");

  return classes.join(" ");
}

export const LayerRow = forwardRef<HTMLDivElement, LayerRowProps>(function LayerRow(
  {
    rule,
    selected,
    focused,
    indented,
    orderIndex,
    orderTotal,
    sourceRule,
    onSelect,
    onToggleHidden,
    onToggleLocked,
    onRename,
    onDelete,
    onDuplicate,
    dragHandleProps,
    dropTargetProps,
    dropIndicator,
    onReorderKey,
    ariaGrabbed,
  },
  ref,
) {
  const IconHidden = rule.isHidden ? EyeOff : Eye;
  const IconLocked = rule.isLocked ? Lock : Unlock;
  const KindIcon = KIND_ICON[rule.kind];
  const badgeStyle = { "--kind-color": KIND_COLOR[rule.kind] } as CSSProperties;

  // Plan 100 step 20: unified rename via InlineEdit. F2 and dbl-click use
  // the imperative handle so we never diverge from the primitive's
  // Enter/Escape/blur semantics or its error-logged commit path.
  const renameRef = useRef<InlineEditHandle>(null);

  // F2 rename on the focused row. `onReorderKey` handles Alt+Arrow reorder;
  // we chain into it so both hotkeys coexist. Locked rules are skipped by
  // the primitive itself (`disabled`).
  const onRowKey = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case KeyboardKeyType.F2:
        if (!rule.isLocked && renameRef.current?.isEditing() === false) {
          e.preventDefault();
          e.stopPropagation();
          renameRef.current?.beginEdit();

          return;
        }

        break;
      case KeyboardKeyType.Enter:
        if (renameRef.current?.isEditing() === false) {
          e.preventDefault();
          e.stopPropagation();
          openRuleBus.emit(rule.id);

          return;
        }

        break;
    }

    onReorderKey?.(e);
  };

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={selected}
      aria-grabbed={ariaGrabbed}
      aria-label={`${editorKindLabel(rule.kind)} ${rule.name} at ${Math.round(rule.x)}, ${Math.round(rule.y)}`}
      id={`layer-row-${rule.id}`}
      data-rule-id={rule.id}
      data-focused={focused ? "true" : undefined}
      data-selected={selected ? "true" : undefined}
      className={getLayerRowClassName(
        selected,
        !!rule.isHidden,
        dropIndicator ?? null,
        !!ariaGrabbed,
      )}
      style={indented ? { paddingLeft: "1.75rem" } : undefined}
      {...(dropTargetProps ?? {})}
    >
      <span
        className="editor-rule-icon cursor-grab"
        title="Drag layer"
        aria-hidden
        data-layer-drag-handle
        {...(dragHandleProps ?? {})}
      >
        <GripVertical size={16} />
      </span>
      {typeof orderIndex === "number" ? (
        <span
          data-testid="layer-order-badge"
          data-order-index={orderIndex}
          aria-label={`Run order ${orderIndex}${
            typeof orderTotal === "number" ? ` of ${orderTotal}` : ""
          }`}
          title={`Execution order: ${orderIndex}${
            typeof orderTotal === "number" ? ` / ${orderTotal}` : ""
          }. Drag or Alt+Arrow to change.`}
          className="editor-rule-order-badge"
        >
          {orderIndex}
        </span>
      ) : null}
      <button
        type="button"
        aria-pressed={selected}
        aria-label={`${rule.name}, ${editorKindLabel(rule.kind)}`}
        tabIndex={focused ? 0 : -1}
        onClick={(e) => {
          onSelect(
            e.shiftKey
              ? SelectionModeType.Range
              : e.metaKey || e.ctrlKey
                ? SelectionModeType.Toggle
                : SelectionModeType.Replace,
          );
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          renameRef.current?.beginEdit();
        }}
        onKeyDown={onRowKey}
        className="editor-rule-row-main focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
        title={rule.name}
      >
        <span className="editor-rule-kind-badge" style={badgeStyle} aria-hidden>
          <KindIcon size={18} strokeWidth={2.25} />
        </span>
        <span className="min-w-0">
          <InlineEdit
            ref={renameRef}
            value={rule.name}
            ariaLabel={`Rename ${rule.name}`}
            disabled={rule.isLocked}
            onCommit={(next) => onRename(next)}
            inputClassName="w-full bg-ca-panel-2 border border-ca-border px-hmi-1 text-hmi-body text-ca-ink"
          >
            <span className="flex min-w-0 items-center gap-hmi-2">
              <span
                className={`editor-rule-name min-w-0 flex-1 ${rule.isLocked ? "text-ca-ink-muted" : ""}`}
              >
                {rule.name}
              </span>
              {rule.sourceRuleId ? (
                <span
                  className="editor-rule-icon shrink-0 text-ca-select"
                  title={
                    sourceRule
                      ? `Reference of "${sourceRule.name}"`
                      : `Reference of ${rule.sourceRuleId}`
                  }
                  aria-label="Reference clone"
                  data-layer-reference-badge
                >
                  <Link2 size={12} />
                </span>
              ) : null}
              <span className="shrink-0">
                <ValidationChip ruleId={rule.id} />
              </span>
            </span>
          </InlineEdit>
          <span className="editor-rule-meta" aria-hidden>
            {editorKindLabel(rule.kind)}
            {rule.isLocked ? " · Locked" : ""}
            {rule.isHidden ? " · Hidden" : ""}
          </span>
        </span>
      </button>
      <div className="editor-rule-actions" aria-label="Layer row actions">
        <button
          type="button"
          aria-label={rule.isHidden ? `Show ${rule.name}` : `Hide ${rule.name}`}
          aria-pressed={rule.isHidden}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onToggleHidden();
          }}
          className="editor-rule-icon"
          data-optional
        >
          <IconHidden size={14} />
        </button>
        <button
          type="button"
          aria-label={rule.isLocked ? `Unlock ${rule.name}` : `Lock ${rule.name}`}
          aria-pressed={rule.isLocked}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLocked();
          }}
          className="editor-rule-icon"
          data-optional
        >
          <IconLocked size={14} />
        </button>
        {onDuplicate ? (
          <button
            type="button"
            aria-label={`Duplicate ${rule.name}`}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="editor-rule-icon"
            title="Duplicate layer"
          >
            <Copy size={14} />
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            aria-label={
              rule.isLocked ? `Cannot delete locked rule ${rule.name}` : `Delete ${rule.name}`
            }
            disabled={rule.isLocked}
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="editor-rule-icon editor-rule-icon-danger disabled:opacity-30"
            title={rule.isLocked ? "Unlock to delete" : "Delete layer"}
          >
            <Trash2 size={14} />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={`Open editor for ${rule.name}`}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            openRuleBus.emit(rule.id);
          }}
          className="editor-rule-icon"
          title="Open rule editor (Enter)"
          data-layer-edit-button
          data-optional
        >
          <Pencil size={13} />
        </button>
      </div>
    </div>
  );
});
