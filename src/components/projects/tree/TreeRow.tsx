// Plan 03 step 2. Single tree row (all depths).
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §4.2.
// 32px fixed row: indent guide rails (visible height) + chevron +
// depth badge (L0/L1/L2) + icon + name + count pill + verdict pill.
// Selection: bg-ca-select/20 with a 2px left indicator (no box-shadow).

import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TreeNodeKindType } from "@/lib/recipes/tree-types";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export interface TreeRowProps {
  depth: 0 | 1 | 2;
  kind: TreeNodeKindType;
  name: string;
  icon: ReactNode;
  countLabel?: string;
  verdictLabel?: string;
  isExpanded: boolean;
  hasChildren: boolean;
  isSelected: boolean;
  isEnabled: boolean;
  onToggle: () => void;
  onSelect: () => void;
  /** Step 3: Alt+Arrow keyboard moves. Omitted = keyboard DnD inert. */
  onMoveKey?: (direction: "up" | "down" | "left" | "right") => void;
}

function GuideRails({ depth }: { depth: number }): React.JSX.Element {
  return (
    <>
      {Array.from({ length: depth }).map((_, level) => (
        <span
          key={level}
          aria-hidden
          className="h-full w-4 shrink-0 border-l border-ca-border"
        />
      ))}
    </>
  );
}

export function TreeRow(props: TreeRowProps): React.JSX.Element {
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (KeyboardKeyType.isEnterOrSpace(event.key)) {
      event.preventDefault();
      props.onSelect();

      return;
    }

    if (event.altKey && props.onMoveKey) {
      if (KeyboardKeyType.isArrowUp(event.key)) {
        event.preventDefault();
        props.onMoveKey("up");
      } else if (KeyboardKeyType.isArrowDown(event.key)) {
        event.preventDefault();
        props.onMoveKey("down");
      } else if (KeyboardKeyType.isArrowLeft(event.key)) {
        event.preventDefault();
        props.onMoveKey("left");
      } else if (KeyboardKeyType.isArrowRight(event.key)) {
        event.preventDefault();
        props.onMoveKey("right");
      }
    }
  };

  return (
    <div
      role="treeitem"
      aria-level={props.depth + 1}
      aria-selected={props.isSelected}
      aria-expanded={props.hasChildren ? props.isExpanded : undefined}
      tabIndex={0}
      onClick={props.onSelect}
      onKeyDown={handleKeyDown}
      className={`relative flex h-8 cursor-pointer items-center gap-1.5 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ca-select ${
        props.isSelected ? "bg-ca-select/20" : "hover:bg-ca-panel-2"
      } ${props.isEnabled ? "" : "opacity-50"}`}
    >
      {props.isSelected ? (
        <span aria-hidden className="absolute left-0 top-0 h-full w-0.5 bg-ca-select" />
      ) : null}
      <GuideRails depth={props.depth} />
      {props.hasChildren ? (
        <button
          type="button"
          aria-label={props.isExpanded ? `Collapse ${props.name}` : `Expand ${props.name}`}
          onClick={(event) => {
            event.stopPropagation();
            props.onToggle();
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-ca-ink-muted hover:bg-ca-panel hover:text-ca-ink"
        >
          {props.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : (
        <span aria-hidden className="w-6 shrink-0" />
      )}
      <span
        aria-hidden
        className="shrink-0 rounded bg-ca-panel-2 px-1 font-mono text-[10px] leading-4 text-ca-ink-muted"
      >
        L{props.depth}
      </span>
      <span aria-hidden className="shrink-0 text-ca-ink-muted">
        {props.icon}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-ca-ink">{props.name}</span>
      {props.countLabel ? (
        <span className="shrink-0 rounded bg-ca-panel-2 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-ca-ink-muted">
          {props.countLabel}
        </span>
      ) : null}
      {props.kind === TreeNodeKindType.Rule ? (
        <span className="shrink-0 rounded border border-ca-border px-1.5 py-0.5 font-mono text-[10px] text-ca-ink-muted">
          {props.verdictLabel ?? "—"}
        </span>
      ) : null}
    </div>
  );
}
