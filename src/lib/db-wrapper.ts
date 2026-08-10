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

/**
 * Execute an API query and automatically log failures.
 * 
 * @param input The request URL or Request object
 * @param init Fetch options
 * @param opts beFetch options
 * @returns The parsed Envelope
 */
export async function executeApiQuery<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts?: BeFetchOptions,
): Promise<Envelope<T>> {
  return beFetch<T>(input, init, opts);
}
