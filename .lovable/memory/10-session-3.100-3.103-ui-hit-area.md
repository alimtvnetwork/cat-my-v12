# Session Memory: v3.100.0 -> v3.103.0 (UI hit-area + reference image)

Read when touching editor canvas, `/run`, `/results`, `/ops`, `/errors`, `/settings*`, `Counter`, `StatusLog`, `MachineFrame`, or planning rule-creation UX.

## Scope shipped

- 40px min hit-area floor enforced across all non-editor routes. Replaced legacy `px-hmi-{2,3} py-hmi-1` clusters (20-24px tall) with `inline-flex items-center min-h-10 px-hmi-4 py-hmi-2` in: `src/routes/{ops,errors,run,results,settings,settings.camera,settings.lighting,settings.trigger,settings.license,settings.index}.tsx`.
- 13px font floor: `Counter.tsx` and `StatusLog.tsx` labels moved from 0.7rem/0.75rem to `text-hmi-badge` (14px).
- Reference image: added `src/assets/inspection-sample.jpg`; `src/components/hmi/MachineFrame.tsx` now renders it under the SVG live overlay so operators see a real PCB behind rule shapes.
- Frame renderer updated: `src/lib/editor/render/frame.ts`.
- Canvas viewport wired to sample: `src/components/editor/canvas/CanvasViewport.tsx`.
- Home cleanup pass done at 3.103.0.

## Versions

- 3.100.0 typography + MachineFrame reference render.
- 3.101.0 Counter/StatusLog + `/run`, `/results` nav hit-area.
- 3.102.0 `/ops`, `/errors`, all `settings*` hit-area sweep.
- 3.103.0 Home cleanup.
- Bumped `package.json`, `changelog.md`, `release_notes.md`, `readme.md` pin each release.

## Next 2 steps (locked)

1. Reference-image management UI: per-program upload/replace/clear, localStorage keyed by program id, fallback to `inspection-sample.jpg`. ~45 min. Unblocks real rule creation and later Cloud-backed successor.
2. Rule creation UX on canvas: pointer rect ROI, PascalCase check-type dropdown, name + save, list + delete in side panel. ~90 min. Unblocks Plan 34 Phase I acceptance and Plan 29 (denial-burst tuning) with real rules.

## Remaining backlog (after steps 1-2)

3. Plan 34 Phase I acceptance run: `tapUnder==0`, contrast, focus-order.
4. Plan 29 Rank 4 denial-burst threshold tuning from live telemetry.
5. Ed25519 audit-export key rotation.
6. Runtime-shell packaging + app self-update binding specs.
7. Cloud-backed per-program reference image (server-side successor to step 1).
8. Backlog `RB-01..RB-08`.

## Preferences reinforced this session

- Never create per-invocation `NNN-next-task.md` archives under `.lovable/prompts/` (user memory rule). Skip that step every turn.
- Never use em dashes in prose or code comments.
- No underscores in visible UI text; enums stay PascalCase in code and display cleanly.
- Never ask for plan approval, just proceed.

## Files touched (cumulative across 3.100-3.103)

- `src/assets/inspection-sample.jpg` (new)
- `src/components/editor/canvas/CanvasViewport.tsx`
- `src/components/hmi/{Counter,StatusLog,MachineFrame}.tsx`
- `src/lib/editor/render/frame.ts`
- `src/routes/{run,results,ops,errors,settings,settings.camera,settings.lighting,settings.trigger,settings.license,settings.index}.tsx`
- `src/routes/index.tsx` (home cleanup, 3.103.0)
- `package.json`, `changelog.md`, `release_notes.md`, `readme.md`
