import { ClientLogger } from "@/lib/observability/client-logger";
import { DataSourceType } from "@/lib/data-source/store";
// Launcher handoff: `run.ps1` opens the app with `?ds=seed|backend` and an
// optional `&backend=<base url>` so the shell boots in the mode the operator
// asked for. We apply the params once, then strip them from the address bar
// so a manual reload doesn't keep re-forcing the mode.

import { setBackendBaseUrl, setDataSource, type DataSource } from "./store";

const PARAM_MODE = "ds";
const PARAM_BACKEND = "backend";
const REASON = "launcher-url";

let isApplied = false;

function parseMode(raw: string | null): DataSource | null {
  if (raw === DataSourceType.Seed || raw === DataSourceType.Backend) return raw;

  return null;
}

/** Apply `?ds=` / `?backend=` once per page load. Safe to call repeatedly. */
export function applyDataSourceFromUrl(): void {
  if (isApplied || typeof window === "undefined") return;
  isApplied = true;
  try {
    const url = new URL(window.location.href);
    const mode = parseMode(url.searchParams.get(PARAM_MODE));
    const backend = url.searchParams.get(PARAM_BACKEND);

    if (!mode && !backend) return;

    if (backend) setBackendBaseUrl(backend, { reason: REASON });

    if (mode) setDataSource(mode, { reason: REASON });

    url.searchParams.delete(PARAM_MODE);
    url.searchParams.delete(PARAM_BACKEND);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  } catch (error) {
    ClientLogger.warn("[data-source] failed to apply launcher URL params", error);
  }
}

/** Test-only. */
export function __resetUrlBootstrapForTests(): void {
  isApplied = false;
}
