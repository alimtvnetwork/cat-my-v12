// Tiny fetch wrapper that prefixes the persisted backend base URL for
// relative paths. Callers can still pass absolute URLs verbatim.
import { resolveBackendUrl } from "@/lib/data-source";

export function apiFetch(input: string, init?: RequestInit): Promise<Response> {

  return globalThis.fetch(resolveBackendUrl(input), init);
}
