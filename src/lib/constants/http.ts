// Plan 43 slice-2 step 1: shared HTTP-method constants. Replaces inline
// "GET"/"POST"/... string literals across `src/**`. Consumers should import
// `HttpMethod` from `@/lib/constants` or `@/lib/constants/http`.
//
// No call-site migration ships with this file; the leaf lands so slice-2's
// migration step has a stable target.

export const HttpMethod = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE",
  Head: "HEAD",
  Options: "OPTIONS",
} as const;

export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

export const ALL_HTTP_METHODS: readonly HttpMethod[] = Object.freeze([
  HttpMethod.Get,
  HttpMethod.Post,
  HttpMethod.Put,
  HttpMethod.Patch,
  HttpMethod.Delete,
  HttpMethod.Head,
  HttpMethod.Options,
]);

export function isHttpMethod(value: unknown): value is HttpMethod {

  return typeof value === "string" && (ALL_HTTP_METHODS as readonly string[]).includes(value);
}
