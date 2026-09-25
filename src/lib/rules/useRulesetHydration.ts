import { useEffect, useState } from "react";
import { ClientLogger } from "@/lib/observability/client-logger";
import { DataSourceType, type DataSource } from "@/lib/data-source";
import { toRulesetIntId } from "./ruleset-id-alias";
import { loadRuleSet, type LoadRuleSetError } from "./loadRuleSet";
import type { RuleSetEnvelope } from "./draftStore";

export interface UseRulesetHydrationOptions {
  rulesetId: string;
  dataSource: DataSource;
  onHydrated: (env: RuleSetEnvelope) => void;
}

export function useRulesetHydration(opts: UseRulesetHydrationOptions): { isHydrating: boolean } {
  const { rulesetId, dataSource, onHydrated } = opts;
  const [isHydrating, setIsHydrating] = useState(false);

  useEffect(() => {
    const isBackend = dataSource === DataSourceType.Backend;
    if (isBackend === false) return;

    let isCancelled = false;
    const intId = toRulesetIntId(rulesetId);
    setIsHydrating(true);

    loadRuleSet(intId, { suppressCapture: true })
      .then((env) => {
        if (isCancelled) return;
        setIsHydrating(false);
        onHydrated(env);
      })
      .catch((err: unknown) => {
        if (isCancelled) return;
        setIsHydrating(false);
        const code = (err as LoadRuleSetError)?.code ?? "UNKNOWN";
        ClientLogger.info("[rulesetHydration] server load skipped or not found", {
          rulesetId,
          intId,
          code,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [rulesetId, dataSource, onHydrated]);

  return { isHydrating };
}
