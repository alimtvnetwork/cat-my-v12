/**
 * Shortcut scopes for Plan 100 §13.
 * Precedence (highest first): hud > editor > route:* > menu > global.
 * A registered handler at a higher scope suppresses the same combo at lower scopes.
 */
export enum ShortcutScopeBaseType {
  Global = "global",
  Menu = "menu",
  Editor = "editor",
  Hud = "hud",
}
export type ShortcutScopeType = ShortcutScopeBaseType | `route:${string}`;

export const SCOPE_PRECEDENCE: readonly ShortcutScopeType[] = [
  ShortcutScopeBaseType.Hud,
  ShortcutScopeBaseType.Editor,
  // route:* handled dynamically by prefix
  ShortcutScopeBaseType.Menu,
  ShortcutScopeBaseType.Global,
] as const;

export function scopeRank(scope: ShortcutScopeType): number {
  if (scope === ShortcutScopeBaseType.Hud) return 0;

  if (scope === ShortcutScopeBaseType.Editor) return 1;

  if (scope.startsWith("route:")) return 2;

  if (scope === ShortcutScopeBaseType.Menu) return 3;

  return 4; // global
}
