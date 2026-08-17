import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { showGlobalError } from "./lib/errors/notify";

// Plan 71 Step 13: `meta.hasVisibility` opt-out.
// Spec: spec/03-error-manage/02-error-architecture/04-error-modal/06-suppress-global-error.md
declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: { hasVisibility?: boolean };
    mutationMeta: { hasVisibility?: boolean; suppressGlobalError?: boolean };
  }
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          const status = (error as { status?: number })?.status;
          if (status !== undefined && status >= 400 && status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.hasVisibility === false) return;
        showGlobalError(error, {
          endpoint: String(query.queryKey?.[0] ?? "query"),
          source: "QueryCache",
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.meta?.hasVisibility === false) return;
        showGlobalError(error, {
          endpoint: String(mutation.options.mutationKey?.[0] ?? "mutation"),
          source: "MutationCache",
        });
      },
    }),
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 50,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
