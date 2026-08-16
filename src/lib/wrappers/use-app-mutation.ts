import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useErrorStore } from "@/lib/stores/errorStore";

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
  const result = useMutation({
    ...options,
    onError: (err, variables, context) => {
      if (options.meta?.suppressGlobalError !== true) {
        useErrorStore.getState().captureError(err, {
          context: { mutationKey: options.mutationKey },
        });
      }
      (options.onError as any)?.(err, variables, context);
    },
  });

  return {
    ...result,
    isFail: result.isError,
    hasError: !!result.error,
  };
}
