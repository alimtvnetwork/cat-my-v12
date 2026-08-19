import { ReactElement } from "react";
import { MenubarMenu, MenubarContent } from "@/components/ui/menubar";
import { MenubarItemRow } from "./TopMenuRows";
import { isActionEntry, isGroupActive } from "./TopMenuUtils";
import { MenuGroup, MenuTriggerWithMnemonic } from "./TopMenuBar";

interface TopMenuGroupProps {
  group: MenuGroup;
  pathname: string;
  running: boolean;
  isHydrated: boolean;
}

export function TopMenuGroup({
  group,
  pathname,
  running,
  isHydrated,
}: TopMenuGroupProps): ReactElement {
  return (
    <MenubarMenu>
      <MenuTriggerWithMnemonic group={group} groupActive={isGroupActive(group, pathname)} />
      <MenubarContent
        align="start"
        sideOffset={6}
        className="min-w-[14rem] border-ca-border bg-ca-panel p-1.5 text-ca-ink shadow-hmi-panel"
      >
        {group.items.map((item, idx) => {
          const active = isActionEntry(item) === false && item.to === pathname;
          const locked =
            isActionEntry(item) === false &&
            Boolean(running && item.lockDuringRun && !active);

          return (
            <MenubarItemRow
              key={`item-${idx}`}
              item={item}
              active={active}
              locked={locked}
              isHydrated={isHydrated}
            />
          );
        })}
      </MenubarContent>
    </MenubarMenu>
  );
}
