# Home screen audit (plan 65 step 14)

Snapshot of the home route before steps 15-16 land. Scope: `src/routes/index.tsx`, `src/components/home/*`, `src/components/hmi/HmiShell.tsx`.

## What renders today

`Index` (in `src/routes/index.tsx`) mounts `HmiShell title="Home" hideHeader` and inside a max-w-6xl column renders, in order:

1. Status chip row: uppercase "Control Automation" pill + `RecentProjectsChip` (`src/components/home/RecentProjectsChip.tsx`).
2. Hero H1 "Pick a workflow" (`--home-hero-size`).
3. Hero body copy "Configure the line, open a project, run a trial, or batch-test a ruleset with AI. Every screen is one click away in the top menu."
4. `WORKFLOWS` grid (2 columns on md+): Setup, Projects, Trial run, AI testing. Each card is a `<Link>` with corner glow, icon tile, title, description, and a row of quick-action buttons.
5. `GettingStarted` (`src/components/home/GettingStarted.tsx`) with setup checklist tiles.

No JobList, no primary CTA button, no visible current-project pinning beyond the recent-projects chip.

## Gaps flagged for steps 15-16

- **Primary action missing**: there is no single "Continue" / "Open last project" primary CTA. Operators must scan four cards and figure out where to click. Step 15 to add a primary button that resolves to the most recent project or falls back to "New project".
- **Setup status opaque**: `GettingStarted` shows tiles but no per-step status pill (done / in-progress / blocked). Step 16 to add a status enum on each item and render a pill.
- **Hero copy references "top menu"** but the top menu is a dropdown behind the hamburger on narrow widths; the copy misleads on mobile. Step 15 to soften copy or gate to sm+.
- **Card quick actions overload**: Setup card has 4 quick actions inside a card that is already clickable; pointer targets nest and the Setup card link vs quick action link is ambiguous (mitigated with `stopPropagation`, but visually noisy). Step 15 to keep max 2 quick actions per card.
- **No "Create Project" affordance on home**: only path is Setup card > Projects. Step 17 will add a dedicated Create Project entry.

## Non-issues (leave as-is for now)

- `hideHeader` on `HmiShell`: home intentionally suppresses the shell titlebar so the hero can breathe. Step 11 single-header invariant does not fire here because no shell header mounts.
- Card tone system (`TONE` map + `--home-tone-*`): stays. Design tokens are already isolated.
- `RecentProjectsChip`: recent work is discoverable via the chip; no change needed until step 17 lands Create Project.

## Files that will change in steps 15-16

- `src/routes/index.tsx`: add primary CTA row, tighten hero copy, cap quick actions.
- `src/components/home/GettingStarted.tsx`: add per-step status pills; add a `SetupStepStatus` union.
- `src/components/home/data.ts`: extend the checklist entries with `status`.
- `src/styles.css`: pill tokens if not already present under `.pill-*`.

## Playwright checks planned

- Home screenshot at 1280 x 800 shows: chip row, hero, primary CTA, 4 workflow cards, GettingStarted with visible status pills.
- Primary CTA target resolves either to `/projects/<last>` or `/projects?new=1` depending on recent-projects state.
- Console clean of `E_SHELL_DUPLICATE_HEADER` and `W_PANEL_DROP_INVALID`.
