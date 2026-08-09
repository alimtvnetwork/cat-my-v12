# Address-Bar Navigation (Windows-Explorer Titlebar)

Scope: the Titlebar of every route. Replaces the current dual-breadcrumb setup
(one crumb rail in the Titlebar, another in the page body) that produced issue
I-31 in `spec/21-app/53-ui-improvements-v4-assets/plan82/upload-75.png`.

## Anatomy

Left-to-right inside the Titlebar center cluster:

1. Back button (`ArrowLeft`), disabled when `router.history.canGoBack()` is false. Tooltip: "Back (Alt+Left)".
2. Forward button (`ArrowRight`), disabled when `router.history.canGoForward()` is false. Tooltip: "Forward (Alt+Right)".
3. Up button (`ArrowUp`), navigates to the parent segment. Disabled at root. Tooltip: "Up (Alt+Up)".
4. Address bar: a segmented path (Home > Projects > Alpha > Rulesets > Solder Joints). Each segment is a `<Link>` styled as an inline button; a chevron separator sits between segments. The segments are derived from route match data, not from `pathname.split("/")`, so params like `$projectId` show human names, not UUIDs.
5. Overflow menu button on the trailing segment when width is constrained. Reveals a dropdown of the current segment's siblings (route-provided).
6. Edit mode: pressing `Ctrl+L` or clicking a blank area of the address bar swaps the segmented view for a text `<input>` prefilled with the full path. `Enter` navigates via `router.navigate({ to })`, `Escape` reverts. Invalid paths surface an inline error via the shared toast primitive; never a silent no-op.
7. History dropdown (small `ChevronDown` next to Back): most recent 10 entries with route labels, click to jump.

## Data seam

`src/lib/nav/address-bar.ts` exports:

- `useCrumbTrail(): CrumbSegment[]` where `CrumbSegment = { id, label, to, params?, isRoot?, siblings?: CrumbSegment[] }`. It reads `useRouterState({ select: s => s.matches })` and, for each match, calls the route's optional `crumb` static (typed as `(loaderData) => CrumbSegment`). Routes without a `crumb` static are omitted from the trail.
- `resolveTypedPath(path: string): NavigateOptions | null` for the edit-mode `Enter` handler. Returns null on invalid paths so callers can surface a toast.

## Page body: no breadcrumb

Every page component that currently renders `<AppBreadcrumb />` inside the page body MUST remove it. The Titlebar address bar is the single source of truth. A ratchet test in `tests/lint/single-breadcrumb.spec.ts` greps for `<AppBreadcrumb` outside `src/components/chrome/Titlebar.tsx` and fails the build.

## Keyboard contract

- `Ctrl+L`: focus address bar in edit mode, select all.
- `Alt+Left` / `Alt+Right` / `Alt+Up`: history back / forward / up.
- `ArrowLeft` / `ArrowRight` inside the segmented view: move focus between segments.
- `Enter` on a focused segment: navigate to that segment.
- `Escape` in edit mode: revert to segmented view.

## Accessibility

- Address bar wrapper: `role="navigation"`, `aria-label="Address bar"`.
- Each segment button: `aria-current="page"` on the last segment.
- Edit input: `aria-label="Type a path"`, `aria-invalid` toggled on parse failure.
- Back / Forward / Up: `aria-label` + tooltip; disabled state announced.

## Padding and density

- Titlebar height stays at the current density-toggle value (comfortable 40px / compact 32px). Address bar does not add its own vertical padding.
- Segments: `px-2 py-1`, 13px tabular numerics for numeric labels (order indexes, IDs).
- Chevron separators: 12px, `text-fg-muted`.

## Non-goals

- No breadcrumb JSON-LD emission (Titlebar is UI chrome, not document metadata).
- No global search box inside the address bar; that is Command Palette's job (`Ctrl+K`).
- No favicon-style route icons in v1; deferred.

## When it applies

Phase C of Plan 100 (steps 21-30). No page shipped after Phase C may render a
second breadcrumb outside the Titlebar.
