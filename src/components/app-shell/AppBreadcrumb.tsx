import { useState } from "react";
import { Link, useHydrated, useMatches } from "@tanstack/react-router";
import { Home, MoreHorizontal, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProjectStore } from "@/lib/projects/store";
import { resolveCrumb, registerParamResolver } from "@/lib/breadcrumb-tokens";
/* eslint-disable react-refresh/only-export-components -- `buildCrumbsFromMatches` is a pure helper co-located with the component so its unit test can import it directly; extracting it adds a two-line module for no runtime benefit. */

let isResolversRegistered = false;
function ensureStoreResolvers(): void {
  if (isResolversRegistered) return;
  isResolversRegistered = true;
  registerParamResolver("projectId", (id) => useProjectStore.getState().projects[id]?.name);
  registerParamResolver("rulesetId", (id) => useProjectStore.getState().rulesets[id]?.name);
}

/**
 * Global breadcrumb trail rendered under the Titlebar.
 *
 * - Always starts with Home (/) so users can return to the launcher.
 * - Derives labels from route path segments (title-cased, ids collapsed).
 * - When the trail has more than `maxVisible` crumbs, the middle segments
 *   collapse into a "…" popover that lists the skipped steps and lets the
 *   user jump back to any of them.
 */
const MAX_VISIBLE = 5;

type Crumb = { to: string; label: string };

/**
 * SH-03 (plan 66 step 5): build crumbs from TanStack Router's match tree.
 *
 * For each segment in the current pathname we determine whether it is a
 * dynamic route param by consulting the deepest match's `params` map. Any
 * segment whose value appears in `params` resolves through `resolveCrumb`
 * with the param name (`projectId`, `rulesetId`, ...) so registered store
 * resolvers can translate opaque IDs into human names. Literal segments
 * fall back to the static token map, then `formatLabel`.
 */
export function buildCrumbsFromMatches(
  pathname: string,
  params: Record<string, string>,
  useResolvers: boolean,
): Crumb[] {
  const paramValueToName = new Map<string, string>();
  for (const [name, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) {
      paramValueToName.set(value, name);
    }
  }

  const parts = pathname.split("/").filter((p) => p.length > 0);
  const out: Crumb[] = [];
  let acc = "";
  for (const seg of parts) {
    acc += `/${seg}`;
    // SSR renders with an empty client store, so dynamic-segment resolvers
    // would render the raw ID on the server and the resolved name after
    // hydration, causing a mismatch. Skip resolvers until hydrated; the
    // server output matches the first client render, and the resolved
    // name lands on the next tick.
    const paramName = useResolvers ? paramValueToName.get(seg) : undefined;
    const label = resolveCrumb(seg, paramName);
    out.push({ to: acc, label });
  }

  return out;
}

export interface AppBreadcrumbProps {
  /**
   * `"band"` (default) renders a full-width strip with its own border and
   * `bg-ca-bg`. Used only where the breadcrumb sits outside the Titlebar.
   * `"inline"` drops the border/background so the breadcrumb can nest
   * inside the Titlebar's `<header>` as a 28px sub-row (plan 65 step 22).
   */
  variant?: "band" | "inline";
}

