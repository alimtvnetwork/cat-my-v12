import { useErrorStore } from "@/lib/errors/errorStore";

/**
 * Wraps any promise-based query (fetch, axios, RPC) to automatically catch
 * and log errors using the guidelines in `spec/03-error-manage`.
 * Connects to `useErrorStore` for unified error handling.
 */
export async function QueryWrapper<T>(
  queryFn: () => Promise<T>,
  context: {
    endpoint?: string;
    method?: string;
    correlationId?: string;
    suppressCapture?: boolean;
    errorCode?: string;
  } = {},
): Promise<T | null> {
  try {
    const result = await queryFn();

    return result;
  } catch (error) {
    if (!context.suppressCapture) {
      try {
        useErrorStore.getState().captureError(
          error,
          {
            endpoint: context.endpoint || "unknown",
            method: context.method || "UNKNOWN",
            correlationId: context.correlationId,
            source: "QueryWrapper",
          },
          context.errorCode || "E_QUERY_FAILED",
        );
      } catch (storeError) {
        console.error("[QueryWrapper] Failed to push to errorStore", storeError);
      }
    }
    console.error("[QueryWrapper] Query failed:", error, context);

    throw error;
  }
}