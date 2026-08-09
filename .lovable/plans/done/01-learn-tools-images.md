# Learn the CAT MY UI from assets/tools-images

Slug: learn-tools-images
Steps: 15
Status: completed
Created: 2026-07-09

## Context

The user dropped 50 reference photos into `assets/tools-images/` (49 JPGs + 1 externalized `.asset.json` pointer for the oversized `20260629_173118.jpg`) and wants us to study them as the visual/UX source of truth for the CAT MY project before writing any UI code. Goal of this plan: ingest every image, extract a structured design brief (screens, components, tokens, flows), and stage it as project memory so subsequent build turns work from a shared understanding — no implementation this turn.

No prior pending plans, commands, or issues found under `.lovable/` (only `project.json` existed).

## Steps

1. Enumerate every file in `assets/tools-images/`, separating real JPGs from `.asset.json` pointers, and write the inventory to `.lovable/plans/subtasks/01-learn-tools-images/ss-01-inventory.md`.
2. Resolve the externalized image `20260629_173118.jpg.asset.json` by fetching its `url` into a local temp copy so it can be viewed alongside the rest.
3. Group the 50 images into visual clusters (same screen, same flow, duplicates/near-duplicates) using filename timestamp order as the initial ordering signal.
4. For each cluster, view the representative image(s) with `code--view` and note: screen name, purpose, primary content, and any visible navigation.
5. Extract the color palette actually used across screens (backgrounds, primary, accent, text, borders, status colors) and record hex approximations.
6. Extract typography signals (heading vs body treatment, weight, relative size, any custom/brand type) and note whether serif/sans/display.
7. Catalog reusable UI components observed (buttons, inputs, cards, chips, tabs, lists, modals, nav bars, empty states, toasts) with a one-line description each.
8. Catalog iconography and imagery style (line vs filled, corner radius language, illustration vs photo, avatars).
9. Reconstruct the primary user flows implied by the sequence of screens (entry → core action → confirmation) as short numbered flows.
10. Identify the app's domain and feature scope from on-screen text/labels ("CAT MY" — what it lets a user do, entities, key nouns/verbs).
11. Flag ambiguities, illegible screens, or conflicting variants that need the user to disambiguate before build (list as open questions).
12. Draft a design token proposal (semantic tokens: `--background`, `--foreground`, `--primary`, `--accent`, `--muted`, `--border`, radii, spacing scale) grounded in step 5–6.
13. Write the consolidated brief to `.lovable/plans/subtasks/01-learn-tools-images/SS-02-design-brief.md` (screens, components, tokens, flows, open questions).
14. Save durable project memory: `mem://design/visual-language` (palette + typography + component vocabulary) and `mem://features/cat-my-scope` (domain + primary flows), then update `mem://index.md` Core + Memories.
15. Move this plan file from `pending/` to `.lovable/plans/done/01-learn-tools-images.md` and flip `Status:` to `completed` once steps 1–14 have artifacts on disk.

## Verification

- Steps 1–2: inventory file exists and lists 50 entries; the resolved image opens locally.
- Steps 3–10: design-brief file exists and every cluster/screen is named and described.
- Step 11: open-questions section is non-empty OR explicitly states "none".
- Step 12: token proposal lists concrete values, not placeholders.
- Step 13–14: brief file and both `mem://` entries exist; `mem://index.md` references them.
- Step 15: file is present under `done/`, absent from `pending/`, and its frontmatter reads `Status: completed`.

## Appended from prior pending tasks

none
