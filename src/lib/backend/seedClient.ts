import { BackendClient, Envelope } from "./types";

export class SeedBackendClient implements BackendClient {
  async ping(): Promise<Envelope<{ pong: boolean }>> {
    return {
      Status: {
        IsSuccess: true,
        IsFailed: false,
        Code: 200,
        Message: "OK",
        Timestamp: new Date().toISOString(),
      },
      Attributes: {
        RequestedAt: new Date().toISOString(),
        HasAnyErrors: false,
        IsSingle: true,
        IsMultiple: false,
        IsEmpty: false,
      },
      Results: [{ pong: true }],
    };
  }
}
