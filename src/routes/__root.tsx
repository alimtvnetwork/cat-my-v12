import { QueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";

import appCss from "../styles.css?url";
import { RootProviders } from "../lib/boot/root-providers";
import { RootShellLayout } from "../lib/boot/root-shell-layout";
import { useRootBootOrchestrator } from "./useRootBootOrchestrator";
import { RootErrorBoundary } from "./RootErrorBoundary";
import { ProjectCreationAnalysisTour } from "@/components/guided-simulation/ProjectCreationAnalysisTour";
import {
  ApplyThemeClassResolvedType,
  resolveTheme,
} from "@/components/theme/ThemeController";
import { useUiPrefsStore } from "@/lib/stores/ui-prefs-store";
import { APP_VERSION_INFO } from "@/lib/version-info";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cat Vision, Cat I Vision, Pick a workflow" },
      {
        name: "description",
        content:
          "Configure the line, open a project, run a trial, or batch-test a ruleset with AI. Every screen is one click away.",
      },
      { name: "author", content: "Cat Vision, Cat I Vision" },
      { property: "og:title", content: "Cat Vision, Cat I Vision, Pick a workflow" },
      {
        property: "og:description",
        content:
          "Configure the line, open a project, run a trial, or batch-test a ruleset with AI. Every screen is one click away.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cat Vision, Cat I Vision, Pick a workflow" },
      {
        name: "twitter:description",
        content:
          "Configure the line, open a project, run a trial, or batch-test a ruleset with AI. Every screen is one click away.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8b7124bd-5659-42c8-a731-2d024bbfb18c/id-preview-67cb3264--6f894d1f-b67f-4abb-bd4c-850fa2db5583.ai-memory.app-1784195500308.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8b7124bd-5659-42c8-a731-2d024bbfb18c/id-preview-67cb3264--6f894d1f-b67f-4abb-bd4c-850fa2db5583.ai-memory.app-1784195500308.png",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Ubuntu:wght@400;500;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/cat-logo.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: RootErrorBoundary,
});

function RootShell({ children }: { children: ReactNode }) {
  const theme = useUiPrefsStore((state) => state.theme);
  const resolved = resolveTheme(theme);
  const isLight = resolved === ApplyThemeClassResolvedType.Light;

  return (
    <html
      lang="en"
      className={isLight ? "light" : "dark"}
      data-theme={resolved}
      style={{ colorScheme: resolved }}
    >
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes cat-splash-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              #app-pre-hydration-splash {
                position: fixed;
                inset: 0;
                z-index: 99999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                background-color: #070b14;
                color: #f8fafc;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                user-select: none;
                transition: opacity 280ms cubic-bezier(0.4, 0, 0.2, 1);
              }
              .cat-splash-box {
                display: flex;
                flex-direction: column;
                align-items: center;
                max-width: 420px;
                padding: 32px;
                border-radius: 16px;
                background: linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 15, 30, 0.95) 100%);
                border: 1px solid rgba(255, 255, 255, 0.08);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px -5px rgba(6, 182, 212, 0.15);
                text-align: center;
              }
              .cat-splash-logo-wrap {
                position: relative;
                margin-bottom: 20px;
              }
              .cat-splash-spinner {
                width: 48px;
                height: 48px;
                border: 3px solid rgba(6, 182, 212, 0.15);
                border-top-color: #06b6d4;
                border-right-color: #0ea5e9;
                border-radius: 50%;
                animation: cat-splash-spin 0.85s linear infinite;
              }
              .cat-splash-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-top: 14px;
                padding: 3px 10px;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.05em;
                color: #22d3ee;
                background: rgba(6, 182, 212, 0.1);
                border: 1px solid rgba(6, 182, 212, 0.3);
                border-radius: 9999px;
              }
            `,
          }}
        />
      </head>
      <body>
        <div id="app-pre-hydration-splash">
          <div className="cat-splash-box">
            <div className="cat-splash-logo-wrap">
              <div className="cat-splash-spinner" />
            </div>
            <div style={{ fontSize: "16px", fontWeight: "700", letterSpacing: "0.08em", color: "#ffffff", marginBottom: "4px" }}>
              CAT iVISION
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>
              Autonomous Industrial Inspection System
            </div>
            <div className="cat-splash-badge">
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#06b6d4", display: "inline-block" }} />
              {APP_VERSION_INFO.version}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", marginTop: "16px" }}>
              Initializing Industrial HMI Engine…
            </div>
          </div>
        </div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useRootBootOrchestrator();

  useEffect(() => {
    const splash = document.getElementById("app-pre-hydration-splash");
    if (splash) {
      splash.style.opacity = "0";
      splash.style.pointerEvents = "none";
      const timer = window.setTimeout(() => {
        splash.remove();
      }, 300);

      return () => window.clearTimeout(timer);
    }
  }, []);

  return (
    <RootProviders queryClient={queryClient}>
      <RootShellLayout>
        <div className="flex h-screen min-h-0 w-full flex-col overflow-hidden">
          <Outlet />
        </div>
        <ProjectCreationAnalysisTour />
      </RootShellLayout>
    </RootProviders>
  );
}
