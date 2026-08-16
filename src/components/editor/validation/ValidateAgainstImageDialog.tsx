import { ClientLogger } from "@/lib/observability/client-logger";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  X,
  Upload,
  PlayCircle,
  RotateCcw,
  AlertTriangle,
  StopCircle,
  Database,
} from "lucide-react";
import {
  useValidationStore,
  runStubValidation,
  type ValidationResult,
  ValidationStatusType,
} from "@/lib/editor/validation-store";
import {
  scoreRulesRemote,
  ScoreErrorCodeType,
  type ScoreErrorCode,
  type ScoreError,
  type ScoreResult,
} from "@/lib/editor/validation.functions";
import { useWorkerHealthStore } from "@/lib/editor/worker-health-store";
import { WorkerHealthBanner } from "@/components/editor/validation/WorkerHealthBanner";
import { buildCacheKey, getCachedRun, setCachedRun } from "@/lib/editor/validation-cache";
import type { EditorRule } from "@/lib/editor/types";
import { formatErrorCode } from "@/lib/errors/format";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

/**
 * Validate Against Image dialog, Plan 64 step 70.
 *
 * Root cause it addresses: operators had no way to sanity-check a rule
 * set against a candidate image, so the pass / fail chips on the Layers
 * list had nothing to render. This dialog:
 *   1. Accepts an image via file input or drag-drop; defaults to the
 *      ruleset's own `imageRef` when present so a "Validate now" button
 *      works with zero clicks.
 *   2. Runs `runStubValidation` (a deterministic placeholder pending the
 *      real Python worker per spec 09 line 231), pushes the result map
 *      into `useValidationStore`, and closes.
 *   3. Every result is stamped `stub: true` so the real backend can
 *      distinguish placeholders once it lands.
 *
 * Failure paths log with a `[validate]` tag and surface in the alert
 * region; there is no silent try/catch.
 */
interface Props {
  open: boolean;
  rulesetId: string;
  rules: readonly EditorRule[];
  defaultImageRef: string | null;
  onClose: () => void;
}

interface CandidateImage {
  src: string;
  name: string;
  width: number;
  height: number;
}

interface CacheHitInfo {
  cachedAt: number;
  attempts: number;
  elapsedMs: number;
}

interface LastRunSummary {
  pass: number;
  fail: number;
  warn: number;
  attempts: number;
  elapsedMs: number;
  stub: boolean;
}

async function decodeImage(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Image could not be decoded."));
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  });
}

async function readFileAsCandidate(file: File): Promise<CandidateImage> {
  if (file.type.startsWith("image/") === false) {
    throw new Error(`Not an image (MIME "${file.type || "unknown"}").`);
  }

  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
  const { w, h } = await decodeImage(src);

  return { src, name: file.name, width: w, height: h };
}

