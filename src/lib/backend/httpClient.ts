import { BackendClient, Envelope } from "./types";
import { fetchBackend } from "./http";

export class HttpBackendClient implements BackendClient {
  async ping(): Promise<Envelope<{ pong: boolean }>> {
    return fetchBackend<{ pong: boolean }>("ping");
  }
}
