// React binding for the palette facade. Uses useSyncExternalStore so
// components re-render whenever the facade notifies. The initial read
// returns default state; hydration kicks in on subscribe.

import { useCallback, useSyncExternalStore } from "react";
import { makePaletteFacade, type PaletteState } from "./facade";

export function usePaletteState(ruleId: string): PaletteState {
  const facade = makePaletteFacade();
  const subscribe = useCallback((listener: () => void) => facade.subscribe(listener), [facade]);
  const getSnapshot = useCallback(() => facade.get(ruleId), [facade, ruleId]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function usePaletteFacade() {
  return makePaletteFacade();
}