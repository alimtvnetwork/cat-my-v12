/**
 * Client-side in-memory cache of the last successful remote validation
 * result, keyed by image hash + ruleset signature. Purpose: re-opening
 * the Validate Against Image dialog for the same picture and same rule
 * geometry / params should not re-hit the Python worker.
 *
 * The cache is session-scoped (Map on the module) so it survives
 * dialog close/open but not a full page reload. Persisted validation
 * chips continue to live in validation-store's zustand persist layer.
 */
import type { EditorRule } from "@/lib/editor/types";
import type { ValidationResult } from "@/lib/editor/validation-store";

export interface CachedRun {
  results: Record<string, ValidationResult>;
  imageName: string;
  cachedAt: number;
  attempts: number;
  elapsedMs: number;
}

const CACHE = new Map<string, CachedRun>();
const MAX_ENTRIES = 20;

async function sha256Hex(input: string): Promise<string> {
  const subtle = typeof globalThis.crypto !== "undefined" ? globalThis.crypto.subtle : undefined;

  if (!subtle) {
    // Fallback for environments without SubtleCrypto: cheap non-cryptographic
    // digest is fine, the cache is best-effort and never authoritative.
    let h = 5381;
    for (let i = 0; i < input.length; i += 1) h = ((h << 5) + h) ^ input.charCodeAt(i);

    return `fallback:${(h >>> 0).toString(16)}`;
  }

  const encoder = new TextEncoder();
  const buf = await subtle.digest("SHA-256", encoder.encode(input));

  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function ruleSignature(rule: EditorRule): string {
  // Sort keys deterministically so param reordering does not miss the cache.
  const paramKeys = Object.keys(rule.params ?? {}).sort();
  const paramPairs = paramKeys.map((k) => `${k}=${String(rule.params?.[k])}`).join(",");

  return [rule.id, rule.kind, rule.x, rule.y, rule.width, rule.height, paramPairs].join("|");
}

export async function buildCacheKey(
  rulesetId: string,
  imageDataUrl: string,
  rules: readonly EditorRule[],
): Promise<string> {
  const imageHash = await sha256Hex(imageDataUrl);
  const rulesFingerprint = rules
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(ruleSignature)
    .join(";");
  const rulesHash = await sha256Hex(rulesFingerprint);

  return `${rulesetId}:${imageHash.slice(0, 16)}:${rulesHash.slice(0, 16)}`;
}

export function getCachedRun(key: string): CachedRun | null {
  return CACHE.get(key) ?? null;
}

export function setCachedRun(key: string, run: CachedRun): void {
  if (CACHE.size >= MAX_ENTRIES) {
    // LRU-lite: drop the oldest inserted key.
    const oldest = CACHE.keys().next().value;

    if (typeof oldest === "string") CACHE.delete(oldest);
  }

  CACHE.set(key, run);
}

export function clearValidationCache(): void {
  CACHE.clear();
}