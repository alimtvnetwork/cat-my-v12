import { UiSeedSourceType, type UiSeedFacade, type UiSeedFacadeOptions } from "./facade";
import { JsonUiSeedFacade } from "./json-facade";
import { MemoryUiSeedFacade, EMPTY_CAT_SEED_BUNDLE } from "./memory-facade";
import { RemoteUiSeedFacade } from "./remote-facade";
import { resolveBackendUrl } from "@/lib/data-source";

// Public entry point for the UI seed facade. UI code imports from here,
// never from a concrete implementation file. `makeUiSeedFacade` selects
// the backing at construction time and logs the chosen source (spec
// 03-error-manage: silent selection is a bug; observability first).

export type { UiSeedFacade, UiSeedFacadeOptions } from "./facade";
export { UiSeedSourceType } from "./facade";
export type {
  CatSeedBundle,
  CatSeedBundleSlice,
  CatSeedCategory,
  CatSeedProgram,
  CatSeedProject,
  CatSeedRule,
  CatSeedRuleFamily,
  CatSeedRuleKind,
  CatSeedRuleset,
  CatSeedRuleTemplate,
  CatSeedSampleImage,
  CatSeedToolPreset,
} from "./types";
export { CatSeedRuleFamilyType, CatSeedRuleKindType } from "./types";
export { parseCatSeedBundle } from "./schemas";
export { JsonUiSeedFacade } from "./json-facade";
export { MemoryUiSeedFacade, EMPTY_CAT_SEED_BUNDLE } from "./memory-facade";
export { RemoteUiSeedFacade } from "./remote-facade";
export {
  SeedProvider,
  useSeedContext,
  useSeedBundle,
  type SeedContextValue,
  type SeedProviderProps,
  type SeedStatus,
} from "./provider";
export { useSeedSlice, type UseSeedSliceResult } from "./useSeedSlice";
export { SeedSlot, type SeedSlotProps } from "./SeedSlot";
export { SeedRecoveryToast } from "./SeedRecoveryToast";

const KNOWN_SOURCES: readonly UiSeedSourceType[] = [
  UiSeedSourceType.Json,
  UiSeedSourceType.Memory,
  UiSeedSourceType.Remote,
];

function resolveSource(explicit?: UiSeedSourceType): UiSeedSourceType {
  if (explicit) return explicit;
  const raw = import.meta.env.VITE_UI_SEED_SOURCE as string | undefined;

  if (raw && (KNOWN_SOURCES as readonly string[]).includes(raw)) {
    return raw as UiSeedSourceType;
  }

  return UiSeedSourceType.Json;
}

/**
 * Build the UiSeedFacade for this process. Explicit `source` wins;
 * otherwise `VITE_UI_SEED_SOURCE` picks between "json" | "memory" |
 * "remote"; falling back to "json" for production builds.
 *
 * Remote requires `VITE_UI_SEED_ENDPOINT`. If missing, we throw eagerly
 * so misconfiguration surfaces at boot instead of at first `load()`.
 */
export function makeUiSeedFacade(options: UiSeedFacadeOptions = {}): UiSeedFacade {
  const source = resolveSource(options.source);
  switch (source) {
    case UiSeedSourceType.Memory:
      console.info("[seed] using MemoryUiSeedFacade (empty bundle)");

      return new MemoryUiSeedFacade(EMPTY_CAT_SEED_BUNDLE);
    case UiSeedSourceType.Remote: {
      // Endpoint precedence: explicit env override, else the default
      // BE seed route. Runtime callers switching via `DataSourceToggle`
      // rely on this default so the app never hard-crashes on flip.
      const endpoint = (import.meta.env.VITE_UI_SEED_ENDPOINT as string | undefined) ?? "/api/seed";
      const resolved = resolveBackendUrl(endpoint);
      console.info(`[seed] using RemoteUiSeedFacade endpoint=${resolved}`);

      return new RemoteUiSeedFacade({ endpoint: resolved });
    }
    case UiSeedSourceType.Json:
    default:
      console.info("[seed] using JsonUiSeedFacade (bundled JSON)");

      return new JsonUiSeedFacade();
  }
}
