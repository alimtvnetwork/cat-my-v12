/** @vitest-environment jsdom */
// Plan 90 Step 105 tests: verify uniform envelope reads and error surfacing.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { EnvelopeError, type Envelope } from "@/lib/be-fetch";
import { derivePagination, useEnvelopeQuery } from "@/hooks/use-envelope-query";

function makeEnvelope<T>(results: T[], total = results.length): Envelope<T> {
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
      IsSingle: results.length === 1,
      IsMultiple: results.length > 1,
      IsEmpty: results.length === 0,
      TotalRecords: total,
      PerPage: 25,
      TotalPages: Math.max(1, Math.ceil(total / 25)),
      CurrentPage: 1,
    },
    Results: results,
    Errors: null,
  };
}

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    queryCache: undefined,
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useEnvelopeQuery", () => {
  it("exposes items and pagination from a success envelope", async () => {
    const env = makeEnvelope([{ id: "a" }, { id: "b" }], 42);
    const { result } = renderHook(
      () =>
        useEnvelopeQuery<{ id: string }>({
          queryKey: ["sessions"],
          queryFn: () => Promise.resolve(env),
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.hasError).toBe(false));
    expect(result.current.items).toEqual([{ id: "a" }, { id: "b" }]);
    expect(result.current.pagination).toEqual({
      totalRecords: 42,
      perPage: 25,
      totalPages: 2,
      currentPage: 1,
      isSingle: false,
      isMultiple: true,
      isEmpty: false,
    });
    expect(result.current.envelope).toBe(env);
  });

  it("returns [] and null pagination while pending", () => {
    const { result } = renderHook(
      () =>
        useEnvelopeQuery<{ id: string }>({
          queryKey: ["pending"],
          queryFn: () => new Promise<Envelope<{ id: string }>>(() => {}),
        }),
      { wrapper: wrapper() },
    );
    expect(result.current.items).toEqual([]);
    expect(result.current.pagination).toBeNull();
    expect(result.current.envelope).toBeUndefined();
  });

  it("surfaces EnvelopeError as typed query error (no silent fallback)", async () => {
    const err = new EnvelopeError({
      code: "E_BE_UNAVAILABLE",
      backendMessage: "boom",
      endpoint: "/x",
      method: "GET",
      responseStatus: 0,
      correlationId: "cid-test",
      envelope: null,
    });
    const { result } = renderHook(
      () =>
        useEnvelopeQuery<{ id: string }>({
          queryKey: ["fail"],
          queryFn: () => Promise.reject(err),
        }),
      { wrapper: wrapper() },
    );
    await waitFor(() => expect(result.current.hasError).toBe(true));
    expect(result.current.error).toBe(err);
    expect(result.current.error?.code).toBe("E_BE_UNAVAILABLE");
    expect(result.current.items).toEqual([]);
    expect(result.current.pagination).toBeNull();
  });

  it("derivePagination handles missing optional fields", () => {
    const pag = derivePagination({
      RequestedAt: "t",
      HasAnyErrors: false,
      IsSingle: false,
      IsMultiple: false,
      IsEmpty: true,
    });
    expect(pag).toEqual({
      totalRecords: 0,
      perPage: null,
      totalPages: null,
      currentPage: null,
      isSingle: false,
      isMultiple: false,
      isEmpty: true,
    });
    expect(vi.isMockFunction(derivePagination)).toBe(false);
  });
});