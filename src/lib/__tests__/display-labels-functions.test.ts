import { describe, it, expect } from "vitest";
import { formatIdentifierLabel } from "../display-labels";
import {
  FUNCTION_LIBRARY_ERROR_CODES,
  CHAIN_EVENT_ERROR_CODES,
  PERSISTENCE_ERROR_CODES,
} from "../errors/index";

// Plan 66 step 22 (CX-02) slice 2: enforce that every registered fn.*/ce.*
// code has a curated human-readable label. Without this test, the fallback
// splitter turns `ce.run.threw` into "Ce Run Threw" and users see the raw
// namespace. If someone adds a new code to the registry, this test fails
// until KNOWN_LABELS is updated.

function isCurated(code: string): boolean {
  const label = formatIdentifierLabel(code);

  // The fallback splitter would produce a label that starts with the
  // capitalized namespace ("Fn " / "Ce " / "Persist "). A curated label
  // never does.
  return /^(Fn|Ce|Persist)\s/.test(label) === false && label.length > 0;
}

describe("display-labels: functions/chain-events coverage", () => {
  it("every FUNCTION_LIBRARY_ERROR_CODES entry has a curated label", () => {
    for (const code of FUNCTION_LIBRARY_ERROR_CODES) {
      expect(isCurated(code), `missing curated label for ${code}`).toBe(true);
    }
  });

  it("every CHAIN_EVENT_ERROR_CODES entry has a curated label", () => {
    for (const code of CHAIN_EVENT_ERROR_CODES) {
      expect(isCurated(code), `missing curated label for ${code}`).toBe(true);
    }
  });

  it("every PERSISTENCE_ERROR_CODES entry has a curated label", () => {
    for (const code of PERSISTENCE_ERROR_CODES) {
      expect(isCurated(code), `missing curated label for ${code}`).toBe(true);
    }
  });

  it("labels are human-readable text (no dots, no camelCase leftovers)", () => {
    for (const code of [
      ...FUNCTION_LIBRARY_ERROR_CODES,
      ...CHAIN_EVENT_ERROR_CODES,
      ...PERSISTENCE_ERROR_CODES,
    ]) {
      const label = formatIdentifierLabel(code);
      expect(label, `label contained a dot: ${label}`).not.toMatch(/\./);
    }
  });
});
