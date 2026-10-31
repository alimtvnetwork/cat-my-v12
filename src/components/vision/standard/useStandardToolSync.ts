import { useCallback, useMemo } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import { useStandardToolContext } from "./StandardToolContext";

export interface StandardToolSyncParams<TParams extends Record<string, unknown>> {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  defaultParams: TParams;
}

export interface StandardToolSyncResult<TParams extends Record<string, unknown>> {
  params: TParams;
  updateParam: <K extends keyof TParams>(key: K, value: TParams[K]) => void;
  updateParams: (patch: Partial<TParams>) => void;
}

export function useStandardToolSync<TParams extends Record<string, unknown>>(
  syncParams: StandardToolSyncParams<TParams>,
): StandardToolSyncResult<TParams> {
  const context = useStandardToolContext();
  const rawParams = (syncParams.settings.params ?? {}) as Record<string, unknown>;

  const mergedParams = useMemo(() => {
    return {
      ...syncParams.defaultParams,
      ...rawParams,
    } as TParams;
  }, [syncParams.defaultParams, rawParams]);

  const updateParam = useCallback(
    <K extends keyof TParams>(key: K, value: TParams[K]) => {
      if (context) {
        context.updateParam({ key: key as string, value });

        return;
      }

      syncParams.onChange((prev) => ({
        ...prev,
        params: {
          ...(prev.params ?? {}),
          [key]: value,
        },
      }));
    },
    [context, syncParams],
  );

  const updateParams = useCallback(
    (patch: Partial<TParams>) => {
      if (context) {
        context.updateParams(patch as Record<string, unknown>);

        return;
      }

      syncParams.onChange((prev) => ({
        ...prev,
        params: {
          ...(prev.params ?? {}),
          ...patch,
        },
      }));
    },
    [context, syncParams],
  );

  return {
    params: mergedParams,
    updateParam,
    updateParams,
  };
}
