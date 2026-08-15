// Data-source runtime store. Chooses between "seed" (bundled JSON,
// writes short-circuited) and "backend" (live remote reads + real
// mutating HTTP calls). Persisted per-browser in localStorage.
//
// Observability: every set is logged (spec/03-error-manage §3).

import { useSyncExternalStore } from "react";

export enum DataSourceType {
  Seed = "seed",
  Backend = "backend",
}
export type DataSource = DataSourceType;

const STORAGE_KEY = "ca.data-source";
const BASE_URL_STORAGE_KEY = "ca.data-source.baseUrl";
const PERSIST_RULES_STORAGE_KEY = "ca.data-source.persistRules";
const KNOWN: readonly DataSource[] = [DataSourceType.Seed, DataSourceType.Backend];
const listeners = new Set<() => void>();
const baseUrlListeners = new Set<() => void>();
const persistRulesListeners = new Set<() => void>();

/** Default backend base URL. Empty string means same-origin. */
export const DEFAULT_BACKEND_BASE_URL = "";

function normalizeBaseUrl(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim().replace(/\/+$/, "");

  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed) === false && trimmed.startsWith("/") === false) return "";

  return trimmed;
}

function readInitial(): DataSource {
  if (typeof window === "undefined") return DataSourceType.Seed;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (raw && (KNOWN as readonly string[]).includes(raw)) {
      return raw as DataSource;
    }
  } catch {
    // localStorage disabled
  }

  return DataSourceType.Seed;
}

function readInitialBaseUrl(): string {
  if (typeof window === "undefined") return DEFAULT_BACKEND_BASE_URL;
  try {
    const raw = window.localStorage.getItem(BASE_URL_STORAGE_KEY);

    return normalizeBaseUrl(raw) || DEFAULT_BACKEND_BASE_URL;
  } catch {
    return DEFAULT_BACKEND_BASE_URL;
  }
}

function readInitialPersistRules(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PERSIST_RULES_STORAGE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    // ignore
  }
  return null;
}

let current: DataSource = readInitial();
let currentBaseUrl: string = readInitialBaseUrl();
let currentPersistRules: boolean | null = readInitialPersistRules();
let isWiredStorage = false;

function ensureStorageBridge(): void {
  if (isWiredStorage || typeof window === "undefined") return;
  isWiredStorage = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    const next = event.newValue;

    if (next && (KNOWN as readonly string[]).includes(next) && next !== current) {
      current = next as DataSource;
      emit();
    }
  });
}

function emit(): void {
  for (const l of listeners) l();
}

function emitBaseUrl(): void {
  for (const l of baseUrlListeners) l();
}

function emitPersistRules(): void {
  for (const l of persistRulesListeners) l();
}

export function getDataSource(): DataSource {
  return current;
}

export interface SetDataSourceOptions {
  reason?: string;
}

export function setDataSource(next: DataSource, opts: SetDataSourceOptions = {}): void {
  if (next === current) return;
  const prev = current;
  current = next;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  } catch {
    // ignore
  }

  console.info("[data-source] changed", { prev, next, reason: opts.reason ?? "user" });
  emit();
}

function subscribe(listener: () => void): () => void {
  ensureStorageBridge();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useDataSource(): DataSource {
  return useSyncExternalStore(subscribe, getDataSource, () => DataSourceType.Seed);
}

export function getBackendBaseUrl(): string {
  return currentBaseUrl;
}

/**
 * Persist a backend base URL. Empty string clears it (same-origin).
 * Returns the normalized value actually stored.
 */
export function setBackendBaseUrl(next: string, opts: { reason?: string } = {}): string {
  const normalized = normalizeBaseUrl(next);

  if (normalized === currentBaseUrl) return currentBaseUrl;
  const prev = currentBaseUrl;
  currentBaseUrl = normalized;
  try {
    if (typeof window !== "undefined") {
      if (normalized) window.localStorage.setItem(BASE_URL_STORAGE_KEY, normalized);
      else window.localStorage.removeItem(BASE_URL_STORAGE_KEY);
    }
  } catch {
    // ignore
  }

  console.info("[data-source] baseUrl changed", {
    prev,
    next: normalized,
    reason: opts.reason ?? "user",
  });
  emitBaseUrl();

  return normalized;
}

function subscribeBaseUrl(listener: () => void): () => void {
  baseUrlListeners.add(listener);

  return () => {
    baseUrlListeners.delete(listener);
  };
}

export function useBackendBaseUrl(): string {
  return useSyncExternalStore(subscribeBaseUrl, getBackendBaseUrl, () => DEFAULT_BACKEND_BASE_URL);
}

/** Join a request path with the persisted base URL. */
export function resolveBackendUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = currentBaseUrl;

  if (!base) return path;

  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function getPersistRulesServerSide(): boolean {
  if (currentPersistRules !== null) return currentPersistRules;
  return current === DataSourceType.Backend;
}

export function setPersistRulesServerSide(next: boolean, opts: { reason?: string } = {}): void {
  if (next === currentPersistRules) return;
  const prev = currentPersistRules;
  currentPersistRules = next;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PERSIST_RULES_STORAGE_KEY, next ? "true" : "false");
    }
  } catch {
    // ignore
  }

  console.info("[data-source] persistRules changed", {
    prev,
    next,
    reason: opts.reason ?? "user",
  });
  emitPersistRules();
}

function subscribePersistRules(listener: () => void): () => void {
  persistRulesListeners.add(listener);

  return () => {
    persistRulesListeners.delete(listener);
  };
}

export function usePersistRulesServerSide(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const u1 = subscribePersistRules(listener);
      const u2 = subscribe(listener);
      return () => {
        u1();
        u2();
      };
    },
    getPersistRulesServerSide,
    () => false,
  );
}

/** Test-only. */
export function __resetDataSourceForTests(): void {
  current = DataSourceType.Seed;
  currentBaseUrl = DEFAULT_BACKEND_BASE_URL;
  currentPersistRules = null;
  listeners.clear();
  baseUrlListeners.clear();
  persistRulesListeners.clear();
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(BASE_URL_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export const DATA_SOURCE_STORAGE_KEY = STORAGE_KEY;
export const BACKEND_BASE_URL_STORAGE_KEY = BASE_URL_STORAGE_KEY;
export const PERSIST_RULES_STORAGE_KEY_EXPORT = PERSIST_RULES_STORAGE_KEY;
