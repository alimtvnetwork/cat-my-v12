// Plan 03 step 3. @dnd-kit sortable wrapper around TreeRow.
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §5.2.
// The wrapper owns the drag ref, listeners, transform and drop
// indicators; TreeRow stays presentational. Whole-row drag; the
// PointerSensor distance-4 activation keeps clicks working.

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TreeDropPositionType, TreeNodeKindType } from "@/lib/recipes/tree-types";

export type DropIndicator = TreeDropPositionType | null;

interface DraggableTreeRowProps {
  sortableId: string;
  kind: TreeNodeKindType;
  disabled?: boolean;
  dropIndicator: DropIndicator;
  isDropValid: boolean;
  children: ReactNode;
}

function IndicatorLine(): React.JSX.Element {
  return <span aria-hidden className="absolute left-0 right-0 top-0 h-0.5 bg-ca-select" />;
}

function IndicatorLineBottom(): React.JSX.Element {
  return <span aria-hidden className="absolute bottom-0 left-0 right-0 h-0.5 bg-ca-select" />;
}

export function DraggableTreeRow(props: DraggableTreeRowProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.sortableId,
    data: { kind: props.kind },
    disabled: props.disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showBefore =
    props.dropIndicator === TreeDropPositionType.Before && props.isDropValid;
  const showAfter =
    props.dropIndicator === TreeDropPositionType.After && props.isDropValid;
  const showInto =
    props.dropIndicator === TreeDropPositionType.Into && props.isDropValid;
  const showDeny = props.dropIndicator !== null && props.isDropValid === false;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative ${isDragging ? "opacity-40" : ""} ${
        showInto ? "bg-ca-select/20" : ""
      } ${showDeny ? "outline outline-1 outline-red-500/60" : ""}`}
    >
      {showBefore ? <IndicatorLine /> : null}
      {props.children}
      {showAfter ? <IndicatorLineBottom /> : null}
    </div>
  );
}
