import { CommandIdType } from "@/lib/command-bus";
import { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { registerShortcut, useShortcuts } from "@/lib/shortcuts/registry";
import { formatCombo } from "@/lib/shortcuts/formatCombo";
import { ShortcutScopeBaseType } from "@/lib/shortcuts/scopes";
import { emitCommand } from "@/lib/command-bus";
import { usePaletteStore } from "@/lib/palette-store";
import { fuzzyMatch, highlightRuns } from "@/lib/fuzzy-match";
import { PANELS } from "@/lib/workspace/panel-registry";
import { useWorkspaceLayoutStore } from "@/lib/workspace/layout-slice";
import type { EditorRuleKind } from "@/lib/editor/types";

/**
 * Command Palette, Plan 64 step 93.
 *
 * Root cause it addresses: keyboard-first navigation had no surface.
 * `Cmd+K` (macOS) / `Ctrl+K` (elsewhere) opens a fuzzy-substring route
 * jumper. Escape closes. Enter navigates to the highlighted entry.
 *
 * The command registry is static for now, deferred auto-generation from
 * `routeTree.gen.ts` is tracked in
 * `conversation/01-plan-64/02-command-palette.md`.
 */
interface Command {
  id: string;
  label: string;
  hint?: string;
  to?: string;
  run?: () => void;
  /**
   * Optional shortcut registry id. When present the palette renders the
   * combo as a right-aligned `<kbd>` so keyboard operators discover the
   * global hotkey without leaving Ctrl+K. Missing / unregistered ids are
   * silently omitted (no fabricated combos).
   */
  shortcutId?: string;
}

// Rule kind labels for the palette. Kept inline here (single-line
// human names) to avoid a separate registry file for step 8.
const RULE_KIND_LABELS: Record<EditorRuleKind, string> = {
  C: "Circle ROI",
  R: "Rect ROI",
  K: "OCR / Text region",
  S: "String match",
  E: "Expression",
};

const STATIC_COMMANDS: readonly Command[] = [
  // Plan 64 step 93: action entries alongside route jumps.
  {
    id: "new-project",
    label: "New Project",
    hint: "Open project create dialog",
    to: "/projects",
    run: () => emitCommand(CommandIdType.CmdNewProject),
  },
  {
    id: "new-ruleset",
    label: "New Rule Set",
    hint: "Open Rule Sets CRUD",
    to: "/setup/rules",
    run: () => emitCommand(CommandIdType.CmdNewRuleset),
  },
  {
    id: "open-recent",
    label: "Open Recent",
    hint: "Jump to recent projects",
    to: "/projects",
    run: () => emitCommand(CommandIdType.CmdOpenRecent),
  },
  {
    id: "reset-layout",
    label: "Reset Layout",
    hint: "Restore default palette layout",
    shortcutId: "layout.reset.ctrl",
    run: () => {
      usePaletteStore.getState().reset();
      emitCommand(CommandIdType.CmdResetLayout);
    },
  },
  { id: "home", label: "Home", to: "/" },
  { id: "setup", label: "Setup", to: "/setup" },
  { id: "setup-rules", label: "Setup, Rules", to: "/setup/rules" },
  // Plan 81 step 18: one entry per settings subsection so `Cmd+K` jumps
  // directly to any config page. `hint` seeds fuzzy matches so typing
  // "flash" or "hotkeys" surfaces the right row even when the label does
  // not include those words verbatim.
  { id: "settings", label: "Settings", hint: "All configuration", to: "/settings" },
  {
    id: "settings-camera",
    label: "Settings, Camera",
    hint: "Exposure, gain, resolution, ROI",
    to: "/settings/camera",
  },
  {
    id: "settings-lighting",
    label: "Settings, Lighting",
    hint: "Flash, brightness, colour, strobe test",
    to: "/settings/lighting",
  },
  {
    id: "settings-trigger",
    label: "Settings, Trigger",
    hint: "Trigger source, timing, debounce",
    to: "/settings/trigger",
  },
  {
    id: "settings-shortcuts",
    label: "Settings, Shortcuts",
    hint: "Keyboard hotkeys and bindings",
    to: "/settings/shortcuts",
  },
  {
    id: "settings-license",
    label: "Settings, License",
    hint: "Activation, seats, expiry",
    to: "/settings/license",
  },
  { id: "projects", label: "Projects", to: "/projects" },
  { id: "run", label: "Trial run", to: "/run" },
  { id: "ai-testing", label: "AI testing", to: "/ai-testing" },
  { id: "results", label: "Results", to: "/results" },
  { id: "diagnostics", label: "Diagnostics", to: "/diagnostics" },
  { id: "ops", label: "Ops", to: "/ops" },
] as const;

/**
 * Phase G step 63: dev-only "Reset & Reseed" command entry. Gated on
 * `import.meta.env.DEV` so production users can't wipe autoseed flags.
 * Emits `cmd:reset-and-reseed`, handled in `AutoSeedFromFacade` at the
 * router root (it owns the adapter map for `runAllSeeders`).
 *
 * Plan 86 Step 28: additionally exposes one palette entry per frozen
 * v2 seed profile (SS-07). Emits `cmd:apply-seed-profile` with the
 * frozen profile id; handled by `registerApplySeedProfileHandler`
 * mounted from `__root.tsx`. Errors funnel through the errorStore.
 */
import { FROZEN_SEED_PROFILES } from "@/lib/seed/apply-profile-command";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

const DEV_COMMANDS: readonly Command[] = import.meta.env.DEV
  ? [
      {
        id: "dev-reset-reseed",
        label: "Dev: Reset & Reseed data",
        hint: "Clear autoseed flags and rerun the seed orchestrator",
        run: () => emitCommand(CommandIdType.CmdResetAndReseed),
      },
      ...FROZEN_SEED_PROFILES.map((p) => ({
        id: `dev-apply-${p.id}`,
        label: p.label,
        hint: `Apply v2 seed profile ${p.id} via defaultDomainRegistry`,
        run: () => emitCommand(CommandIdType.CmdApplySeedProfile, { profileId: p.id }),
      })),
    ]
  : [];

/**
 * Build the full command list for step 8 (plan 67):
 * static routes + one "Toggle <panel>" per registered panel + one
 * "New <kind>" per editor rule kind. Panel toggles route through the
 * workspace layout store so they mirror the Window menu.
 */
function buildCommands(): Command[] {
  const panelCmds: Command[] = PANELS.map((p) => ({
    id: `panel:${p.id}`,
    label: `Toggle ${p.title} panel`,
    hint: `Show / hide ${p.title}`,
    run: () => useWorkspaceLayoutStore.getState().togglePanel(p.id),
  }));
  const kindCmds: Command[] = (Object.keys(RULE_KIND_LABELS) as EditorRuleKind[]).map((kind) => ({
    id: `new-rule:${kind}`,
    label: `New ${RULE_KIND_LABELS[kind]}`,
    hint: "Create rule in the current ruleset",
    to: "/setup/rules",
    run: () => emitCommand(CommandIdType.CmdNewRule, { kind }),
  }));

  return [...STATIC_COMMANDS, ...DEV_COMMANDS, ...panelCmds, ...kindCmds];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  // Plan 100 Phase F step 56: subscribe to the registry so combo hints
  // reflect late-registered shortcuts (tools, HUD, layout resets, etc.).
  const shortcuts = useShortcuts();
  const combosById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of shortcuts) map.set(s.id, s.combo);

    return map;
  }, [shortcuts]);

  // Plan 100 §13 step 15: migrate palette hotkeys onto the shortcut
  // registry. `ShortcutProvider` allows editable-target dispatch when a
  // modifier is held, so Ctrl/Meta+K works from any input.
  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    const unsubs = [
      registerShortcut({
        id: "palette.toggle.ctrl-k",
        scope: ShortcutScopeBaseType.Global,
        combo: "Ctrl+K",
        label: "Open command palette",
        group: "Navigation",
        run: toggle,
      }),
      registerShortcut({
        id: "palette.toggle.meta-k",
        scope: ShortcutScopeBaseType.Global,
        combo: "Meta+K",
        label: "Open command palette (⌘)",
        group: "Navigation",
        run: toggle,
      }),
      registerShortcut({
        id: "palette.toggle.ctrl-shift-p",
        scope: ShortcutScopeBaseType.Global,
        combo: "Ctrl+Shift+P",
        label: "Open command palette (VS Code style)",
        group: "Navigation",
        run: toggle,
      }),
      registerShortcut({
        id: "palette.toggle.meta-shift-p",
        scope: ShortcutScopeBaseType.Global,
        combo: "Meta+Shift+P",
        label: "Open command palette (⌘⇧P)",
        group: "Navigation",
        run: toggle,
      }),
    ];
    // Plan 87 Step 6: visible trigger. `HeaderActions` renders a button
    // that dispatches `window` event `command-palette:toggle`; listening
    // here keeps `open` state internal (single source of truth) and
    // avoids exposing setOpen through a module-level ref.
    const onDomToggle = () => toggle();
    window.addEventListener("command-palette:toggle", onDomToggle);

    return () => {
      for (const u of unsubs) u();
      window.removeEventListener("command-palette:toggle", onDomToggle);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      // Wait for the dialog to mount before focusing.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Fuzzy subsequence match with per-command scoring. Matches against
  // both label and hint; the higher of the two scores wins and its
  // indices drive the highlight. Empty query returns the full list in
  // registry order so the palette does not reshuffle on open.
  const filtered = useMemo(() => {
    const commands = buildCommands();
    const q = query.trim();

    if (!q) {
      return commands.map((c) => ({ cmd: c, indices: [] as number[], score: 0 }));
    }

    const scored: Array<{ cmd: Command; indices: number[]; score: number }> = [];
    for (const c of commands) {
      const labelMatch = fuzzyMatch(q, c.label);
      const hintMatch = c.hint ? fuzzyMatch(q, c.hint) : null;
      let best: { indices: number[]; score: number } | null = null;

      if (labelMatch) best = { indices: labelMatch.indices, score: labelMatch.score };

      if (hintMatch && (!best || hintMatch.score > best.score)) {
        // Hint matches do not carry through as label highlights.
        best = { indices: [], score: hintMatch.score - 2 };
      }

      if (best) scored.push({ cmd: c, indices: best.indices, score: best.score });
    }

    scored.sort((a, b) => b.score - a.score);

    return scored;
  }, [query]);

  if (!open) return null;

  const commit = (cmd: Command | undefined) => {
    if (!cmd) return;
    setOpen(false);

    if (cmd.run) {
      cmd.run();
    }

    if (cmd.to) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      navigate({ to: cmd.to as any });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (KeyboardKeyType.isEscape(e.key)) {
      e.stopPropagation();
      setOpen(false);

      return;
    }

    if (KeyboardKeyType.isArrowDown(e.key)) {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));

      return;
    }

    if (KeyboardKeyType.isArrowUp(e.key)) {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));

      return;
    }

    if (KeyboardKeyType.isEnter(e.key)) {
      e.preventDefault();
      commit(filtered[index]?.cmd);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 p-hmi-6 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-lg border border-ca-border bg-ca-panel shadow-2xl"
      >
        <label className="flex items-center gap-hmi-2 border-b border-ca-border px-hmi-4 py-hmi-3">
          <Search size={16} aria-hidden className="text-ca-ink-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder="Jump to..."
            className="w-full bg-transparent text-hmi-body text-ca-ink outline-none placeholder:text-ca-ink-muted"
            aria-label="Command palette search"
          />
          <kbd className="rounded border border-ca-border px-1.5 py-0.5 text-xs text-ca-ink-muted">
            Esc
          </kbd>
        </label>
        <ul role="listbox" aria-label="Commands" className="max-h-80 overflow-auto py-hmi-1">
          {filtered.length === 0 ? (
            <li className="px-hmi-4 py-hmi-3 text-hmi-caption text-ca-ink-muted">
              No matches for &ldquo;{query}&rdquo;.
            </li>
          ) : (
            filtered.map(({ cmd, indices }, i) => (
              <li
                key={cmd.id}
                role="option"
                aria-selected={i === index}
                onMouseEnter={() => setIndex(i)}
                onClick={() => commit(cmd)}
                className={
                  "cursor-pointer px-hmi-4 py-hmi-2 text-hmi-body " +
                  (i === index ? "bg-ca-panel-2 text-ca-ink" : "text-ca-ink hover:bg-ca-panel-2")
                }
              >
                <span>
                  {highlightRuns(cmd.label, indices).map((run, ri) =>
                    run.matched ? (
                      <mark key={ri} className="bg-transparent font-semibold text-ca-primary">
                        {run.text}
                      </mark>
                    ) : (
                      <span key={ri}>{run.text}</span>
                    ),
                  )}
                </span>
                <span className="ml-hmi-2 font-mono text-hmi-caption text-ca-ink-muted">
                  {cmd.hint ?? cmd.to ?? ""}
                </span>
                {cmd.shortcutId && combosById.has(cmd.shortcutId) ? (
                  <kbd
                    data-testid="palette-row-shortcut"
                    className="ml-hmi-2 rounded border border-ca-border bg-ca-panel-2 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-ca-ink-muted"
                  >
                    {formatCombo(combosById.get(cmd.shortcutId)!)}
                  </kbd>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
