import { toIntId } from "./rule-id-alias";
import {
  RULESET_SCHEMA_VERSION,
  getDraft,
  putDraft,
  type RuleSetEnvelope,
  type RuleItem,
  RuleKindType,
  ToleranceKindType,
  DraftOriginType,
} from "./draftStore";
import { useBackendMode } from "@/lib/backend/mode";

export interface SyncRuleToBackendParams {
  ruleId: string;
  ruleName: string;
  ruleEnabled?: boolean;
  activeBoxCount?: number;
  totalBoxCount?: number;
  tolerancePx?: number;
  threshold?: number;
  constellation?: unknown[];
  searchRegion?: unknown;
  patternBounds?: { x: number; y: number; width: number; height: number };
}

export async function syncRuleToBackend(
  params: SyncRuleToBackendParams,
): Promise<RuleSetEnvelope | null> {
  const ruleSetId = toIntId(params.ruleId);
  const nowIso = new Date().toISOString();

  let committedEnvelope: RuleSetEnvelope | null = null;

  try {
    const currentDraft = await getDraft(ruleSetId);
    const ruleItemId = (Date.now() % 1000000) + 1;

    const newRuleItem: RuleItem = {
      Id: ruleItemId,
      Kind: RuleKindType.Match,
      Enabled: params.ruleEnabled ?? true,
      Shape: {
        Type: "rect",
        X: params.patternBounds?.x ?? 0,
        Y: params.patternBounds?.y ?? 0,
        W: params.patternBounds?.width ?? 100,
        H: params.patternBounds?.height ?? 100,
      },
      Tolerance: {
        Kind: ToleranceKindType.Abs,
        Value: params.tolerancePx ?? 8,
      },
      Params: {
        WhiteThreshold: params.threshold ?? 170,
        TolerancePaddingPx: params.tolerancePx ?? 8,
        ActiveBoxCount: params.activeBoxCount ?? 31,
        TotalBoxCount: params.totalBoxCount ?? params.activeBoxCount ?? 31,
        Constellation: params.constellation ?? [],
        SearchRegion: params.searchRegion,
      },
    };

    const envelopeToSave: RuleSetEnvelope = currentDraft
      ? {
          ...currentDraft,
          RuleSetId: ruleSetId,
          Name: params.ruleName,
          Rules: [
            ...currentDraft.Rules.filter((r) => r.Kind !== RuleKindType.Match),
            newRuleItem,
          ],
          DraftMeta: {
            ...currentDraft.DraftMeta,
            UpdatedAt: nowIso,
            Origin: DraftOriginType.Indexeddb,
          },
        }
      : {
          SchemaVersion: RULESET_SCHEMA_VERSION,
          RuleSetId: ruleSetId,
          Name: params.ruleName,
          Version: 0,
          Enabled: params.ruleEnabled ?? true,
          Rules: [newRuleItem],
          DraftMeta: {
            ClientId: "browser-client",
            UpdatedAt: nowIso,
            Origin: DraftOriginType.Indexeddb,
          },
        };

    committedEnvelope = await putDraft(envelopeToSave);

    const rawBase = useBackendMode.getState().baseUrl;
    const baseUrl =
      !rawBase ||
      rawBase === "http://localhost:8000" ||
      rawBase === "http://localhost:8080" ||
      rawBase === "http://127.0.0.1:8080"
        ? "http://localhost:8787"
        : rawBase;
    const normalizedBase = baseUrl.replace(/\/+$/, "");

    let serverVersion = committedEnvelope.Version;

    try {
      const checkResp = await fetch(`${normalizedBase}/rules/${ruleSetId}/set`, {
        headers: { Accept: "application/json" },
      });

      if (checkResp.ok) {
        const checkData = await checkResp.json();

        if (checkData?.Results?.[0]?.Version !== undefined) {
          serverVersion = checkData.Results[0].Version;
        }
      }
    } catch {
      // Server not yet populated or unreachable
    }

    const wirePayload: RuleSetEnvelope = {
      ...committedEnvelope,
      Version: serverVersion,
    };

    const putResp = await fetch(`${normalizedBase}/rules/${wirePayload.RuleSetId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(wirePayload),
    });

    if (putResp.ok) {
      const putData = await putResp.json();

      if (putData?.Results?.[0]) {
        const serverCommitted: RuleSetEnvelope = {
          ...putData.Results[0],
          DraftMeta: {
            ...putData.Results[0].DraftMeta,
            Origin: DraftOriginType.Server,
          },
        };

        await putDraft(serverCommitted);

        return serverCommitted;
      }
    }

    return committedEnvelope;
  } catch (err) {
    console.warn("[syncRuleToBackend] Sync error:", err);

    return committedEnvelope;
  }
}
