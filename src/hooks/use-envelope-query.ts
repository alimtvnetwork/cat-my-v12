// Plan 90 Step 105: uniform useQuery wrapper for Universal Envelope list routes.
//
// Spec:
//   spec/03-error-manage/02-error-architecture/05-response-envelope/
//   spec/coding-guidelines/typescript.md
//   BE/envelope.py (Attributes.TotalRecords / PerPage / TotalPages / CurrentPage)
//
// Contract:
//   - Wraps `useQuery` so callers get `{ items, pagination, envelope }` directly
//     instead of hand-reading `Results` / `Attributes` at every list-render site.
//   - `queryFn` returns the full `Envelope<T>` (typically via `beFetch<T>(...)`).
//   - Failures are typed `EnvelopeError` and reach `QueryCache.onError` in
//     `src/router.tsx`, which routes to `GlobalErrorModal` unless the caller
//     opts out via `meta.suppressGlobalError`.
//   - No silent fallback. Empty list on transport failure would hide the very
//     `E_BE_UNAVAILABLE` signal the envelope contract exists to surface.
//
// Consumers land in Steps 106 (`cli.tsx` sidebar tabs), 107-111 (sessions +
// SSE tail), 112 (IPC inbox), 113 (rules table), 116 (samples grid).

import { type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { useAppQuery, type AppQueryResult } from "@/lib/wrappers/use-app-query";

import type { Envelope, EnvelopeAttributes, EnvelopeError } from "@/lib/be-fetch";

/** Normalised pagination view derived from `envelope.Attributes`. */
export interface EnvelopePagination {
  totalRecords: number;
  perPage: number | null;
  totalPages: number | null;
  currentPage: number | null;
  isSingle: boolean;
  isMultiple: boolean;
  isEmpty: boolean;
}

export type UseEnvelopeQueryResult<T> = AppQueryResult<Envelope<T>, EnvelopeError> & {
  /** `Results` from the envelope, or `[]` while pending / on error. Never `undefined`. */
  items: T[];
  /** Normalised pagination derived from `Attributes`. `null` when no envelope yet. */
  pagination: EnvelopePagination | null;
  /** Raw envelope for callers that need `Navigation` / `MethodsStack`. */
  envelope: Envelope<T> | undefined;
};

export type UseEnvelopeQueryOptions<T, K extends QueryKey = QueryKey> = Omit<
  UseQueryOptions<Envelope<T>, EnvelopeError, Envelope<T>, K>,
  "select"
>;

export function derivePagination(attrs: EnvelopeAttributes): EnvelopePagination {
  return {
    totalRecords: attrs.TotalRecords ?? 0,
    perPage: attrs.PerPage ?? null,
    totalPages: attrs.TotalPages ?? null,
    currentPage: attrs.CurrentPage ?? null,
    isSingle: attrs.IsSingle,
    isMultiple: attrs.IsMultiple,
    isEmpty: attrs.IsEmpty,
  };
}

/**
 * Wrap `useQuery` for endpoints that return a Universal Envelope of `T[]`.
 * The `queryFn` should call `beFetch<T>` (or an equivalent) and return the
 * envelope unmodified so `Attributes` is preserved for pagination consumers.
 */
export function useEnvelopeQuery<T, K extends QueryKey = QueryKey>(
  options: UseEnvelopeQueryOptions<T, K>,
): UseEnvelopeQueryResult<T> {
  const result = useAppQuery<Envelope<T>, EnvelopeError, Envelope<T>, K>(options);
  const envelope = result.data;

  return {
    ...result,
    items: envelope?.Results ?? [],
    pagination: envelope ? derivePagination(envelope.Attributes) : null,
    envelope,
  };
}
