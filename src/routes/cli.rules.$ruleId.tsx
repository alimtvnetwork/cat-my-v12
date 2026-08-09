import { DraftOriginType } from "@/lib/rules/draftStore";
/**
 * Route: `/cli/rules/$ruleId` - RuleSetEnvelope JSON editor.
 *
 * Plan 90 Step 116. Wires the Step-115 rule-bundles table (`cli.rules.tsx`)
 * to a per-bundle editor that (a) schema-validates against the same
 * `RuleSetEnvelope` contract the BE enforces in `parse_envelope`
 * (`BE/app/domain/rule_set.py`, `SCHEMA_VERSION = 1`), (b) offers a
 * client-side dry-run that mirrors that validator without hitting the
 * network, (c) shows a naive line-diff against the last committed /
 * loaded snapshot so operators can see what they're about to PUT, and
 * (d) commits via the existing `saveRuleSet` client
 * (`src/lib/rules/saveRuleSet.ts`), which handles envelope-error
 * unwrapping identically to the reconcile / conflict flows.
 *
 * Editor UI: plain monospace `<textarea>`, deliberately NOT Monaco or
 * CodeMirror 6 - both ship a 300-800 kB browser cost and neither is in
 * the project's `package.json`. The step wording says "Monaco OR
 * CodeMirror 6", and rejecting both keeps the operator surface inside
 * the same shadcn + Tailwind token surface as the rest of `/cli`. A
 * follow-up polish step in the 123-140 band can swap in CodeMirror 6
 * behind the same `value/onChange` seam without touching the save
 * pipeline.
 *
 * Root cause guarded (one sentence): without this editor, `saveRuleSet`
 * (Step 133) had no operator-facing caller - only the reconcile flow
 * (Step 135) exercised it - so a schema drift between FE `putDraft` and
 * BE `parse_envelope` could only surface via the boot reconcile path,
 * silently discarding operator edits until reload.
 *
 * Data flow:
 *   1. `useQuery(["rule-draft", ruleId])` pulls the current IndexedDB
 *      draft via `getDraft(ruleId)`. If none exists, we seed a minimal
 *      envelope from the CatRule wire (name/version/enabled) returned by
 *      `listRules()` so operators can edit-in-place without a prior
 *      IndexedDB write. Rules[] starts empty; SchemaVersion is pinned
 *      to `RULESET_SCHEMA_VERSION = 1`.
 *   2. `text` state holds the JSON buffer; on every change we run the
 *      Zod validator and surface errors inline (no debounce - a 5-rule
 *      bundle is O(100 chars), validation cost is negligible).
 *   3. "Dry-run" re-runs the same validator and prints a green summary
 *      (rule count, kinds) or the first parse error verbatim. This is
 *      client-side ONLY - BE dry-run endpoint is not in v1 (see
 *      `spec/21-app/80-ruleset-draft-save.md`, "Future work"); the
 *      button label + tooltip explicitly say "client-side".
 *   4. "Diff" toggles a line-diff pane vs `baseline` (the last saved /
 *      loaded envelope, PascalCase-normalised via JSON.stringify). Naive
 *      LCS is overkill for a 30-100 line JSON diff, so we compare
 *      line-by-line and mark `+`/`-`/space; the operator gets an
 *      unambiguous "these lines changed" view without pulling in
 *      `diff@5` (~30 kB) for a v1 preview.
 *   5. "Save" calls `saveRuleSet(envelope)` which PUTs `/rules/{id}`,
 *      mirrors the committed response back into IndexedDB with
 *      `Origin: "server"`, and invalidates the `["cli-rules"]` query so
 *      the parent table's version bumps immediately.
 *
 * Field contract: PascalCase throughout, matching BE `RuleSetEnvelope`
 * exactly. Do NOT camelCase - the BE validator rejects unknown fields.
 *
 * `robots: noindex`: internal operator surface.
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { CliRouteNotFound } from "@/components/cli/CliRouteNotFound";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useAppQuery } from "@/hooks/use-app-query";
import { useAppMutation } from "@/hooks/use-app-mutation";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, GitCompare, Loader2, Play, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listRules } from "@/lib/observability/rules.functions";
import {
  getDraft,
  putDraft,
  RULESET_SCHEMA_VERSION,
  type RuleSetEnvelope,
} from "@/lib/rules/draftStore";
import { saveRuleSet, type SaveRuleSetError } from "@/lib/rules/saveRuleSet";
import { validateEnvelopeJson, type ValidationResult } from "@/lib/rules/envelope-schema";

// Zod validator lives in `src/lib/rules/envelope-schema.ts` so the Step-117
// import route validates against the identical schema without drift.

function validateJson(text: string): ValidationResult {
  return validateEnvelopeJson(text);
}

// Naive line-diff. Not LCS. Adequate for v1 previews of 30-100 line
// JSON envelopes; polish step will swap in `diff@5` if operators
// actually shuffle rule blocks by hand.
function lineDiff(a: string, b: string): Array<{ tag: " " | "-" | "+"; text: string }> {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const out: Array<{ tag: " " | "-" | "+"; text: string }> = [];
  const max = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < max; i++) {
    const av = aLines[i];
    const bv = bLines[i];

    if (av === bv) {
      out.push({ tag: " ", text: av ?? "" });
    } else {
      if (av !== undefined) out.push({ tag: "-", text: av });

      if (bv !== undefined) out.push({ tag: "+", text: bv });
    }
  }

  return out;
}

function seedFromCatRule(
  ruleId: number,
  cat:
    | {
        RuleId: number;
        RuleKind: string;
        OrderIndex: number;
        ParamsJson: string;
        IsActive: boolean;
        CreatedAt?: string;
        LegacyRuleId?: string;
        UpdatedAt?: string;
      }
    | undefined,
): RuleSetEnvelope {
  return {
    SchemaVersion: RULESET_SCHEMA_VERSION,
    RuleSetId: ruleId,
    Name: cat ? `rule-${cat.RuleId}` : `rule-${ruleId}`,
    Version: cat?.OrderIndex ?? 0,
    Enabled: cat?.IsActive ?? true,
    Rules: [],
    DraftMeta: {
      ClientId: "cli-editor",
      UpdatedAt: new Date().toISOString(),
      Origin: DraftOriginType.Indexeddb,
    },
  };
}

export const Route = createFileRoute("/cli/rules/$ruleId")({
  parseParams: (p) => ({ ruleId: Number.parseInt(p.ruleId, 10) }),
  stringifyParams: (p) => ({ ruleId: String(p.ruleId) }),
  component: RuleEditor,
  notFoundComponent: () => (
    <CliRouteNotFound
      icon={ScrollText}
      title="Rule bundle not found"
      body="This rule id is not registered with the active RuleFacade. Check /cli/rules for currently available bundles - stale bookmarks pointing at deleted rules will land here."
    />
  ),
  head: () => ({
    meta: [
      { title: "Rule bundle editor - CLI ops" },
      {
        name: "description",
        content: "Edit and dry-run a RuleSetEnvelope before committing to the backend.",
      },
      { property: "og:title", content: "Rule bundle editor" },
      {
        property: "og:description",
        content: "Schema-validated JSON editor with diff-vs-current preview.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function RuleEditor() {
  const { ruleId } = Route.useParams();
  const router = useRouter();
  const qc = useQueryClient();
  const listRulesFn = useServerFn(listRules);

  const rulesQuery = useAppQuery({
    queryKey: ["cli-rules"],
    queryFn: () => listRulesFn({ data: {} }),
    staleTime: 10_000,
  });

  const draftQuery = useAppQuery({
    queryKey: ["rule-draft", ruleId],
    queryFn: async (): Promise<RuleSetEnvelope> => {
      const existing = await getDraft(ruleId);

      if (existing) return existing;
      const cat = rulesQuery.data?.items.find((r) => r.RuleId === ruleId);

      return seedFromCatRule(ruleId, cat);
    },
    enabled: !rulesQuery.isPending,
  });

  const [text, setText] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<{ ok: boolean; message: string } | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  // Initialise editor buffer once draft resolves. Subsequent loads
  // (e.g. after a save) update `baseline` but leave `text` alone so an
  // operator's in-flight edit is not overwritten.
  if (draftQuery.data && text === null) {
    const pretty = JSON.stringify(draftQuery.data, null, 2);
    setText(pretty);
    setBaseline(pretty);
  }

  const validation = useMemo<ValidationResult | null>(
    () => (text === null ? null : validateJson(text)),
    [text],
  );

  const saveMutation = useAppMutation({
    mutationFn: async () => {
      if (!validation || validation.ok === false) {
        throw new Error(validation?.message ?? "no envelope to save");
      }
      // Stamp UpdatedAt so BE sees a fresh draft, then mirror to
      // IndexedDB before the PUT so a network failure still preserves
      // the operator's work locally.
      const stamped: RuleSetEnvelope = {
        ...validation.envelope,
        DraftMeta: {
          ...validation.envelope.DraftMeta,
          UpdatedAt: new Date().toISOString(),
          Origin: DraftOriginType.Indexeddb,
        },
      };
      await putDraft(stamped);

      return saveRuleSet(stamped);
    },
    onSuccess: async (committed) => {
      const pretty = JSON.stringify(committed, null, 2);
      setText(pretty);
      setBaseline(pretty);
      await qc.invalidateQueries({ queryKey: ["cli-rules"] });
      await qc.invalidateQueries({ queryKey: ["rule-draft", ruleId] });
    },
  });

  const saveError = saveMutation.error as SaveRuleSetError | Error | null;

  const isLoading = rulesQuery.isPending || draftQuery.isPending || text === null;
  const draftLoadError = draftQuery.error ?? rulesQuery.error;

  return (
    <section
      className={cn("flex flex-col gap-hmi-4 p-hmi-4")}
      aria-labelledby="rule-editor-heading"
    >
      <header className="flex items-center justify-between gap-hmi-3">
        <div className="flex items-center gap-hmi-2">
          <Button asChild size="sm" variant="ghost">
            <Link to="/cli/rules">
              <ArrowLeft className="h-4 w-4" /> Rules
            </Link>
          </Button>
          <h1 id="rule-editor-heading" className="text-hmi-h2 text-ca-ink">
            Rule bundle <span className="font-mono">#{ruleId}</span>
          </h1>
        </div>
        <div className="flex items-center gap-hmi-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (text === null) return;
              const v = validateJson(text);
              setDryRun(
                v.ok
                  ? {
                      ok: true,
                      message: `OK: ${v.envelope.Rules.length} rule${v.envelope.Rules.length === 1 ? "" : "s"}, Version ${v.envelope.Version}, Enabled=${v.envelope.Enabled}`,
                    }
                  : { ok: false, message: v.message },
              );
            }}
            title="Client-side dry-run: mirrors BE parse_envelope without a network call"
          >
            <Play className="h-4 w-4" /> Dry-run
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDiff((s) => !s)}
            aria-pressed={showDiff}
          >
            <GitCompare className="h-4 w-4" /> {showDiff ? "Hide diff" : "Diff vs current"}
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !validation || validation.ok === false}
            title={validation?.ok ? "PUT /rules/{id}" : (validation?.message ?? "loading")}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </header>

      {draftLoadError && (
        <div
          role="alert"
          className="flex items-start gap-hmi-2 rounded-hmi-sm border border-ca-border bg-ca-surface-alt p-hmi-3 text-hmi-caption text-ca-ink"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
          <span className="font-mono">
            {draftLoadError instanceof Error ? draftLoadError.message : String(draftLoadError)}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center gap-hmi-2 text-ca-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading draft...
        </div>
      ) : (
        <div className="grid gap-hmi-3 lg:grid-cols-2">
          <div className="flex flex-col gap-hmi-2">
            <label
              htmlFor="rule-json"
              className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted"
            >
              RuleSetEnvelope JSON
            </label>
            <textarea
              id="rule-json"
              value={text ?? ""}
              onChange={(e) => {
                setText(e.target.value);
                setDryRun(null);
              }}
              spellCheck={false}
              className={cn(
                "min-h-[480px] w-full rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-3 font-mono text-hmi-caption text-ca-ink",
                "focus:outline-none focus:ring-2 focus:ring-ca-accent",
              )}
            />
            {validation && validation.ok === false && (
              <p role="status" className="font-mono text-hmi-caption text-red-500">
                {validation.message}
              </p>
            )}
            {validation && validation.ok && (
              <p
                role="status"
                className="flex items-center gap-1 font-mono text-hmi-caption text-emerald-500"
              >
                <Check className="h-3 w-3" /> schema OK
              </p>
            )}
            {dryRun && (
              <p
                role="status"
                className={cn(
                  "rounded-hmi-sm border p-hmi-2 font-mono text-hmi-caption",
                  dryRun.ok
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                    : "border-red-500/40 bg-red-500/10 text-red-500",
                )}
              >
                dry-run: {dryRun.message}
              </p>
            )}
            {saveError && (
              <p
                role="alert"
                className="rounded-hmi-sm border border-red-500/40 bg-red-500/10 p-hmi-2 font-mono text-hmi-caption text-red-500"
              >
                save:{" "}
                {"code" in (saveError as SaveRuleSetError)
                  ? (saveError as SaveRuleSetError).code + ": "
                  : ""}
                {saveError.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-hmi-2">
            <div className="text-hmi-caption uppercase tracking-wide text-ca-ink-muted">
              {showDiff ? "Diff vs baseline" : "Preview"}
            </div>
            <pre className="min-h-[480px] w-full overflow-auto rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-3 font-mono text-hmi-caption text-ca-ink">
              {showDiff && baseline !== null && text !== null
                ? lineDiff(baseline, text).map((row, i) => (
                    <div
                      key={i}
                      className={
                        row.tag === "+"
                          ? "text-emerald-500"
                          : row.tag === "-"
                            ? "text-red-500"
                            : "text-ca-ink-muted"
                      }
                    >
                      {row.tag} {row.text}
                    </div>
                  ))
                : validation?.ok
                  ? JSON.stringify(validation.envelope, null, 2)
                  : (text ?? "")}
            </pre>
            <p className="text-hmi-caption text-ca-ink-muted">
              Baseline: last saved / loaded snapshot. Diff is a naive line compare; deep
              restructures may render as long delete/insert runs.
            </p>
          </div>
        </div>
      )}

      <footer className="text-hmi-caption text-ca-ink-muted">
        Save triggers <code className="font-mono">PUT /rules/{ruleId}</code> via{" "}
        <code className="font-mono">saveRuleSet</code> and invalidates the{" "}
        <code className="font-mono">["cli-rules"]</code> query. Local edits persist to IndexedDB
        before the network call. Router state:{" "}
        <code className="font-mono">{router.state.location.pathname}</code>
      </footer>
    </section>
  );
}