export function AppBreadcrumb({ variant = "band" }: AppBreadcrumbProps = {}) {
  const matches = useMatches();
  const last = matches[matches.length - 1];
  const pathname = last?.pathname ?? "/";
  // useMatches types params per route; merge into a flat lookup.
  const params = (last?.params ?? {}) as Record<string, string>;
  const hydrated = useHydrated();
  // Subscribe to the project store so crumb labels update when projects /
  // rulesets are renamed. Track only params whose name is a known
  // resolver key so unrelated store mutations do not re-render the
  // breadcrumb (plan 67 step 11 polish).
  const nameFingerprint = useProjectStore((s) => {
    let acc = "";
    const projectId = params["projectId"];
    const rulesetId = params["rulesetId"];

    if (typeof projectId === "string") acc += `|p:${s.projects[projectId]?.name ?? projectId}`;

    if (typeof rulesetId === "string") acc += `|r:${s.rulesets[rulesetId]?.name ?? rulesetId}`;

    return acc;
  });
  // Register store-backed resolvers lazily on first render (idempotent).
  if (hydrated) ensureStoreResolvers();
  void nameFingerprint;
  const crumbs = buildCrumbsFromMatches(pathname, params, hydrated);

  // On the home route show a subtle "Home" marker so the strip never
  // collapses to zero height (prevents chrome jitter between routes).
  const showCollapse = crumbs.length + 1 > MAX_VISIBLE;
  let head: Crumb[] = crumbs;
  let middle: Crumb[] = [];
  let tail: Crumb[] = [];

  if (showCollapse) {
    head = crumbs.slice(0, 1);
    tail = crumbs.slice(-2);
    middle = crumbs.slice(1, -2);
  }

  const isInline = variant === "inline";
  const fullLabel = ["Home", ...crumbs.map((c) => c.label)].join(" / ");

  return (
    <nav
      aria-label="Breadcrumb"
      title={fullLabel}
      className={
        isInline
          ? "app-breadcrumb app-breadcrumb-inline flex min-w-0 flex-1 items-center gap-1.5 py-1 text-hmi-caption text-ca-ink-muted"
          : "app-breadcrumb flex min-w-0 items-center gap-1.5 border-b border-ca-border bg-ca-bg px-hmi-4 text-hmi-body text-ca-ink-muted"
      }
      style={isInline ? { height: "var(--header-crumb-h)" } : { height: "var(--header-crumb-h)" }}
    >
      <ol className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden whitespace-nowrap">
        <li className="flex shrink-0 items-center">
          <Link
            to="/"
            aria-label="Home"
            title="Home"
            preload="intent"
            className="app-breadcrumb-link hmi-focus-ring inline-flex items-center gap-1"
          >
            <Home aria-hidden size={14} />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </li>
        {showCollapse ? (
          <>
            {head.map((c) => (
              <CrumbLink key={c.to} crumb={c} last={false} />
            ))}
            <li aria-hidden className="shrink-0 text-ca-ink-muted/60">
              <ChevronRight size={12} />
            </li>
            <li className="shrink-0">
              <CollapsedCrumbs crumbs={middle} />
            </li>
            {tail.map((c, i) => (
              <CrumbLink key={c.to} crumb={c} last={i === tail.length - 1} />
            ))}
          </>
        ) : (
          crumbs.map((c, i) => <CrumbLink key={c.to} crumb={c} last={i === crumbs.length - 1} />)
        )}
      </ol>
    </nav>
  );
}

function CrumbLink({ crumb, last }: { crumb: Crumb; last: boolean }) {
  return (
    <>
      <li aria-hidden className="app-breadcrumb-sep shrink-0 text-ca-ink-muted/70">
        <ChevronRight size={12} />
      </li>
      <li
        className={last ? "min-w-0 flex-1 truncate" : "min-w-0 shrink truncate"}
        title={crumb.label}
      >
        {last ? (
          <span aria-current="page" className="app-breadcrumb-current truncate">
            {crumb.label}
          </span>
        ) : (
          <Link
            to={crumb.to}
            preload="intent"
            aria-label={`Go to ${crumb.label}`}
            className="app-breadcrumb-link hmi-focus-ring truncate"
          >
            {crumb.label}
          </Link>
        )}
      </li>
    </>
  );
}

function CollapsedCrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Show hidden breadcrumb steps"
          title="Show hidden breadcrumb steps"
          className="app-breadcrumb-link hmi-focus-ring inline-flex items-center rounded-sm px-1 py-0.5 hover:bg-ca-select/40 hover:text-ca-chrome-ink"
        >
          <MoreHorizontal size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 border-ca-border bg-ca-panel p-1 text-ca-ink">
        <ul className="flex flex-col">
          {crumbs.map((c) => (
            <li key={c.to}>
              <Link
                to={c.to}
                preload="intent"
                onClick={() => setOpen(false)}
                className="hmi-focus-ring block truncate rounded-sm px-2 py-1.5 text-hmi-body hover:bg-ca-panel-2"
              >
                {c.label}
              </Link>
            </li>
          ))}
          {crumbs.length === 0 ? (
            <li className="px-2 py-1.5 text-hmi-body text-ca-ink-muted">No hidden steps</li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
