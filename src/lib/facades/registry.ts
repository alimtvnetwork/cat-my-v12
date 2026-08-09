// Plan 86 Step 26-27: shared DomainFacadeRegistry.
//
// Single importable registry the v2 orchestrator (`runSeedV2`) and the
// first-run bootstrap (Step 39) both consume.
//
// Rules:
//   - Only concrete `DomainFacade` singletons live here. Do NOT put
//     memory-only test doubles in this file; tests build their own
//     registry inline.
//   - Order in this file does NOT define write order. Write order lives
//     in `../seed/orchestrator-v2.ts` `SEED_WRITE_ORDER` (frozen SS-09).

import type { DomainFacadeRegistry } from "./domain-facade";
import { categoriesFacade } from "./categories-facade";
import {
  camerasFacade,
  micSettingsFacade,
  swatchesFacade,
  propertyPresetsFacade,
  settingsFacade,
  projectsFacade,
  samplesFacade,
  rulesetsFacade,
  rulesFacade,
  commandsFacade,
  emptyStatesFacade,
  errorScenariosFacade,
} from "./slice-facades";

export const defaultDomainRegistry: DomainFacadeRegistry = {
  categories: categoriesFacade,
  cameras: camerasFacade,
  micSettings: micSettingsFacade,
  swatches: swatchesFacade,
  propertyPresets: propertyPresetsFacade,
  settings: settingsFacade,
  projects: projectsFacade,
  samples: samplesFacade,
  rulesets: rulesetsFacade,
  rules: rulesFacade,
  commands: commandsFacade,
  emptyStates: emptyStatesFacade,
  errorScenarios: errorScenariosFacade,
};
