import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { reportError } from "@/lib/errors/error-bus";
import { ErrorSourceType } from "@/lib/errors/error-record";
import { useEffect } from "react";

export type AppMutationResult<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
> = UseMutationResult<TData, TError, TVariables, TContext> & {
  isFail: boolean;
  hasError: boolean;
};

export function useAppMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
): AppMutationResult<TData, TError, TVariables, TContext> {
  const result = useMutation(options);

  useEffect(() => {
    const hasError = !!result.error;
    if (hasError && options.meta?.hasVisibility !== false) {
      reportError(ErrorSourceType.ServerFn, result.error, {
        mutationKey: options.mutationKey,
      });
    }
  }, [result.error, options.mutationKey, options.meta?.hasVisibility]);

  return {
    ...result,
    isFail: result.isError,
    hasError: !!result.error,
  };
}
