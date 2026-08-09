import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    // Heavy route modules (e.g. src/routes/index.tsx) transitively load
    // facades, seed data, and Zustand stores. Under full-suite concurrency
    // the first dynamic import can exceed Vitest's 5s default even though
    // the test logic is correct. Raise the ceiling once, globally.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
