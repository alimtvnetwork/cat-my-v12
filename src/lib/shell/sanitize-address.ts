// Pure helpers for AddressBar query-string sanitation.
//
// Extracted from `src/components/shell/AddressBar.tsx` so the rules are
// unit-testable without React or the router. Two invariants:
//   1. Every `__lovable_*` param and the `e2e` param are stripped.
//   2. The output query never contains a leading `?`, so callers can
//      safely prefix with `?` themselves (no `??` will ever render).

/** True when the key is Lovable-internal preview plumbing. */
export function isInternalQueryKey(key: string): boolean {

  return key.startsWith("__lovable") || key === "e2e";
}

/**
 * Sanitize a raw `searchStr` (as produced by TanStack Router). Accepts
 * inputs with any number of leading `?` and any number of repeated
 * internal keys. Returns a query body WITHOUT a leading `?`; returns
 * an empty string when nothing survives.
 */
export function sanitizeSearchString(rawSearch: string | null | undefined): string {
  const s = (rawSearch ?? "").replace(/^\?+/, "");

  if (!s) return "";
  const params = new URLSearchParams(s);
  const drop: string[] = [];
  params.forEach((_, key) => {
    if (isInternalQueryKey(key)) drop.push(key);
  });
  // `delete(key)` removes ALL entries for that key, so repeated
  // `__lovable_token=…&__lovable_token=…` collapses cleanly.
  for (const k of drop) params.delete(k);

  return params.toString();
}

/** Compose a pathname with a sanitized search body, guaranteeing no `??`. */
export function composeCleanUrl(pathname: string, sanitizedSearch: string): string {

  return sanitizedSearch ? `${pathname}?${sanitizedSearch}` : pathname;
}
