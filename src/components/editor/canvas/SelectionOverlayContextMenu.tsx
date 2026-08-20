import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Unlock,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  Palette,
  RotateCw,
  RotateCcw,
  Pencil,
  Group as GroupIcon,
} from "lucide-react";

import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import type { EditorRule, EditorRuleKind } from "@/lib/editor/types";
import { editorKindLabel } from "@/lib/editor/tools";
import { MenuSection, MenuItem } from "./ContextMenuItems";
import { RunOrderQuickBar } from "./RunOrderQuickBar";

import { RuleActionKindType, type RuleActionKind, KIND_ORDER } from "./SelectionOverlayConstants";
import { KIND_COLOR, KIND_ICON } from "@/lib/editor/kind-icons";
import { COLOR_SWATCHES } from "@/types/rules/RuleColor";
import { RunOrderQuickBarEdgeType } from "./types";

export interface SelectionOverlayContextMenuProps {
  contextMenu: { x: number; y: number; ruleId: string };
  menuRule: EditorRule;
  rules: EditorRule[];
  onChangeKind: (id: string, kind: EditorRuleKind) => void;
  onSetColor?: (id: string, color: string | null) => void;
  onRotate?: (id: string, degrees: number) => void;
  onAction: (id: string, action: RuleActionKind, payload?: number) => void;
  onCloseContextMenu: () => void;
}

