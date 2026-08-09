/**
 * Route: `/cli/settings` - effective-config accordion.
 *
 * Plan 90 Step 120. Renders the 5-layer resolution
 * (defaults -> repo -> user -> env -> flags) returned by
 * `GET /api/cli/config/effective` (see `BE/routes/cli_config.py`) via
 * `src/lib/observability/config.functions.ts::getEffectiveConfig`.
 *
 * Per-layer diff: each layer entry is compared against `effective` and
 * badged as `winner` (this layer supplied the effective value), `same`
 * (matches the effective value but was overridden by a higher-precedence
 * layer), or `differs` (present but shadowed). `not-implemented` layers
 * render an amber caption with the BE-provided `reason` so operators
 * see honestly that repo/user/flags are not wired yet (spec/03-error-manage/
 * §honesty rule: no false-OK).
 *
 * Precedence (low -> high): defaults, repo, user, env, flags. The winning
 * layer for each field is the highest-precedence layer that has a value
 * for that field.
 *
 * `robots: noindex`: internal operator screen.
 */
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserConfigForm } from "@/components/cli/UserConfigForm";
import { DoctorPanel } from "@/components/cli/DoctorPanel";
import { DeveloperPreferences } from "@/components/cli/DeveloperPreferences";
import {
  getEffectiveConfig,
  type EffectiveConfig,
  type EffectiveConfigLayer,
} from "@/lib/observability/config.functions";
import { cn } from "@/lib/utils";
import { CliRouteError } from "@/components/cli/CliRouteError";
import { CliRouteNotFound } from "@/components/cli/CliRouteNotFound";
import { SlidersHorizontal } from "lucide-react";

