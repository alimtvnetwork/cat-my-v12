import React from "react";
import { Link } from "@tanstack/react-router";
import { MenubarItem, MenubarShortcut } from "@/components/ui/menubar";
import { type Entry, type ActionEntry, ACTION_HANDLERS } from "./TopMenuBar";
import { isActionEntry } from "./TopMenuUtils";

export function MenubarActionRow({ item, isHydrated }: { item: ActionEntry; isHydrated: boolean }): React.JSX.Element | null {
  const rowClass =
    "flex cursor-pointer items-center justify-between gap-4 rounded-md px-3 py-2 text-[0.9rem] text-ca-ink hover:bg-ca-panel-2";
  const isFullscreen = item.action === "view.fullscreen";
  const isDisabled = isFullscreen && !isHydrated;

  return (
    <MenubarItem
      className={rowClass}
      disabled={isDisabled}
      onSelect={() => ACTION_HANDLERS[item.action]?.()}
      data-action={item.action}
    >
      <span>{item.label}</span>
      {item.shortcut ? (
        <MenubarShortcut className="text-ca-ink-muted">{item.shortcut}</MenubarShortcut>
      ) : null}
    </MenubarItem>
  );
}

export function MenubarItemRow({
  item,
  active,
  locked,
  isHydrated,
}: {
  item: Entry;
  active: boolean;
  locked: boolean;
  isHydrated: boolean;
}): React.JSX.Element | null {
  const rowClass = `flex cursor-pointer items-center justify-between gap-4 rounded-md px-3 py-2 text-[0.9rem] ${
    active ? "bg-ca-primary/10 text-ca-primary" : "text-ca-ink hover:bg-ca-panel-2"
  }`;

  if (locked) {
    return (
      <MenubarItem
        disabled
        className="flex items-center justify-between gap-4 rounded-md px-3 py-2 text-[0.9rem] text-ca-ink-muted"
        title="Locked while running"
      >
        <span>{item.label}</span>
        <span className="text-[0.65rem] uppercase tracking-widest">locked</span>
      </MenubarItem>
    );
  }

  if (isActionEntry(item)) {
    return <MenubarActionRow item={item} isHydrated={isHydrated} />;
  }

  return (
    <MenubarItem asChild className={rowClass}>
      <Link
        to={item.to}
        search={{} as any}
        params={{} as any}
        preload="intent"
        data-item={item.to}
        aria-current={active ? "page" : undefined}
      >
        <span>{item.label}</span>
        {item.shortcut ? (
          <MenubarShortcut className="text-ca-ink-muted">{item.shortcut}</MenubarShortcut>
        ) : null}
      </Link>
    </MenubarItem>
  );
}
