import { DraftOriginType } from "@/lib/rules/draftStore";
/**
 * Route: `/cli/rules/import` - drag-drop rule bundle upload.
 *
 * Plan 90 Step 117. Companion to the Step-116 editor. Operators drop a
 * `.json` file, we validate it against the shared `RuleSetEnvelopeZ`
 * (`src/lib/rules/envelope-schema.ts`, mirror of
 * `BE/app/domain/rule_set.py` `parse_envelope`), compute a SHA-256
 * checksum for the audit trail, and require an explicit
 * `<AlertDialog>` confirmation before committing via the same
 * `saveRuleSet` client (`src/lib/rules/saveRuleSet.ts`) the editor
 * uses. Deliberately reuses `PUT /rules/{RuleSetId}` rather than
 * inventing a `POST /rules/import` endpoint - the wire contract is
 * already an idempotent upsert keyed by `RuleSetId`.
 *
 * Root cause guarded (one sentence): without an upload seam, operators
 * had to paste multi-KB JSON into the Step-116 textarea to seed a new
 * bundle, which risks whitespace corruption and skips the checksum
 * confirmation step required by the audit trail in
 * `spec/21-app/80-ruleset-draft-save.md`.
 *
 * Guards:
 *   - Size ceiling: 1 MiB. Rule bundles are hand-authored JSON with a
 *     few dozen `RuleItem` entries; anything larger is either malformed
 *     or the wrong file. Uploads exceeding the cap are rejected client
 *     side with `E_FE_TOO_LARGE`-shaped copy, never handed to the BE.
 *   - Extension: only `.json` accepted by the file picker; the drop
 *     handler rejects anything else with an explicit message rather
 *     than silently coercing.
 *   - Schema: same `.strict()` validator as the editor, so unknown
 *     keys fail loudly instead of round-tripping to the BE.
 *   - Confirmation: SHA-256 + rule count + RuleSetId displayed in an
 *     `AlertDialog` before the `PUT`. No auto-commit.
 *
 * Post-commit: mirrors the response back into IndexedDB via `putDraft`
 * (with `Origin: "server"`), invalidates `["cli-rules"]` +
 * `["rule-draft", RuleSetId]` so the parent table and the Step-116
 * editor rebind, then navigates to the editor for review.
 *
 * `robots: noindex`: internal operator surface.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CliRouteNotFound } from "@/components/cli/CliRouteNotFound";
import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/wrappers/use-app-mutation";
import { useCallback, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileJson, Loader2, Upload } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { sha256Hex, validateEnvelopeJson } from "@/lib/rules/envelope-schema";
import { putDraft, type RuleSetEnvelope } from "@/lib/rules/draftStore";
import { saveRuleSet, type SaveRuleSetError } from "@/lib/rules/saveRuleSet";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

const MAX_BYTES = 1 * 1024 * 1024; // 1 MiB; see JSDoc above.

interface StagedBundle {
  fileName: string;
  size: number;
  checksum: string;
  envelope: RuleSetEnvelope;
}

interface StageError {
  code: "E_FE_WRONG_EXT" | "E_FE_TOO_LARGE" | "E_FE_READ_FAILED" | "E_FE_INVALID_SCHEMA";
  message: string;
}

async function stageFile(
  file: File,
): Promise<{ ok: true; bundle: StagedBundle } | { ok: false; error: StageError }> {
  if (file.name.toLowerCase().endsWith(".json") === false) {
    return {
      ok: false,
      error: {
        code: "E_FE_WRONG_EXT",
        message: `expected .json, got "${file.name}"`,
      },
    };
  }

  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: {
        code: "E_FE_TOO_LARGE",
        message: `bundle is ${(file.size / 1024).toFixed(1)} KiB, cap is ${MAX_BYTES / 1024} KiB`,
      },
    };
  }

  let text: string;
  try {
    text = await file.text();
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "E_FE_READ_FAILED",
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }

  const parsed = validateEnvelopeJson(text);

  if (parsed.ok === false) {
    return {
      ok: false,
      error: { code: "E_FE_INVALID_SCHEMA", message: parsed.message },
    };
  }

  const checksum = await sha256Hex(text);

  return {
    ok: true,
    bundle: {
      fileName: file.name,
      size: file.size,
      checksum,
      envelope: parsed.envelope,
    },
  };
}

export const Route = createFileRoute("/cli/rules/import")({
  component: RuleImport,
  notFoundComponent: () => (
    <CliRouteNotFound
      icon={Upload}
      title="Import page not found"
      body="The rule-import surface lives at /cli/rules/import. Any deeper path is unmatched - drop your bundle on that page instead."
    />
  ),
  head: () => ({
    meta: [
      { title: "Import rule bundle - CLI ops" },
      {
        name: "description",
        content:
          "Drag-drop upload for RuleSetEnvelope JSON with size guard, SHA-256 checksum, and confirmation before commit.",
      },
      { property: "og:title", content: "Import rule bundle" },
      {
        property: "og:description",
        content: "Validate and commit a RuleSetEnvelope JSON file to the backend.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function RuleImport() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [staged, setStaged] = useState<StagedBundle | null>(null);
  const [stageError, setStageError] = useState<StageError | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const commitMutation = useAppMutation({
    mutationFn: async (bundle: StagedBundle) => {
      // Persist to IndexedDB *before* the network call so a transport
      // failure still preserves the operator's uploaded bundle locally.
      const stamped: RuleSetEnvelope = {
        ...bundle.envelope,
        DraftMeta: {
          ...bundle.envelope.DraftMeta,
          UpdatedAt: new Date().toISOString(),
          Origin: DraftOriginType.Indexeddb,
        },
      };
      await putDraft(stamped);
      const committed = await saveRuleSet(stamped);

      return committed;
    },
    onSuccess: async (committed) => {
      await qc.invalidateQueries({ queryKey: ["cli-rules"] });
      await qc.invalidateQueries({
        queryKey: ["rule-draft", committed.RuleSetId],
      });
      setConfirmOpen(false);
      navigate({
        to: "/cli/rules/$ruleId",
        params: { ruleId: Number(committed.RuleSetId) },
      });
    },
  });

  const handleFile = useCallback(async (file: File) => {
    setStaged(null);
    setStageError(null);
    const result = await stageFile(file);

    if (result.ok) {
      setStaged(result.bundle);
    } else {
      setStageError(result.error);
    }
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];

      if (!file) return;
      await handleFile(file);
    },
    [handleFile],
  );

  const commitError = commitMutation.error as SaveRuleSetError | Error | null;

  return (
    <section className="flex flex-col gap-hmi-4 p-hmi-4" aria-labelledby="rule-import-heading">
      <header className="flex items-center gap-hmi-2">
        <Button asChild size="sm" variant="ghost">
          <Link to="/cli/rules">
            <ArrowLeft className="h-4 w-4" /> Rules
          </Link>
        </Button>
        <h1 id="rule-import-heading" className="text-hmi-h2 text-ca-ink">
          Import rule bundle
        </h1>
      </header>

      <p className="text-hmi-body text-ca-ink-muted">
        Drop a <code className="font-mono">.json</code> file matching the{" "}
        <code className="font-mono">RuleSetEnvelope</code> contract. Size cap {MAX_BYTES / 1024}{" "}
        KiB. Validation and SHA-256 run locally; the commit is a{" "}
        <code className="font-mono">PUT /rules/{"{RuleSetId}"}</code> via the same client the editor
        uses.
      </p>

      <div
        role="button"
        tabIndex={0}
        aria-label="Rule bundle drop zone"
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (KeyboardKeyType.isEnterOrSpace(e.key)) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-hmi-2 rounded-hmi-sm border-2 border-dashed p-hmi-4 text-ca-ink-muted transition-colors",
          dragActive
            ? "border-ca-accent bg-ca-accent-soft/40 text-ca-ink"
            : "border-ca-border bg-ca-surface",
        )}
      >
        <Upload className="h-8 w-8" />
        <p className="text-hmi-body">
          Drop a bundle here, or <span className="text-ca-accent">click to browse</span>
        </p>
        <p className="text-hmi-caption">Accepts .json up to {MAX_BYTES / 1024} KiB</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];

            if (file) await handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {stageError && (
        <div
          role="alert"
          className="flex items-start gap-hmi-2 rounded-hmi-sm border border-red-500/40 bg-red-500/10 p-hmi-3 text-hmi-caption text-red-500"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span className="font-mono">
            {stageError.code}: {stageError.message}
          </span>
        </div>
      )}

      {staged && (
        <div className="flex flex-col gap-hmi-2 rounded-hmi-sm border border-ca-border bg-ca-surface p-hmi-3">
          <div className="flex items-center gap-hmi-2 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-hmi-body">Bundle validated</span>
          </div>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-hmi-3 gap-y-1 text-hmi-caption font-mono">
            <dt className="text-ca-ink-muted">File</dt>
            <dd className="text-ca-ink flex items-center gap-1">
              <FileJson className="h-3 w-3" /> {staged.fileName}
            </dd>
            <dt className="text-ca-ink-muted">Size</dt>
            <dd className="text-ca-ink">{staged.size} B</dd>
            <dt className="text-ca-ink-muted">SHA-256</dt>
            <dd className="text-ca-ink break-all">{staged.checksum}</dd>
            <dt className="text-ca-ink-muted">RuleSetId</dt>
            <dd className="text-ca-ink">{staged.envelope.RuleSetId}</dd>
            <dt className="text-ca-ink-muted">Name</dt>
            <dd className="text-ca-ink">{staged.envelope.Name}</dd>
            <dt className="text-ca-ink-muted">Version</dt>
            <dd className="text-ca-ink">v{staged.envelope.Version}</dd>
            <dt className="text-ca-ink-muted">Rules</dt>
            <dd className="text-ca-ink">
              {staged.envelope.Rules.length} rule
              {staged.envelope.Rules.length === 1 ? "" : "s"}
            </dd>
            <dt className="text-ca-ink-muted">Enabled</dt>
            <dd className="text-ca-ink">{String(staged.envelope.Enabled)}</dd>
          </dl>
          <div className="flex items-center justify-end gap-hmi-2 pt-hmi-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setStaged(null);
                setStageError(null);
              }}
            >
              Discard
            </Button>
            <Button size="sm" onClick={() => setConfirmOpen(true)}>
              Commit to backend
            </Button>
          </div>
          {commitError && (
            <p
              role="alert"
              className="rounded-hmi-sm border border-red-500/40 bg-red-500/10 p-hmi-2 font-mono text-hmi-caption text-red-500"
            >
              commit failed:{" "}
              {"code" in (commitError as SaveRuleSetError)
                ? (commitError as SaveRuleSetError).code + ": "
                : ""}
              {commitError.message}
            </p>
          )}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Commit bundle to backend?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-hmi-2">
                <p>
                  This runs{" "}
                  <code className="font-mono">PUT /rules/{staged?.envelope.RuleSetId}</code> and
                  overwrites the current server-committed envelope for{" "}
                  <span className="font-mono">{staged?.envelope.Name}</span>.
                </p>
                <p className="font-mono text-hmi-caption break-all">SHA-256: {staged?.checksum}</p>
                <p className="text-hmi-caption text-ca-ink-muted">
                  On <code className="font-mono">E_BE_CONFLICT</code> the editor's reconcile flow
                  (Step 135) takes over.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={commitMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!staged || commitMutation.isPending}
              onClick={(e) => {
                e.preventDefault();

                if (staged) commitMutation.mutate(staged);
              }}
            >
              {commitMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Committing...
                </>
              ) : (
                "Confirm commit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