export function ValidateAgainstImageDialog({
  open,
  rulesetId,
  rules,
  defaultImageRef,
  onClose,
}: Props) {
  const [candidate, setCandidate] = useState<CandidateImage | null>(null);
  const [error, setError] = useState<ScoreError | { code: "CLIENT"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [useStub, setUseStub] = useState(false);
  const [cacheHit, setCacheHit] = useState<CacheHitInfo | null>(null);
  const [lastRun, setLastRun] = useState<LastRunSummary | null>(null);
  const runBtnRef = useRef<HTMLButtonElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const setResults = useValidationStore((s) => s.setResults);
  const clearResults = useValidationStore((s) => s.clear);
  const scoreRemote = useServerFn(scoreRulesRemote);
  // Health lives in `useWorkerHealthStore` so the /setup shell banner and
  // this dialog share one probe. Reading only what we need keeps rerenders
  // scoped: the dialog re-renders on health changes, not on `loading`.
  const health = useWorkerHealthStore((s) => s.health);
  const refreshHealth = useWorkerHealthStore((s) => s.refresh);

  // Preload the ruleset's reference image when the dialog opens so
  // "Run validation" works with no clicks. Failure to decode the
  // default is logged but not shown as a blocking error: the operator
  // can still supply a fresh image.
  const isClosed = !open;

  useEffect(() => {
    if (isClosed) return;
    setError(null);
    setCandidate(null);
    setUseStub(false);
    setCacheHit(null);
    setLastRun(null);
    // Reprobe when the dialog opens; the shared store coalesces if the
    // setup banner is already refreshing so this stays a single round trip.
    void refreshHealth();

    if (!defaultImageRef) return;
    let isCancelled = false;
    decodeImage(defaultImageRef)
      .then((dims) => {
        if (isCancelled) return;
        setCandidate({
          src: defaultImageRef,
          name: "Ruleset reference image",
          width: dims.w,
          height: dims.h,
        });
      })
      .catch((err) => {
        ClientLogger.warn("[validate] default image decode failed", err);
      });

    return () => {
      isCancelled = true;
    };
  }, [open, defaultImageRef, refreshHealth]);

  // Abort any in-flight scoring when the dialog unmounts or closes.
  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [open]);

  const onPick = useCallback(async (file: File) => {
    setError(null);
    setCacheHit(null);
    try {
      const next = await readFileAsCandidate(file);
      setCandidate(next);
      ClientLogger.info("[validate] image loaded", {
        name: next.name,
        w: next.width,
        h: next.height,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ClientLogger.error("[validate] image load failed", err);
      setError({ code: "CLIENT", message });
    }
  }, []);

  const eligibleRules = useMemo(() => rules.filter((r) => !r.isHidden), [rules]);

  const workerAvailable = health?.ok === true;
  const forceStub = useStub || !workerAvailable;

  // Peek the cache whenever the current image + rule set combo could match.
  // A hit lets the operator run instantly without a worker round-trip.
  useEffect(() => {
    if (!open || !candidate) {
      setCacheHit(null);

      return;
    }

    let isCancelled = false;
    void buildCacheKey(rulesetId, candidate.src, eligibleRules).then((key) => {
      if (isCancelled) return;
      const hit = getCachedRun(key);
      setCacheHit(
        hit ? { cachedAt: hit.cachedAt, attempts: hit.attempts, elapsedMs: hit.elapsedMs } : null,
      );
    });

    return () => {
      isCancelled = true;
    };
  }, [open, candidate, eligibleRules, rulesetId]);

  const onCancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      ClientLogger.info("[validate] canceled by user");
    }
  }, []);

  const run = useCallback(async () => {
    if (!candidate) {
      setError({ code: "CLIENT", message: "Pick an image to validate against." });

      return;
    }

    if (eligibleRules.length === 0) {
      setError({
        code: "CLIENT",
        message: "This rule set has no visible rules to validate.",
      });

      return;
    }
    // Cache lookup: if we have a stored result for this exact image + rule
    // fingerprint, hydrate the store from it instead of round-tripping.
    const cacheKey = await buildCacheKey(rulesetId, candidate.src, eligibleRules);

    if (!forceStub) {
      const hit = getCachedRun(cacheKey);

      if (hit) {
        ClientLogger.info("[validate] cache hit", {
          cacheKey,
          age_ms: Date.now() - hit.cachedAt,
          attempts: hit.attempts,
        });
        setResults(rulesetId, hit.results, hit.imageName);
        setCacheHit({
          cachedAt: hit.cachedAt,
          attempts: hit.attempts,
          elapsedMs: hit.elapsedMs,
        });
        onClose();

        return;
      }
    }

    setBusy(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let map: Record<string, ValidationResult>;
      let isUsedStub = false;
      let usedAttempts = 0;
      let usedElapsed = 0;

      if (forceStub) {
        isUsedStub = true;
        map = runStubValidation({
          ruleIds: eligibleRules.map((r) => r.id),
          imageWidth: candidate.width,
          imageHeight: candidate.height,
        });
      } else {
        // Race the RPC against the cancel signal. The server fn drives its
        // own retry loop; on cancel we bail out and skip result persistence.
        const rpc = scoreRemote({
          data: {
            imageDataUrl: candidate.src,
            imageName: candidate.name,
            imageWidth: candidate.width,
            imageHeight: candidate.height,
            rules: eligibleRules.map((r) => ({
              id: r.id,
              kind: r.kind,
              name: r.name,
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              params: r.params,
            })),
          },
        }) as Promise<ScoreResult>;
        const cancelPromise = new Promise<ScoreResult>((_, reject) => {
          controller.signal.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
        let remote: ScoreResult;
        try {
          remote = await Promise.race([rpc, cancelPromise]);
        } catch (abortErr) {
          if (abortErr instanceof DOMException && abortErr.name === "AbortError") {
            ClientLogger.info("[validate] scoring aborted");
            setError({
              code: ScoreErrorCodeType.WORKER_ABORTED,
              message: "Scoring canceled before the worker returned.",
              attempts: 0,
              elapsedMs: 0,
            });

            return;
          }

          throw abortErr;
        }

        if (remote.ok === false) {
          ClientLogger.warn("[validate] remote scoring failed", remote.error);
          setError(remote.error);
          // Refresh the shared banner so the UI reflects the fresh failure.
          void refreshHealth();
          // Fall back to the stub so the operator still gets chips to
          // reason about, but keep the structured error visible.
          isUsedStub = true;
          map = runStubValidation({
            ruleIds: eligibleRules.map((r) => r.id),
            imageWidth: candidate.width,
            imageHeight: candidate.height,
          });
        } else {
          usedAttempts = remote.attempts;
          usedElapsed = remote.elapsedMs;
          map = Object.fromEntries(
            Object.entries(remote.data.results).map(([id, r]) => [
              id,
              { ...r, stub: false } as unknown as ValidationResult,
            ]),
          );
        }
      }

      const pass = Object.values(map).filter((v) => v.status === ValidationStatusType.Pass).length;
      const fail = Object.values(map).filter((v) => v.status === ValidationStatusType.Fail).length;
      const warn = Object.values(map).filter((v) => v.status === ValidationStatusType.Warn).length;
      ClientLogger.info("[validate] run complete", {
        image: candidate.name,
        count: eligibleRules.length,
        pass,
        fail,
        warn,
        stub: isUsedStub,
        attempts: usedAttempts,
        elapsedMs: usedElapsed,
      });
      setResults(rulesetId, map, candidate.name);
      setLastRun({
        pass,
        fail,
        warn,
        attempts: usedAttempts,
        elapsedMs: usedElapsed,
        stub: isUsedStub,
      });

      if (!isUsedStub) {
        setCachedRun(cacheKey, {
          results: map,
          imageName: candidate.name,
          cachedAt: Date.now(),
          attempts: usedAttempts,
          elapsedMs: usedElapsed,
        });
      }

      if (!isUsedStub) onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ClientLogger.error("[validate] run failed", err);
      setError({ code: "CLIENT", message });
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }, [
    candidate,
    eligibleRules,
    setResults,
    onClose,
    scoreRemote,
    rulesetId,
    forceStub,
    refreshHealth,
  ]);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];

      if (file) void onPick(file);
    },
    [onPick],
  );

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Validate against image"
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-hmi-6"
      onClick={onClose}
      onKeyDown={(e) => {
        if (KeyboardKeyType.isEscape(e.key)) onClose();

        if (KeyboardKeyType.isEnter(e.key) && !busy && candidate && eligibleRules.length > 0) {
          e.preventDefault();
          void run();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col rounded-lg border border-ca-border bg-ca-panel shadow-2xl"
      >
        <header className="flex items-center justify-between gap-hmi-3 border-b border-ca-border px-hmi-4 py-hmi-3">
          <h2 className="font-display text-hmi-header font-extrabold uppercase tracking-wide text-ca-ink">
            Validate against image
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close validate dialog"
            className="editor-rule-icon"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex flex-col gap-hmi-3 px-hmi-4 py-hmi-4">
          {/* Shared worker health banner. The `compact` variant disables the
              built-in poll (the /setup layout already polls) so the dialog
              only forces a refresh on open and after a scoring failure. */}
          <WorkerHealthBanner compact pollMs={0} testId="validate-worker-health-banner" />

          {workerAvailable ? (
            <label className="flex items-center gap-hmi-2 text-hmi-caption text-ca-ink-muted">
              <input
                type="checkbox"
                checked={useStub}
                onChange={(e) => setUseStub(e.target.checked)}
              />
              Force stub scorer (skip worker)
            </label>
          ) : null}

          <p className="text-hmi-caption text-ca-ink-muted">
            Runs {eligibleRules.length}{" "}
            {eligibleRules.length === 1 ? "visible rule" : "visible rules"} against the picked image
            and shows pass / fail chips inline on the Layers list.
            {forceStub ? " Using stub scorer." : " Scoring via Python worker."}
          </p>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex flex-col items-center gap-hmi-2 rounded-md border border-dashed border-ca-border bg-ca-panel-2/40 p-hmi-4 text-center"
          >
            {candidate ? (
              <>
                <img
                  src={candidate.src}
                  alt={candidate.name}
                  className="max-h-40 w-auto rounded-sm border border-ca-border object-contain"
                />
                <p className="text-hmi-caption text-ca-ink-muted">
                  {candidate.name}, {candidate.width} x {candidate.height} px
                </p>
              </>
            ) : (
              <>
                <Upload aria-hidden size={20} className="text-ca-ink-muted" />
                <p className="text-hmi-body text-ca-ink">
                  Drop an image here or use the file picker below.
                </p>
              </>
            )}
            <label className="inline-flex cursor-pointer items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-3 py-hmi-1 text-hmi-caption text-ca-ink hover:border-ca-select">
              <Upload aria-hidden size={14} />
              Choose image
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];

                  if (file) void onPick(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {cacheHit ? (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-hmi-2 rounded-md border border-ca-select/40 bg-ca-select/10 px-hmi-3 py-hmi-2 text-hmi-caption text-ca-ink"
            >
              <Database aria-hidden size={14} className="mt-[2px] text-ca-select" />
              <span className="flex-1">
                Cached result available: last scored{" "}
                {Math.max(1, Math.round((Date.now() - cacheHit.cachedAt) / 1000))}s ago in{" "}
                {cacheHit.elapsedMs} ms across {cacheHit.attempts}{" "}
                {cacheHit.attempts === 1 ? "attempt" : "attempts"}. "Run validation" will reuse it
                without contacting the worker.
              </span>
            </div>
          ) : null}

          {error ? <ErrorBanner error={error} /> : null}

          {lastRun ? (
            <div
              role="status"
              aria-live="polite"
              data-testid="validate-last-run-summary"
              className="flex flex-wrap items-center gap-hmi-2 rounded-md border border-ca-border bg-ca-panel-2/40 px-hmi-3 py-hmi-2 text-hmi-caption text-ca-ink"
            >
              <span className="font-semibold">Last run:</span>
              <span className="text-ca-ok">{lastRun.pass} pass</span>
              <span className="text-ca-ng">{lastRun.fail} fail</span>
              <span className="text-ca-ink-muted">{lastRun.warn} warn</span>
              <span className="ml-auto text-ca-ink-muted">
                {lastRun.stub
                  ? "stub scorer"
                  : `${lastRun.elapsedMs} ms, ${lastRun.attempts} ${lastRun.attempts === 1 ? "attempt" : "attempts"}`}
              </span>
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-hmi-2 border-t border-ca-border bg-ca-panel-2/40 px-hmi-4 py-hmi-3">
          <button
            type="button"
            onClick={() => {
              clearResults(rulesetId);
              ClientLogger.info("[validate] results cleared", { rulesetId });
            }}
            className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-border bg-ca-panel px-hmi-3 py-hmi-1.5 text-hmi-caption text-ca-ink transition hover:border-ca-select"
          >
            <RotateCcw size={14} aria-hidden />
            Clear results
          </button>
          <div className="flex items-center gap-hmi-2">
            {busy ? (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-hmi-2 rounded-sm border border-ca-ng bg-ca-panel px-hmi-3 py-hmi-2 text-hmi-body font-semibold text-ca-ng transition hover:bg-ca-ng/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
                aria-label="Cancel scoring"
              >
                <StopCircle size={16} aria-hidden />
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              ref={runBtnRef}
              autoFocus
              onClick={run}
              disabled={!candidate || busy || eligibleRules.length === 0}
              title={
                !candidate
                  ? "Pick an image to validate against."
                  : eligibleRules.length === 0
                    ? "This rule set has no visible rules."
                    : busy
                      ? "Scoring in progress."
                      : "Run validation (Enter)"
              }
              className="inline-flex items-center gap-hmi-2 rounded-sm bg-ca-select px-hmi-4 py-hmi-2 text-hmi-body font-semibold text-ca-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
            >
              <PlayCircle size={16} aria-hidden />
              {busy
                ? "Running..."
                : cacheHit && !forceStub
                  ? "Use cached"
                  : forceStub
                    ? "Run (stub)"
                    : "Run validation"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ErrorBanner({ error }: { error: ScoreError | { code: "CLIENT"; message: string } }) {
  const isStructured = error.code !== "CLIENT";
  const attempts =
    "attempts" in error && typeof error.attempts === "number" ? error.attempts : null;
  const status = "status" in error ? error.status : undefined;
  const snippet = "snippet" in error ? error.snippet : undefined;

  return (
    <div
      role="alert"
      className="flex flex-col gap-hmi-1 rounded-md border border-ca-ng/60 bg-ca-ng/10 px-hmi-3 py-hmi-2 text-hmi-caption text-ca-ink"
    >
      <div className="flex items-start gap-hmi-2">
        <AlertTriangle aria-hidden size={14} className="mt-[2px] text-ca-ng" />
        <div className="flex-1">
          <p className="font-semibold text-ca-ng">
            {isStructured ? formatErrorCode(error.code) : "Client error"}
            {typeof status === "number" ? ` (HTTP ${status})` : ""}
            {attempts && attempts > 1 ? ` after ${attempts} attempts` : ""}
          </p>
          <p>{error.message}</p>
          {isStructured ? (
            <p className="mt-hmi-1 font-hmi-mono text-[10px] text-ca-ink-muted">
              code: {error.code}
            </p>
          ) : null}
        </div>
      </div>
      {snippet ? (
        <pre className="max-h-24 overflow-auto rounded border border-ca-border bg-ca-panel/60 p-hmi-2 font-hmi-mono text-[10px] leading-tight text-ca-ink-muted whitespace-pre-wrap">
          {snippet}
        </pre>
      ) : null}
    </div>
  );
}
