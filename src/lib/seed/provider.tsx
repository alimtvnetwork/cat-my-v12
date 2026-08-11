import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CatSeedBundle } from "./types";
import { UiSeedSourceType, type UiSeedFacade } from "./facade";
import { makeUiSeedFacade } from "./index";
import { useDataSource } from "@/lib/data-source";

// SeedProvider (Plan 72 step 10). Owns a single UiSeedFacade instance,
// loads the bundle once on mount, and exposes { facade, status, bundle,
// error } to descendants via context. Errors are logged with the full
// Zod path list (spec/03-error-manage: never silent) and surfaced via
// status so downstream UIs can render a boundary state rather than a
// blank screen.

export enum SeedStatusType {
  Idle = "idle",
  Loading = "loading",
  Ready = "ready",
  Error = "error",
}
export type SeedStatus = SeedStatusType;

export interface SeedContextValue {
  facade: UiSeedFacade;
  status: SeedStatus;
  bundle: CatSeedBundle | null;
  error: Error | null;
  /** Re-run load(). Rebuilds the promise chain on the same facade instance. */
  reload: () => void;
}

const SeedContext = createContext<SeedContextValue | null>(null);

/** Raw context accessor for hooks that must degrade gracefully when no
 *  provider is mounted (e.g., isolated component tests). Returns null
 *  outside a `<SeedProvider>`. Prefer `useSeedContext` in production
 *  code paths where the provider is guaranteed by the root route. */
export function useSeedContextOptional(): SeedContextValue | null {
  return useContext(SeedContext);
}

export interface SeedProviderProps {
  children: ReactNode;
  /** Injected facade wins over auto-construction. Tests pass a MemoryUiSeedFacade. */
  facade?: UiSeedFacade;
}

export function SeedProvider({ children, facade }: SeedProviderProps) {
  // Subscribe to the runtime data-source store so switching Seed <-> Backend
  // rebuilds the facade (and therefore reloads the bundle) live. When a
  // facade is injected (tests), we honor it verbatim and ignore the store.
  const dataSource = useDataSource();
  const activeFacade = useMemo(
    () =>
      facade ??
      makeUiSeedFacade({
        source: dataSource === "backend" ? UiSeedSourceType.Remote : UiSeedSourceType.Json,
      }),
    [facade, dataSource],
  );
  const [status, setStatus] = useState<SeedStatus>(SeedStatusType.Idle);
  const [bundle, setBundle] = useState<CatSeedBundle | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCancelled = false;
    setStatus(SeedStatusType.Loading);
    setError(null);
    activeFacade
      .load()
      .then((next) => {
        if (isCancelled) return;
        setBundle(next);
        setStatus(SeedStatusType.Ready);
        // Plan 72 step 18: boot-time slice inventory. One structured log
        // line so ops can confirm which bundle actually loaded on this
        // build (source + version) and spot missing slices before UIs
        // render empty states silently (spec/03-error-manage §3).
        console.info(
          `[seed] SeedProvider ready source=${activeFacade.source} version=${next.version}`,
          {
            source: activeFacade.source,
            version: next.version,
            slices: {
              projects: next.projects.length,
              categories: next.categories.length,
              ruleTemplates: next.ruleTemplates.length,
              toolPresets: next.toolPresets.length,
              sampleImages: next.sampleImages.length,
              programs: next.programs.length,
            },
          },
        );
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        const asError = err instanceof Error ? err : new Error(String(err));
        setError(asError);
        setStatus(SeedStatusType.Error);
        console.error(`[seed] SeedProvider load failed source=${activeFacade.source}`, asError);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeFacade, reloadKey]);

  const value = useMemo<SeedContextValue>(
    () => ({
      facade: activeFacade,
      status,
      bundle,
      error,
      reload: () => setReloadKey((k) => k + 1),
    }),
    [activeFacade, status, bundle, error],
  );

  return <SeedContext.Provider value={value}>{children}</SeedContext.Provider>;
}

export function useSeedContext(): SeedContextValue {
  const value = useContext(SeedContext);

  if (!value) {
    throw new Error(
      "useSeedContext must be used inside <SeedProvider>. Mount it in the root route.",
    );
  }

  return value;
}

/** Convenience selector for the currently loaded bundle. Returns null until ready. */
export function useSeedBundle(): CatSeedBundle | null {
  return useSeedContext().bundle;
}