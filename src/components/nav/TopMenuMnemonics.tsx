import { useEffect, type ReactElement } from "react";
import { MenubarTrigger } from "@/components/ui/menubar";
import { ClientLogger } from "@/lib/observability/client-logger";
import { MenuGroupIdType } from "@/lib/enums/menu-group-id-type";
import { registerShortcut } from "@/lib/shortcuts/registry";
import { ShortcutScopeBaseType } from "@/lib/shortcuts/scopes";
import { useAriaKeyshortcuts } from "@/lib/shortcuts/useAriaKeyshortcuts";
import { GROUPS, type MenuGroup } from "./TopMenuBar";

/**
 * Plan 100 Phase F step 52: Alt-mnemonic map for the top menu bar.
 * Each entry pairs the group id with the underlined letter index and the
 * Alt-triggered key. `AltMnemonicLayer` already toggles the `<u>` reveal
 * on Alt-hold; this map lets us render the underline at build time and
 * bind Alt+<letter> to open the matching Menubar trigger. Keys are
 * unique across groups so no two mnemonics collide.
 */
export const GROUP_MNEMONIC: Record<MenuGroupIdType, { key: string; index: number }> = {
  [MenuGroupIdType.Home]: { key: "h", index: 0 },
  [MenuGroupIdType.Project]: { key: "p", index: 0 },
  [MenuGroupIdType.Setup]: { key: "u", index: 2 },
  [MenuGroupIdType.Rules]: { key: "r", index: 0 },
  [MenuGroupIdType.Test]: { key: "t", index: 0 },
  [MenuGroupIdType.Run]: { key: "n", index: 2 },
  [MenuGroupIdType.Settings]: { key: "s", index: 0 },
  [MenuGroupIdType.Help]: { key: "l", index: 2 },
};

export function MnemonicLabel({ label, index }: { label: string; index: number }): ReactElement {
  const before = label.slice(0, index);
  const letter = label.charAt(index);
  const after = label.slice(index + 1);

  return (
    <span data-mnemonic>
      {before}
      <u>{letter}</u>
      {after}
    </span>
  );
}

/**
 * Plan 100 Phase F step 53: register each Alt+<letter> menu mnemonic
 * with the shortcut registry so ShortcutCheatSheet lists them under
 * "Menu bar" and dispatch flows through the single `ShortcutProvider`
 * window listener instead of a parallel one. Missing trigger nodes log
 * a warning with `{groupId, key}` so a menu that never mounted stays
 * visible in the console.
 */
export function useAltMnemonicOpen(): void {
  useEffect(() => {
    const disposers = (Object.entries(GROUP_MNEMONIC) as [MenuGroupIdType, { key: string }][]).map(
      ([groupId, { key }]) => {
        const group = GROUPS.find((g) => g.id === groupId);
        const label = group ? `Open ${group.label} menu` : `Open ${groupId} menu`;

        return registerShortcut({
          id: `menubar.open.${groupId}`,
          scope: ShortcutScopeBaseType.Global,
          combo: `Alt+${key.toUpperCase()}`,
          label,
          group: "Menu bar",
          run: () => {
            const target = document.querySelector<HTMLElement>(`[data-group="${groupId}"]`);

            if (!target) {
              ClientLogger.warn("[top-menu mnemonic] trigger not mounted", { groupId, key });

              return;
            }

            target.click();
            target.focus();
            ClientLogger.info("[top-menu mnemonic] opened", { groupId, key });
          },
        });
      },
    );

    return () => {
      for (const dispose of disposers) dispose();
    };
  }, []);
}

/**
 * Plan 100 Phase F step 58: menubar trigger with `aria-keyshortcuts`
 * pulled from the shortcut registry so screen readers announce the
 * Alt+<letter> mnemonic alongside the visible underline.
 */
export function MenuTriggerWithMnemonic({
  group,
  groupActive,
}: {
  group: MenuGroup;
  groupActive: boolean;
}): ReactElement {
  const aria = useAriaKeyshortcuts(`menubar.open.${group.id}`);

  return (
    <MenubarTrigger
      data-group={group.id}
      data-active={groupActive ? "true" : "false"}
      data-testid="topnav-trigger"
      aria-label={groupActive ? `${group.label} menu, current section` : `${group.label} menu`}
      aria-current={groupActive ? "page" : undefined}
      aria-keyshortcuts={aria}
      style={{ willChange: "background-color" }}
      className={`hmi-focus-ring-inset relative inline-flex h-6 shrink-0 items-center justify-center rounded-sm px-hmi-2 text-[12px] font-medium leading-none tracking-normal transition-colors duration-150 ease-out focus-visible:outline-none after:pointer-events-none after:absolute after:left-hmi-2 after:right-hmi-2 after:bottom-0 after:h-[2px] after:rounded-full after:bg-current after:opacity-0 after:transition-opacity after:duration-150 after:ease-out hover:after:opacity-60 data-[state=open]:after:opacity-100 data-[active=true]:after:opacity-100 ${
        groupActive
          ? "bg-ca-primary/15 text-ca-primary data-[state=open]:bg-ca-primary/20 data-[state=open]:text-ca-primary"
          : "text-ca-chrome-ink/75 hover:bg-ca-panel-2 hover:text-ca-chrome-ink data-[state=open]:bg-ca-panel-2 data-[state=open]:text-ca-chrome-ink"
      }`}
    >
      <MnemonicLabel label={group.label} index={GROUP_MNEMONIC[group.id].index} />
    </MenubarTrigger>
  );
}