export const Route = createFileRoute("/cli/settings")({
  head: () => ({
    meta: [
      { title: "CLI Effective Config" },
      {
        name: "description",
        content:
          "5-layer resolution (defaults -> repo -> user -> env -> flags) of the CLI backend effective config.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "CLI Effective Config" },
      {
        property: "og:description",
        content:
          "Accordion view of the CLI backend's effective config, layer by layer with per-field diff.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: async ({ context }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["cli", "config", "effective"],
      queryFn: () => getEffectiveConfig({ data: {} }),
    }),
  component: CliSettingsPage,
  errorComponent: (props) => <CliRouteError {...props} title="Failed to load CLI settings" />,
  notFoundComponent: () => (
    <CliRouteNotFound
      icon={SlidersHorizontal}
      title="Settings panel not found"
      body="This settings subpath does not exist. The effective-config, user overrides, and doctor panels all live on /cli/settings."
    />
  ),
});

const LAYER_ORDER = ["defaults", "repo", "user", "env", "flags"] as const;
type LayerName = (typeof LAYER_ORDER)[number];

interface LayerView {
  name: LayerName;
  layer: EffectiveConfigLayer | null;
  precedence: number;
}

function indexLayers(cfg: EffectiveConfig): LayerView[] {
  return LAYER_ORDER.map((name, idx) => {
    const found = cfg.layers.find((l) => {
      if (l.source === name) return true;

      if (l.source === "not-implemented" && l.layer === name) return true;

      return false;
    });

    return { name, layer: found ?? null, precedence: idx };
  });
}

function winningLayerFor(field: string, views: LayerView[]): LayerName | null {
  for (let i = views.length - 1; i >= 0; i -= 1) {
    const v = views[i];

    if (!v.layer || v.layer.source === "not-implemented") continue;

    if (Object.prototype.hasOwnProperty.call(v.layer.values, field)) {
      return v.name;
    }
  }

  return null;
}

function formatValue(v: unknown): string {
  if (v === null) return "null";

  if (typeof v === "string") return v;

  return JSON.stringify(v);
}

function diffBadge(
  layerValue: unknown,
  effectiveValue: unknown,
  isWinner: boolean,
): { label: string; tone: "winner" | "same" | "differs" } {
  if (isWinner) return { label: "winner", tone: "winner" };

  if (JSON.stringify(layerValue) === JSON.stringify(effectiveValue)) {
    return { label: "same", tone: "same" };
  }

  return { label: "shadowed", tone: "differs" };
}

function CliSettingsPage() {
  const router = useRouter();
  const { data: cfg } = useSuspenseQuery({
    queryKey: ["cli", "config", "effective"],
    queryFn: () => getEffectiveConfig({ data: {} }),
  });
  const views = indexLayers(cfg);
  const effective = cfg.effective.values;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Effective Config</h1>
          <p className="text-sm text-muted-foreground">
            5-layer resolution powering the CLI backend. Higher-precedence layers override lower
            ones.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.invalidate()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </header>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Effective (winning values)
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {cfg.exposed_fields.map((field) => {
            const winner = winningLayerFor(field, views);

            return (
              <div
                key={field}
                className="flex items-center justify-between rounded-md border bg-background/50 px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-mono text-xs text-muted-foreground">{field}</span>
                  <span className="font-mono">{formatValue(effective[field])}</span>
                </div>
                {winner && (
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {winner}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Accordion type="multiple" defaultValue={["env"]} className="rounded-lg border bg-card">
        {views.map((view) => (
          <LayerPanel
            key={view.name}
            view={view}
            effective={effective}
            exposedFields={cfg.exposed_fields}
            views={views}
          />
        ))}
      </Accordion>

      <section className="rounded-lg border bg-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">User-layer overrides</h2>
            <p className="text-xs text-muted-foreground">
              Writes to the user layer via{" "}
              <code className="font-mono">POST /api/cli/config/user</code>. Fields are whitelisted
              by the BE JSON-Schema; unknown keys are rejected with E_BE_BAD_REQUEST.
            </p>
          </div>
        </div>
        <UserConfigForm />
      </section>

      <DeveloperPreferences />

      <DoctorPanel />
    </div>
  );
}

interface LayerPanelProps {
  view: LayerView;
  effective: Record<string, unknown>;
  exposedFields: string[];
  views: LayerView[];
}

function LayerPanel({ view, effective, exposedFields, views }: LayerPanelProps) {
  const { name, layer, precedence } = view;

  return (
    <AccordionItem value={name} className="border-b last:border-0">
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex flex-1 items-center justify-between gap-3 pr-4">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-mono text-[10px]">
              #{precedence + 1}
            </Badge>
            <span className="font-medium capitalize">{name}</span>
          </div>
          {layer?.source === "not-implemented" && (
            <Badge
              variant="outline"
              className="border-amber-500/50 text-amber-600 dark:text-amber-400"
            >
              not wired
            </Badge>
          )}
          {layer?.source === "env" && (
            <span className="font-mono text-xs text-muted-foreground">prefix {layer.prefix}</span>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        {!layer ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Layer not returned by BE</AlertTitle>
            <AlertDescription>
              The backend did not include a `{name}` layer in its response. This is a wire drift,
              not an operator-facing issue.
            </AlertDescription>
          </Alert>
        ) : layer.source === "not-implemented" ? (
          <Alert className="border-amber-500/50">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertTitle className="text-amber-700 dark:text-amber-300">
              Not yet implemented
            </AlertTitle>
            <AlertDescription className="text-amber-700/90 dark:text-amber-300/90">
              {layer.reason}
            </AlertDescription>
          </Alert>
        ) : (
          <LayerValueTable
            values={layer.values}
            effective={effective}
            exposedFields={exposedFields}
            layerName={name}
            views={views}
          />
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

interface LayerValueTableProps {
  values: Record<string, unknown>;
  effective: Record<string, unknown>;
  exposedFields: string[];
  layerName: LayerName;
  views: LayerView[];
}

function LayerValueTable({
  values,
  effective,
  exposedFields,
  layerName,
  views,
}: LayerValueTableProps) {
  const rows = exposedFields.map((field) => {
    const hasValue = Object.prototype.hasOwnProperty.call(values, field);
    const isWinner = winningLayerFor(field, views) === layerName;

    return { field, hasValue, isWinner };
  });

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Field</th>
            <th className="px-3 py-2 text-left font-medium">This Layer</th>
            <th className="px-3 py-2 text-left font-medium">Effective</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ field, hasValue, isWinner }) => {
            const layerValue = hasValue ? values[field] : undefined;
            const effValue = effective[field];
            const badge = hasValue
              ? diffBadge(layerValue, effValue, isWinner)
              : { label: "absent", tone: "differs" as const };

            return (
              <tr key={field} className="border-t">
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{field}</td>
                <td className="px-3 py-2 font-mono">
                  {hasValue ? (
                    formatValue(layerValue)
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {formatValue(effValue)}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "inline-block rounded px-2 py-0.5 text-[10px] font-medium uppercase",
                      badge.tone === "winner" &&
                        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                      badge.tone === "same" && "bg-sky-500/15 text-sky-700 dark:text-sky-300",
                      badge.tone === "differs" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
