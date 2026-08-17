import { ClientLogger } from "@/lib/observability/client-logger";
import { DataSourceType } from "@/lib/data-source/store";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { Database, Cloud, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setDataSource, useDataSource, type DataSource } from "@/lib/data-source";
import { apiFetch } from "@/lib/http/client";

/**
 * Segmented Seed / Backend selector.
 *
 * - Persists selection through the module-scoped store (localStorage-backed).
 * - Flipping to "backend" opens a confirm dialog, then probes `/api/health`
 *   with a short timeout. Failure keeps the mode on "seed" and toasts.
 * - Flipping back to "seed" is instantaneous (no confirm needed).
 * - Rendered inline on `/` and `/setup`; safe to mount multiple times, the
 *   store is a single source of truth.
 */

interface Props {
  className?: string;
  /** Override the health endpoint (tests). */
  healthUrl?: string;
  /** Injectable fetch for tests. */
  fetchImpl?: typeof fetch;
}

const HEALTH_TIMEOUT_MS = 4000;

async function probeBackend(url: string, fetchImpl: typeof fetch): Promise<void> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HEALTH_TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { method: "GET", signal: ctrl.signal });
    const isFailed = res.ok === false;

    if (isFailed) {
      throw new Error(`Backend health probe returned ${res.status} ${res.statusText}`);
    }
  } finally {
    clearTimeout(t);
  }
}

export function DataSourceToggle({ className, healthUrl = "/api/health", fetchImpl }: Props): React.JSX.Element | null {
  const source = useDataSource();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const doFetch: typeof fetch =
    fetchImpl ?? ((input, init) => apiFetch(input as string, init as RequestInit | undefined));

  const handleValueChange = (next: string) => {
    const isMissingNext = !next;
    const isUnchanged = next === source;

    if (isMissingNext || isUnchanged) return;

    if (next === "backend") {
      setConfirmOpen(true);

      return;
    }

    setDataSource(DataSourceType.Seed, { reason: "toggle" });
    toast.info("Switched to seed sample data");
  };

  const confirmBackend = async () => {
    setConfirmOpen(false);
    setPending(true);
    try {
      await probeBackend(healthUrl, doFetch);
      setDataSource(DataSourceType.Backend, { reason: "toggle+probe-ok" });
      toast.success("Live backend connected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      ClientLogger.warn("[data-source] backend probe failed", { url: healthUrl, msg });
      toast.error(`Backend unreachable, staying on seed data: ${msg}`);
    } finally {
      setPending(false);
    }
  };

  const value: DataSource = source;

  return (
    <>
      <div
        className={
          "inline-flex items-center gap-2 rounded-md border border-ca-border bg-ca-panel/60 px-2 py-1 text-[12px] tabular-nums " +
          (className ?? "")
        }
        data-testid="data-source-toggle"
        aria-label="Data source"
      >
        <span className="text-ca-ink-muted">Data:</span>
        <ToggleGroup
          type="single"
          size="sm"
          value={value}
          onValueChange={handleValueChange}
          disabled={pending}
          aria-label="Choose data source"
        >
          <ToggleGroupItem
            value="seed"
            aria-label="Use seed sample data"
            className="h-6 gap-1 px-2 text-[12px]"
          >
            <Database className="h-3 w-3" aria-hidden />
            Seed
          </ToggleGroupItem>
          <ToggleGroupItem
            value="backend"
            aria-label="Use live backend"
            className="h-6 gap-1 px-2 text-[12px]"
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Cloud className="h-3 w-3" aria-hidden />
            )}
            Backend
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to live backend?</AlertDialogTitle>
            <AlertDialogDescription>
              Reads and writes will hit the real backend. Rule saves, run starts, and project
              changes will persist. We will probe the backend once before switching.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBackend}>Switch</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default DataSourceToggle;
