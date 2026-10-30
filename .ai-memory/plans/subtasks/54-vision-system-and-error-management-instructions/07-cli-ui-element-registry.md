# Subtask: 07-cli-ui-element-registry

See plan: .ai-memory/plans/pending/54-vision-system-and-error-management-instructions.md

Status: IN PROGRESS — backend batch done (registry + packet queue + audit + routes).

## Batch A — backend (committed)

- BE/ui_remote/__init__.py — package doc + exports.
- BE/ui_remote/registry.py — single source of truth: 14 verified entries
  (window controls, exit dialog, simulation player bar + dwell slider,
  greyscale slider, camera select, workpiece canvas + results regions).
  No invented ids: vision marking canvases carry no addressable
  attributes, so they are follow-ups, not fabrications.
- BE/ui_remote/queue.py — in-memory packet queue + JSONL audit trail
  (env UI_REMOTE_AUDIT_PATH, else OS temp dir; never the repo tree).
- BE/routes/ui_remote.py — GET /elements, POST /packets, GET /pending,
  POST /results, GET /results/{id}, GET /audit (Universal Envelope).

## Batch B — frontend (committed)

- src/lib/ui-remote/registry.ts — generated TS mirror (14 elements).
- src/hooks/useUiRemoteControl.ts — 1s poll + AGM fallback-chain resolve +
  real el.click()/native-setter set + result report + error-store capture
  on miss. Select elements use the select value setter (fixed on review).
- src/lib/ui-remote/README.md — end-to-end usage.
- 03-ai-scripts/generate-ui-remote-registry.py — regen TS from Python.

## Batch C — wiring (committed)

- BE/main.py — include ui_remote router.
- BE/cli/processing/commands/ui_remote.py + main.py register — `ui` subcommand.
- src/components/layout/StandardAppShell.tsx — mount the hook.

Status: COMPLETE — registry, bridge, CLI, audit, and wiring all landed.
Runtime verification (live click end to end) is pending the end-of-tunnel
build-fix window per program order; no builds/tests were run in this
workstream.

## Follow-ups (do NOT invent; needs vision workstream)

- Vision marking screens (WhiteBoxMarkingTool, Pin1Canvas, Pin1SettingsCard,
  PatternCanvas) have zero data-testid/aria-label/id attributes — the
  registry cannot address their buttons until data-ui-id attributes land.
- Grayscale slider xpath is structural (no id on the input); a data-ui-id
  on GreyscaleSliderCard would make it robust.
- Route scoping is ["*"] for v1 entries (ids are unique app-wide);
  tighten per-screen routes once vision screens gain ids.
