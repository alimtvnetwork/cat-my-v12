import { memo, useCallback, type ReactElement } from "react";
import { MenubarMenu, MenubarContent } from "@/components/ui/menubar";
import { MenubarItemRow } from "./TopMenuRows";
import { isActionEntry, isGroupActive } from "./TopMenuUtils";
import {
  MenuGroup,
  MenuTriggerWithMnemonic,
  clearMenuTrigger,
  recordMenuContentMounted,
} from "./TopMenuBar";

interface TopMenuGroupProps {
  group: MenuGroup;
  pathname: string;
  running: boolean;
  isHydrated: boolean;
}

function TopMenuGroupInner({
  group,
  pathname,
  running,
  isHydrated,
}: TopMenuGroupProps): ReactElement {
  const contentRef = useCallback(
    (node: HTMLElement | null) => {
      if (node) {
        recordMenuContentMounted(group.id);
      } else {
        clearMenuTrigger(group.id);
      }
    },
    [group.id],
  );

  return (
    <MenubarMenu>
      <MenuTriggerWithMnemonic group={group} groupActive={isGroupActive(group, pathname)} />
      <MenubarContent
        ref={contentRef}
        align="start"
        sideOffset={6}
        className="min-w-[14rem] border-ca-border bg-ca-panel p-1.5 text-ca-ink shadow-hmi-panel"
      >
        {group.items.map((item, idx) => {
          const active = isActionEntry(item) === false && item.to === pathname;
          const locked =
            isActionEntry(item) === false && Boolean(running && item.lockDuringRun && !active);

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

export const TopMenuGroup = memo(TopMenuGroupInner);
TopMenuGroup.displayName = "TopMenuGroup";
