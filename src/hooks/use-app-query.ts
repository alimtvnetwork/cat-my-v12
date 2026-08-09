import { useQuery, type UseQueryOptions, type UseQueryResult } from "@tanstack/react-query";
import { reportError } from "@/lib/errors/error-bus";
import { ErrorSourceType } from "@/lib/errors/error-record";
import { useEffect } from "react";

export type AppQueryResult<TData = unknown, TError = Error> = UseQueryResult<TData, TError> & {
  isFail: boolean;
  hasError: boolean;
};

export function useAppQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends import("@tanstack/react-query").QueryKey =
    import("@tanstack/react-query").QueryKey,
>(options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>): AppQueryResult<TData, TError> {
  const result = useQuery(options);

  useEffect(() => {
    const hasError = !!result.error;
    if (hasError && options.meta?.hasVisibility !== false) {
      reportError(ErrorSourceType.ServerFn, result.error, {
        queryKey: options.queryKey,
      });
    }
  }, [result.error, options.queryKey, options.meta?.hasVisibility]);

  return {
    ...result,
    isFail: result.isError,
    hasError: !!result.error,
  };
}
