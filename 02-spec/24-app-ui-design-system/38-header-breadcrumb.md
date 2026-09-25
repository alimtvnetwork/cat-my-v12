# 38 - Header Breadcrumb Tokens

**Version:** 1.0
**Owner:** Plan 64 step 40
**Depends on:** `10-navigation-shell.md`.

---

## Purpose

Give every route a deterministic breadcrumb without hand-writing labels in each route component. The breadcrumb reads the current match chain and renders one segment per match using a token map defined here.

## Token contract

Each route file exports an optional `crumb` object via `createFileRoute({ ... }).crumb`:

```ts
crumb: {
  label: (params, loaderData) => string,   // required
  icon?: LucideIconName,
  parent?: RoutePath,                       // override implicit parent when the URL structure is not literal
  hidden?: boolean,                         // skip this segment in the trail (useful for pathless layouts)
}
```

- Missing `crumb` -> the breadcrumb component falls back to the route's file segment (e.g. `projects` -> `Projects`), formatted via `formatLabel` from `01-foundations.md` §Naming.
- Dynamic segments MUST provide `label` or the breadcrumb refuses to render and logs `BreadcrumbLabelMissing` (this is a bug, not silent fallback).

## Standard token map

| Route                                 | Label                                  | Icon        |
| ------------------------------------- | -------------------------------------- | ----------- |
| `/`                                   | `Home`                                 | `home`      |
| `/setup`                              | `Setup`                                | `settings`  |
| `/setup/camera`                       | `Camera Setup`                         | `camera`    |
| `/setup/rules`                        | `Rules Setup`                          | `layers`    |
| `/setup/lighting`                     | `Lighting Setup`                       | `lightbulb` |
| `/setup/categories`                   | `Categories`                           | `tag`       |
| `/setup/ai`                           | `AI Settings`                          | `sparkles`  |
| `/rule-sets`                          | `Rule Sets`                            | `layers`    |
| `/rule-sets/$ruleSetId`               | `<RuleSet.name>` (from loader)         | `layers`    |
| `/rule-sets/$ruleSetId/rules/$ruleId` | `<Rule.name>` (from loader)            | `square`    |
| `/projects`                           | `Projects`                             | `folder`    |
| `/projects/$projectId`                | `<Project.name>` (from loader)         | `folder`    |
| `/projects/$projectId/runs/$runId`    | `Run <yyyy-mm-dd hh:mm>` (from loader) | `activity`  |

## Rendering rules

- Component: `<Breadcrumb>` in `src/components/app-shell/Breadcrumb.tsx`.
- Reads `useMatches()` from `@tanstack/react-router`. Filters out matches with `crumb.hidden` and the pathless `_authenticated` layout by default.
- Each segment is a Link; the last segment is rendered as text (not a Link).
- Truncation: middle-ellipsis after a total width of 480 px; the two ends stay visible. A tooltip shows the full chain on hover.
- Long dynamic names are ellipsised individually at 24 chars.

## Interactions

- Keyboard: `Alt+Up` navigates to the parent segment. `Alt+Home` navigates to Home. These are also wired on the `<HistoryNav>` Back button as fallback affordances.
- Right-click on a segment: context menu with `Copy link`, `Open in new tab`.

## Verification

- Playwright: for every route in the token map, assert the visible segments match the expected labels (parameterised by loader-provided names).
- Snapshot test: `formatLabel('_authenticated')` returns `""` because `hidden` is set on that layout.
- No-layout-shift assertion: the breadcrumb height is fixed at `--header-crumb-h`; adding a route with a longer name never grows the header.
