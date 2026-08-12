import { BackendClient, Envelope, CatRuleWire, CatSampleWire } from "./types";

export class SeedBackendClient implements BackendClient {
  async ping(): Promise<Envelope<{ pong: boolean }>> {
    return {
      Status: { IsSuccess: true, IsFailed: false, Code: 200, Message: "OK", Timestamp: new Date().toISOString() },
      Attributes: { RequestedAt: new Date().toISOString(), HasAnyErrors: false, IsSingle: true, IsMultiple: false, IsEmpty: false },
      Results: [{ pong: true }],
    };
  }

  rules = {
    list: async (): Promise<Envelope<{ items: CatRuleWire[]; total: number; provider?: string }>> => {
      return {
        Status: { IsSuccess: true, IsFailed: false, Code: 200, Message: "OK", Timestamp: new Date().toISOString() },
        Attributes: { RequestedAt: new Date().toISOString(), HasAnyErrors: false, IsSingle: false, IsMultiple: true, IsEmpty: false },
        Results: [{
          items: [
            { RuleId: 1, RuleKind: "EdgeDetection", OrderIndex: 0, ParamsJson: "{}", IsActive: true, UpdatedAt: "-" },
            { RuleId: 2, RuleKind: "ColorMatch", OrderIndex: 1, ParamsJson: "{}", IsActive: false, UpdatedAt: "-" }
          ],
          total: 2,
          provider: "SeedClient"
        }]
      };
    },
    create: async (payload: Partial<CatRuleWire>): Promise<Envelope<CatRuleWire>> => {
      return {
        Status: { IsSuccess: true, IsFailed: false, Code: 201, Message: "Created", Timestamp: new Date().toISOString() },
        Attributes: { RequestedAt: new Date().toISOString(), HasAnyErrors: false, IsSingle: true, IsMultiple: false, IsEmpty: false },
        Results: [{
          RuleId: 3,
          RuleKind: payload.RuleKind || "EdgeDetection",
          OrderIndex: payload.OrderIndex || 0,
          ParamsJson: payload.ParamsJson || "{}",
          IsActive: payload.IsActive ?? true,
          UpdatedAt: "-"
        }]
      };
    }
  };

  samples = {
    list: async (): Promise<Envelope<{ items: CatSampleWire[]; total: number; provider?: string }>> => {
      return {
        Status: { IsSuccess: true, IsFailed: false, Code: 200, Message: "OK", Timestamp: new Date().toISOString() },
        Attributes: { RequestedAt: new Date().toISOString(), HasAnyErrors: false, IsSingle: false, IsMultiple: true, IsEmpty: false },
        Results: [{
          items: [
            { SampleId: 1, Label: "Test Sample A", ImageFilePath: "/placeholder.jpg" },
            { SampleId: 2, Label: "Test Sample B", ImageFilePath: "/placeholder.jpg" },
            { SampleId: 3, Label: "Test Sample C", ImageFilePath: "/placeholder.jpg" },
            { SampleId: 4, Label: "Test Sample D", ImageFilePath: "/placeholder.jpg" },
          ],
          total: 4,
          provider: "SeedClient"
        }]
      };
    }
  };
}
