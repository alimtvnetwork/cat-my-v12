---
name: Integer-only URL ids + Edit-surface routing
description: Hard rules the operator has restated repeatedly. Any URL-facing id must be a small positive integer (never a uuid or slug), and "Edit" on a rule/ruleset must land in the ROI editor (`/setup/roi`), not the workspace tabs surface.
type: constraint
---

# Integer URL ids + Edit surface

## Rule 1: every user-facing id is an integer

The address bar, breadcrumbs, links, and every `<Link to>` navigation
MUST expose integer aliases for these path segments:

- `projects/<id>` -> `toIntParam("project", id)`
- `rulesets/<id>` -> `toIntParam("ruleset", id)`
- `categories/<id>` -> `toIntParam("category", id)`
- `trial-run/<id>` -> `toIntParam("run", id)`
- `rules/<id>` -> `toIntId(id)` from `src/lib/rules/rule-id-alias.ts`

Helpers:

- Generic entities: `src/lib/ids/int-alias.ts` (`toIntParam`, `resolveIdParam`, `seedIntParams`).
- Rules only: `src/lib/rules/rule-id-alias.ts` (`toIntId`, `fromIntId`, `seedIntIds`).

Both alias tables seed deterministically on store/facade hydration
(lexicographic sort) so URL numbers are stable across users, browsers,
and reinstalls. Legacy uuid/slug paths still resolve (routes call
`fromIntId` / `resolveIdParam` and fall back to the raw id) so old
bookmarks keep working.

**Why:** The operator has explicitly rejected uuids and name-slugs in
the visible URL more than once. A slug-based address bar (previous
implementation) is a repeat-offender bug. Do NOT reintroduce a
`toSlug()` helper for URL display.

**How to apply:**

- Never render `project.id` / `ruleset.id` / `rule.id` into a `<Link to>` `params`
  or a `href` without wrapping through the alias helper.
- When adding a new URL-facing entity, add it to `IntAliasNamespace` in
  `src/lib/ids/int-alias.ts` and seed it in the owning store's
  `onRehydrateStorage`.
- Address bar (`src/components/shell/AddressBar.tsx`) is the enforcement
  point for display: it rewrites segments in `INT_ALIAS_SEG` on render
  and reverses them on commit. Keep that map in sync when new namespaces
  are added.

## Rule 2: "Edit" on a rule/ruleset opens the ROI editor

The workspace at `/projects/$projectId/rulesets/$rulesetId` is a
management/preview surface, not the rule editor. Any button labeled
"Edit" on a rule row or ruleset row MUST route to `/setup/roi` with
search params `{ project, ruleset, rule? }`. The legacy nested
`/rules/$ruleId` route already redirects there (see
`src/routes/projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx`
and the redirect inside `RulesetEditor`).

**Why:** The operator has repeatedly asked why "Edit" shows the tabs
workspace instead of the actual ROI editing canvas.

## Rule 3: single identity header per workspace

The sticky Titlebar (breadcrumb + address bar) already carries page
identity. Do NOT add a big `font-display uppercase` H1 + subtitle band
on top of a workspace route. If a page needs actions, render one
compact toolbar row (`p-hmi-1`, `text-hmi-caption`, 14px icons) with
the row count / status as a muted inline chip on the left, not a
separate title stack.

## Anti-patterns (do not reintroduce)

- `toSlug(name)` in address-bar / breadcrumb display code.
- Passing `rule.id` / `ruleset.id` / `project.id` directly into
  `<Link>`'s `params` without the alias helper.
- Nested `<header>` + `<h1 className="font-display text-hmi-title uppercase">`
  inside a route body when Titlebar breadcrumb is already visible.
- An "Edit" button on a rule row that navigates to
  `/projects/.../rulesets/...` instead of `/setup/roi`.
