import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 100 step 18 (Phase C): unified inline-edit primitive per V4 §14.
// Consumers (LayerRow, SelectionOverlay name chip, InspectorSurface title)
// share one implementation so focus, blur, Enter/Escape, and F2 semantics
// stay identical across the app.
//
// Behavior:
// - Displays `children` as the rendered chip/label. Double-clicking begins
//   editing. The parent can also start editing imperatively via the ref
//   (`ref.current.beginEdit()`), which is how F2 triggers rename.
// - On commit (Enter or blur) calls `onCommit(trimmedNext)` only when the
//   trimmed draft is non-empty AND differs from `value`. Escape reverts.
// - Errors thrown from `onCommit` are logged with context per §21; the
//   editor still exits so the user is not trapped in a stuck input.
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { clearInlineEditDirty, markInlineEditDirty } from "@/lib/editor/inline-edit-registry";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export interface InlineEditHandle {
  beginEdit: () => void;
  isEditing: () => boolean;
}

export interface InlineEditProps {
  value: string;
  onCommit: (next: string) => void;
  ariaLabel: string;
  children: ReactNode;
  inputClassName?: string;
  inputStyle?: CSSProperties;
  /** Called on double-click before entering edit mode (e.g. stopPropagation). */
  onEditRequest?: (e: React.MouseEvent) => void;
  disabled?: boolean;
}

export const InlineEdit = forwardRef<InlineEditHandle, InlineEditProps>(function InlineEdit(
  { value, onCommit, ariaLabel, children, inputClassName, inputStyle, onEditRequest, disabled },
  ref,
) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  // Stable per-instance token used by the dirty registry (Plan 100 §22).
  const dirtyTokenRef = useRef<symbol>(Symbol("InlineEdit"));
  const isNotEditing = !editing;

  useEffect(() => {
    if (isNotEditing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  // Publish dirty state to the shared registry so navigation / unload
  // guards can prompt the user when an editor holds an unsaved draft.
  useEffect(() => {
    const token = dirtyTokenRef.current;
    const isDirty = editing && draft.trim() !== value.trim() && draft.trim().length > 0;
    if (isDirty) markInlineEditDirty(token);
    else clearInlineEditDirty(token);
  }, [editing, draft, value]);

  // Guarantee the token is cleared on unmount, even mid-edit.
  useEffect(() => {
    const token = dirtyTokenRef.current;

    return () => clearInlineEditDirty(token);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      beginEdit: () => {
        if (disabled) return;
        setDraft(value);
        setEditing(true);
      },
      isEditing: () => editing,
    }),
    [disabled, editing, value],
  );

  const commit = () => {
    setEditing(false);
    clearInlineEditDirty(dirtyTokenRef.current);
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      setDraft(value);

      return;
    }
    try {
      onCommit(trimmed);
    } catch (err) {
      ClientLogger.error("[InlineEdit] onCommit threw", {
        ariaLabel,
        value,
        next: trimmed,
        error: err,
      });
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (KeyboardKeyType.isEnter(e.key)) {
      e.preventDefault();
      commit();
    } else if (KeyboardKeyType.isEscape(e.key)) {
      e.preventDefault();
      setDraft(value);
      setEditing(false);
      clearInlineEditDirty(dirtyTokenRef.current);
    }
    e.stopPropagation();
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKey}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className={inputClassName}
        style={inputStyle}
        aria-label={ariaLabel}
        data-inline-edit-input
      />
    );
  }

  return (
    <span
      data-inline-edit
      onDoubleClick={(e) => {
        if (disabled) return;
        onEditRequest?.(e);
        setDraft(value);
        setEditing(true);
      }}
    >
      {children}
    </span>
  );
});
