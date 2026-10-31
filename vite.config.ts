// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { readFileSync } from "node:fs";

// Build-time version injection (spec 03 §5.2): the injected value must
// equal version.json at build time. version.json / package.json parity
// is enforced by .agents/scripts/14-version-sync-checker.py — never
// hand-edit a version field outside the release process.
const appVersion = (JSON.parse(readFileSync(new URL("./version.json", import.meta.url), "utf-8")) as { version: string }).version;

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "lucide-react",
        "recharts",
        "react-hook-form",
        "@radix-ui/react-dialog",
        "@radix-ui/react-popover",
        "@radix-ui/react-tooltip",
        "@radix-ui/react-slot",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-select",
        "@radix-ui/react-menubar"
      ],
    },
    server: {
      proxy: {
        "/camera": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true,
        },
        "/score": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true,
        },
        "/images": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true,
        },
        "/rules": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true,
        },
        "/samples": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true,
        },
        "/telemetry": {
          target: "http://127.0.0.1:8787",
          changeOrigin: true,
        },
      },
    },
  },
});
