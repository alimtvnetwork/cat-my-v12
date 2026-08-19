import React, { createContext, useContext, useMemo } from "react";
import { BackendClient } from "./types";
import { HttpBackendClient } from "./httpClient";
import { SeedBackendClient } from "./seedClient";
import { useBackendMode } from "./mode";

const BackendContext = createContext<BackendClient | null>(null);

export const BackendProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mode = useBackendMode((s) => s.mode);

  const client = useMemo<BackendClient>(() => {
    if (mode === "backend") {
      return new HttpBackendClient();
    }
    return new SeedBackendClient();
  }, [mode]);

  return <BackendContext.Provider value={client}>{children}</BackendContext.Provider>;
};

export function useBackend(): BackendClient {
  const context = useContext(BackendContext);
  if (!context) {
    throw new Error("useBackend must be used within a BackendProvider");
  }
  return context;
}
