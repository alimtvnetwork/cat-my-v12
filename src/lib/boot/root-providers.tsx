import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeController } from "@/components/theme/ThemeController";
import { BackendProvider } from "@/lib/backend/provider";
import { SeedProvider, SeedRecoveryToast } from "@/lib/seed";
import { EnvelopeErrorBoundary } from "@/components/errors/EnvelopeErrorBoundary";
import { AutoSeedFromFacade, ApplySeedProfileMount } from "./seed-orchestration";

export function RootProviders({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeController />
      <BackendProvider>
        <SeedProvider>
          <AutoSeedFromFacade />
          <ApplySeedProfileMount />
          <SeedRecoveryToast />
          <EnvelopeErrorBoundary>
            {children}
          </EnvelopeErrorBoundary>
        </SeedProvider>
      </BackendProvider>
    </QueryClientProvider>
  );
}
