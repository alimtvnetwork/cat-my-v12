import { BackendClient, Envelope, CatRuleWire, CatSampleWire } from "./types";
import { fetchBackend } from "./http";

export class HttpBackendClient implements BackendClient {
  async ping(): Promise<Envelope<{ pong: boolean }>> {
    return fetchBackend<{ pong: boolean }>("ping");
  }

  rules = {
    list: async (): Promise<
      Envelope<{ items: CatRuleWire[]; total: number; provider?: string }>
    > => {
      return fetchBackend<{ items: CatRuleWire[]; total: number; provider?: string }>("rules");
    },
    create: async (payload: Partial<CatRuleWire>): Promise<Envelope<CatRuleWire>> => {
      return fetchBackend<CatRuleWire>("rules", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  };

  samples = {
    list: async (): Promise<
      Envelope<{ items: CatSampleWire[]; total: number; provider?: string }>
    > => {
      return fetchBackend<{ items: CatSampleWire[]; total: number; provider?: string }>("samples");
    },
  };
}