export function SelectionOverlayContextMenu({
  contextMenu,
  menuRule,
  rules,
  onChangeKind,
  onSetColor,
  onRotate,
  onAction,
  onCloseContextMenu,
}: SelectionOverlayContextMenuProps): React.JSX.Element | null {
  const menuElRef = useRef<HTMLDivElement | null>(null);
  const [menuPos, setMenuPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    const closePointer = (e: PointerEvent) => {
      const root = menuElRef.current;
      if (root && e.target instanceof Node && root.contains(e.target)) return;
      onCloseContextMenu();
    };

    const getItems = (): HTMLElement[] => {
      const root = menuElRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>('[role="menuitem"],[role="menuitemradio"]'),
      ).filter((el) => el.hasAttribute("disabled") === false);
    };

    const groupOf = (el: HTMLElement): Element => {
      const root = menuElRef.current!;
      const g = el.closest('[role="group"]');
      return g && root.contains(g) ? g : el;
    };

    const onKey = (e: KeyboardEvent) => {
      if (KeyboardKeyType.isEscape(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        onCloseContextMenu();
        return;
      }

      const items = getItems();
      if (items.length === 0) return;
      const active = document.activeElement as HTMLElement | null;
      const idx = active ? items.indexOf(active) : -1;

      if (KeyboardKeyType.isArrowDown(e.key)) {
        e.preventDefault();
        const next = items[(idx + 1 + items.length) % items.length];
        next?.focus();
      } else if (KeyboardKeyType.isArrowUp(e.key)) {
        e.preventDefault();
        const prev = items[(idx - 1 + items.length) % items.length];
        prev?.focus();
      } else if (KeyboardKeyType.isHome(e.key)) {
        e.preventDefault();
        items[0]?.focus();
      } else if (KeyboardKeyType.isEnd(e.key)) {
        e.preventDefault();
        items[items.length - 1]?.focus();
      } else if (KeyboardKeyType.isTab(e.key)) {
        e.preventDefault();
        const currentGroup = active && items.includes(active) ? groupOf(active) : null;
        const groups: Element[] = [];
        for (const it of items) {
          const g = groupOf(it);
          if (groups.includes(g) === false) groups.push(g);
        }
        if (groups.length === 0) return;
        const gi = currentGroup ? groups.indexOf(currentGroup) : -1;
        const step = e.shiftKey ? -1 : 1;
        const nextGroup = groups[(gi + step + groups.length) % groups.length];
        const target = items.find((it) => groupOf(it) === nextGroup);
        target?.focus();
      } else if (KeyboardKeyType.isEnterOrSpace(e.key) && active && items.includes(active)) {
        e.preventDefault();
        active.click();
      }
    };

    window.addEventListener("pointerdown", closePointer, { capture: true });
    window.addEventListener("keydown", onKey, true);

    return () => {
      window.removeEventListener("pointerdown", closePointer, {
        capture: true,
      } as EventListenerOptions);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onCloseContextMenu]);

  useLayoutEffect(() => {
    const el = menuElRef.current;
    const w = el?.offsetWidth ?? 240;
    const h = el?.offsetHeight ?? 420;
    const pad = 8;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;

    let left = contextMenu.x;
    let top = contextMenu.y;

    if (left + w + pad > vw) left = Math.max(pad, contextMenu.x - w);
    if (top + h + pad > vh) top = Math.max(pad, contextMenu.y - h);

    left = Math.max(pad, Math.min(left, vw - w - pad));
    top = Math.max(pad, Math.min(top, vh - h - pad));

    setMenuPos({ left, top });
  }, [contextMenu]);

  useEffect(() => {
    if (!menuPos) return;
    const root = menuElRef.current;
    if (!root) return;
    const first = root.querySelector<HTMLElement>(
      '[role="menuitem"]:not([disabled]),[role="menuitemradio"]:not([disabled])',
    );
    first?.focus();
  }, [menuPos]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuElRef}
      role="menu"
      data-testid="rule-context-menu"
      className="pointer-events-auto fixed z-[9999] max-h-[85vh] min-w-[220px] max-w-[280px] overflow-y-auto rounded-md border border-ca-border bg-ca-panel-2 py-1 shadow-2xl text-hmi-body text-ca-ink"
      style={{
        left: menuPos?.left ?? contextMenu.x,
        top: menuPos?.top ?? contextMenu.y,
        visibility: menuPos ? "visible" : "hidden",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-between gap-2 border-b border-ca-border px-3 py-1.5 text-hmi-caption text-ca-ink-muted">
        <span className="truncate">{menuRule.name}</span>
        <span
          className="rounded-sm border border-ca-border px-1 py-0.5 font-mono text-[10px]"
          title="Execution order"
        >
          #{rules.findIndex((r) => r.id === menuRule.id) + 1}
        </span>
      </div>
      <div className="px-3 py-1.5">
        <div className="mb-1 text-hmi-caption text-ca-ink-muted">Change to</div>
        <div className="flex items-center gap-1" role="group" aria-label="Change control type">
          {KIND_ORDER.map((k) => {
            const Icon = KIND_ICON[k];
            const isCurrent = k === menuRule.kind;

            return (
              <button
                key={k}
                type="button"
                role="menuitemradio"
                aria-checked={isCurrent}
                disabled={isCurrent || menuRule.isLocked}
                title={editorKindLabel(k)}
                aria-label={`Change to ${editorKindLabel(k)}`}
                className="flex h-8 w-8 items-center justify-center rounded border border-ca-border bg-ca-panel hover:bg-ca-panel/60 disabled:cursor-not-allowed disabled:opacity-40 aria-checked:ring-2 aria-checked:ring-[var(--ca-select,#8b5cf6)]"
                style={{ color: KIND_COLOR[k] }}
                onClick={() => {
                  onChangeKind(menuRule.id, k);
                  onCloseContextMenu();
                }}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="my-1 border-t border-ca-border" />
      {onSetColor ? (
        <div className="px-3 py-1.5">
          <div className="mb-1 flex items-center gap-1 text-hmi-caption text-ca-ink-muted">
            <Palette size={12} /> Color
          </div>
          <div role="group" aria-label="Rule color" className="flex flex-wrap items-center gap-1">
            {COLOR_SWATCHES.map((c) => {
              const current = (menuRule.params?.color as string | undefined) ?? null;
              const isCurrent = current === c.value;

              return (
                <button
                  key={c.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={isCurrent}
                  aria-label={c.label}
                  title={c.label}
                  onClick={() => {
                    onSetColor(menuRule.id, c.value);
                    onCloseContextMenu();
                  }}
                  className="h-5 w-5 rounded-full border border-ca-border aria-checked:ring-2 aria-checked:ring-[var(--ca-select,#8b5cf6)]"
                  style={{
                    background: c.value ?? "#22c55e",
                  }}
                />
              );
            })}
            <label
              className="relative flex h-5 w-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-ca-border ring-offset-1 hover:ring-1 hover:ring-[var(--ca-select,#8b5cf6)]"
              title="Custom color"
              aria-label="Pick a custom color"
              style={{
                background:
                  "conic-gradient(from 0deg,#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#ef4444)",
              }}
            >
              <input
                type="color"
                value={(menuRule.params?.color as string | undefined) ?? "#22c55e"}
                onChange={(e) => {
                  onSetColor(menuRule.id, e.currentTarget.value);
                }}
                onBlur={onCloseContextMenu}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Custom color hex value"
              />
            </label>
          </div>
        </div>
      ) : null}
      {onRotate ? (
        <>
          <div className="my-1 border-t border-ca-border" />
          <div className="px-3 py-1.5">
            <div className="mb-1 flex items-center gap-1 text-hmi-caption text-ca-ink-muted">
              <RotateCw size={12} /> Rotate
            </div>
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Rotate">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  disabled={menuRule.isLocked}
                  onClick={() => {
                    onRotate(menuRule.id, deg);
                    onCloseContextMenu();
                  }}
                  className="rounded border border-ca-border bg-ca-panel px-2 py-1 font-mono text-[11px] hover:bg-ca-panel/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deg}°
                </button>
              ))}
              <button
                type="button"
                title="Rotate -15°"
                disabled={menuRule.isLocked}
                onClick={() => {
                  const curr = Number(menuRule.rotation ?? 0);
                  onRotate(menuRule.id, (((curr - 15) % 360) + 360) % 360);
                }}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded border border-ca-border bg-ca-panel hover:bg-ca-panel/60 disabled:opacity-40"
              >
                <RotateCcw size={12} />
              </button>
              <button
                type="button"
                title="Rotate +15°"
                disabled={menuRule.isLocked}
                onClick={() => {
                  const curr = Number(menuRule.rotation ?? 0);
                  onRotate(menuRule.id, (curr + 15) % 360);
                }}
                className="flex h-7 w-7 items-center justify-center rounded border border-ca-border bg-ca-panel hover:bg-ca-panel/60 disabled:opacity-40"
              >
                <RotateCw size={12} />
              </button>
            </div>
          </div>
        </>
      ) : null}
      <MenuSection label="Edit">
        <MenuItem
          icon={<Pencil size={14} />}
          label="Rename"
          shortcut="F2"
          disabled={menuRule.isLocked}
          onClick={() => {
            onAction(menuRule.id, RuleActionKindType.Rename);
            onCloseContextMenu();
          }}
        />
        <MenuItem
          icon={<Copy size={14} />}
          label="Duplicate"
          shortcut="Ctrl+D"
          onClick={() => {
            onAction(menuRule.id, RuleActionKindType.Duplicate);
            onCloseContextMenu();
          }}
        />
      </MenuSection>
      <MenuSection label="Run order">
        <RunOrderQuickBar
          currentIndex={rules.findIndex((r) => r.id === menuRule.id)}
          total={rules.length}
          disabled={menuRule.isLocked}
          onJump={(zeroIdx) => {
            onAction(menuRule.id, RuleActionKindType.Movetoindex, zeroIdx);
            onCloseContextMenu();
          }}
          onStep={(dir) => {
            onAction(
              menuRule.id,
              dir === -1 ? RuleActionKindType.Moveup : RuleActionKindType.Movedown,
            );
          }}
          onEdge={(edge) => {
            onAction(
              menuRule.id,
              edge === RunOrderQuickBarEdgeType.Start
                ? RuleActionKindType.Sendtoback
                : RuleActionKindType.Bringtofront,
            );
            onCloseContextMenu();
          }}
        />
        <MenuItem
          icon={<ArrowUpToLine size={14} />}
          label="Bring to Front"
          shortcut="Ctrl+Shift+]"
          disabled={menuRule.isLocked}
          onClick={() => {
            onAction(menuRule.id, RuleActionKindType.Bringtofront);
            onCloseContextMenu();
          }}
        />
        <MenuItem
          icon={<ArrowUp size={14} />}
          label="Bring Forward"
          shortcut="Ctrl+]"
          disabled={menuRule.isLocked}
          onClick={() => {
            onAction(menuRule.id, RuleActionKindType.Moveup);
            onCloseContextMenu();
          }}
        />
        <MenuItem
          icon={<ArrowDown size={14} />}
          label="Send Backward"
          shortcut="Ctrl+["
          disabled={menuRule.isLocked}
          onClick={() => {
            onAction(menuRule.id, RuleActionKindType.Movedown);
            onCloseContextMenu();
          }}
        />
        <MenuItem
          icon={<ArrowDownToLine size={14} />}
          label="Send to Back"
          shortcut="Ctrl+Shift+["
          disabled={menuRule.isLocked}
          onClick={() => {
            onAction(menuRule.id, RuleActionKindType.Sendtoback);
            onCloseContextMenu();
          }}
        />
      </MenuSection>
      <MenuSection label="State">
        <MenuItem
          icon={menuRule.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
          label={menuRule.isLocked ? "Unlock" : "Lock"}
          shortcut="L"
          onClick={() => {
            onAction(menuRule.id, RuleActionKindType.Togglelock);
            onCloseContextMenu();
          }}
        />
        <MenuItem
          icon={menuRule.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
          label={menuRule.isHidden ? "Show" : "Hide"}
          shortcut="H"
          onClick={() => {
            onAction(menuRule.id, RuleActionKindType.Togglehidden);
            onCloseContextMenu();
          }}
        />
        <MenuItem
          icon={<GroupIcon size={14} />}
          label="Copy ID"
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              void navigator.clipboard.writeText(menuRule.id);
            }

            onCloseContextMenu();
          }}
        />
      </MenuSection>
      <MenuSection label="Danger zone" tone="danger">
        <MenuItem
          icon={<Trash2 size={14} />}
          label="Delete"
          shortcut="Del"
          danger
          disabled={menuRule.isLocked}
          disabledHint={menuRule.isLocked ? "Unlock to delete" : undefined}
          onClick={() => {
            onAction(menuRule.id, RuleActionKindType.Delete);
            onCloseContextMenu();
          }}
        />
      </MenuSection>
    </div>,
    document.body,
  );
}
