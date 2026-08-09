/**
 * Command bus, Plan 64 step 93 + 94 support.
 *
 * Global command dispatcher used by the Command Palette and the
 * V/R/C/M/T/O/B/F/J hotkeys. Any screen (routes, palettes, dialogs)
 * can subscribe by name and act on the command locally. Keeps hotkey
 * definitions and route implementations decoupled: `HmiShell` fires
 * commands, the ruleset editor listens for the ones it cares about.
 *
 * SSR-safe: `emit` and `on` no-op when `window` is undefined.
 */
export enum CommandIdType {
  CmdNewProject = "cmd:new-project",
  CmdNewRuleset = "cmd:new-ruleset",
  CmdOpenRecent = "cmd:open-recent",
  CmdTogglePanel = "cmd:toggle-panel",
  CmdResetLayout = "cmd:reset-layout",
  CmdValidate = "cmd:validate",
  CmdDesignMode = "cmd:design-mode",
  CmdAddRule = "cmd:add-rule",
  CmdNewRule = "cmd:new-rule",
  CmdResetAndReseed = "cmd:reset-and-reseed",
  CmdApplySeedProfile = "cmd:apply-seed-profile",
}
export type CommandId = CommandIdType;

export interface CommandPayloads {
  "cmd:new-project": void;
  "cmd:new-ruleset": void;
  "cmd:open-recent": void;
  "cmd:toggle-panel": void;
  "cmd:reset-layout": void;
  "cmd:validate": void;
  "cmd:design-mode": void;
  "cmd:add-rule": { preset: "R" | "C" | "B" | "F" | "J" };
  /**
   * Plan 67 step 8: create a rule of the given editor kind in the
   * currently open ruleset. Fired from the Command Palette entries
   * "New Circle ROI", "New Rect ROI", etc.
   */
  "cmd:new-rule": { kind: "C" | "R" | "K" | "S" | "E" };
  /**
   * Plan 100 Phase G step 63: clear autoseed flags and rerun the seed
   * orchestrator. Dev-only surface, exposed via the Command Palette.
   */
  "cmd:reset-and-reseed": void;
  /**
   * Plan 86 Step 28: apply a named v2 seed profile through the
   * `defaultDomainRegistry` via `runSeedV2`. Payload is the frozen
   * SS-07 profile id (e.g. `prof-default-pcb`). Failures are funneled
   * through the errorStore (3-tier funnel), never swallowed.
   */
  "cmd:apply-seed-profile": { profileId: string };
}

export function emitCommand<K extends CommandId>(id: K, payload?: CommandPayloads[K]): void {
  if (typeof window === "undefined") return;
  console.info("[command-bus] emit", { id, payload });
  window.dispatchEvent(new CustomEvent(id, { detail: payload }));
}

export function onCommand<K extends CommandId>(
  id: K,
  handler: (payload: CommandPayloads[K]) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => {
    const detail = (event as CustomEvent).detail as CommandPayloads[K];
    try {
      handler(detail);
    } catch (err) {
      console.error("[command-bus] handler threw", { id, err });
    }
  };
  window.addEventListener(id, listener);

  return () => window.removeEventListener(id, listener);
}
