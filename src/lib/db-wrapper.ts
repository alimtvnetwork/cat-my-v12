/**
 * Query Wrapper / API Caller
 *
 * As per Plan 92, this module provides the standard query wrapper interface.
 * Note: Database queries are currently performed in the backend (Python), which uses
 * `safe_execute` in `connections.py`.
 *
 * Frontend TS code makes API calls using `beFetch` from `src/lib/be-fetch.ts`,
 * which natively implements automatic failure logging and explicitly throws `EnvelopeError`.
 *
 * Therefore, `executeApiQuery` here acts as an alias to `beFetch` to fulfill the standard
 * Query Wrapper contract for TypeScript.
 */

import { beFetch, BeFetchOptions, Envelope } from "@/lib/be-fetch";

export type QueryResult<T> =
  | { isSuccess: true; isFail: false; data: T; error: null }
  | { isSuccess: false; isFail: true; data: null; error: Error };

/**
 * Execute an API query and automatically log failures.
 * Returns a QueryResult containing explicit `isSuccess` and `isFail` properties
 * instead of throwing, aligning with the backend Python structure.
 *
 * @param input The request URL or Request object
 * @param init Fetch options
 * @param opts beFetch options
 * @returns A strictly typed QueryResult
 */
export async function executeApiQuery<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts?: BeFetchOptions,
): Promise<QueryResult<T[]>> {
  try {
    const envelope = await beFetch<T>(input, init, opts);

    return { isSuccess: true, isFail: false, data: envelope.Results, error: null };
  } catch (error) {
    return {
      isSuccess: false,
      isFail: true,
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
