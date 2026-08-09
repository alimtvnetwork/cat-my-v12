import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  FUNCTION_LIBRARY_ERROR_CODES,
  CHAIN_EVENT_ERROR_CODES,
  PERSISTENCE_ERROR_CODES,
  isFunctionLibraryErrorCode,
  isChainEventErrorCode,
  isPersistenceErrorCode,
  isFunctionsErrorCode,
  isUiErrorCode,
} from "../registry";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");

function extractCodes(pathFromRoot: string, prefix: string): Set<string> {
  const src = readFileSync(resolve(root, pathFromRoot), "utf8");
  const re = new RegExp(`"(${prefix}\\.[a-zA-Z0-9_.]+)"`, "g");
  const found = new Set<string>();
  for (const m of src.matchAll(re)) found.add(m[1]);

  return found;
}

describe("errors/registry", () => {
  it("guards are mutually exclusive and reject unknown values", () => {
    expect(isFunctionLibraryErrorCode("fn.id.empty")).toBe(true);
    expect(isChainEventErrorCode("ce.id.empty")).toBe(true);
    expect(isFunctionLibraryErrorCode("ce.id.empty")).toBe(false);
    expect(isChainEventErrorCode("fn.id.empty")).toBe(false);
    expect(isFunctionsErrorCode("nope")).toBe(false);
    expect(isUiErrorCode("fn.id.empty")).toBe(false);
  });

  it("registry has no duplicates", () => {
    expect(new Set(FUNCTION_LIBRARY_ERROR_CODES).size).toBe(FUNCTION_LIBRARY_ERROR_CODES.length);
    expect(new Set(CHAIN_EVENT_ERROR_CODES).size).toBe(CHAIN_EVENT_ERROR_CODES.length);
    expect(new Set(PERSISTENCE_ERROR_CODES).size).toBe(PERSISTENCE_ERROR_CODES.length);
  });

  it("every fn.* code emitted by library.ts is in the registry", () => {
    const emitted = extractCodes("src/lib/functions/library.ts", "fn");
    for (const code of emitted) {
      expect(isFunctionLibraryErrorCode(code)).toBe(true);
    }
  });

  it("every ce.* code emitted by chain-events*.ts is in the registry", () => {
    const emitted = new Set<string>([
      ...extractCodes("src/lib/functions/chain-events.ts", "ce"),
      ...extractCodes("src/lib/functions/chain-events-runner.ts", "ce"),
    ]);
    for (const code of emitted) {
      expect(isChainEventErrorCode(code)).toBe(true);
    }
  });

  it("every persist.* code emitted by persistence.ts is in the registry", () => {
    const emitted = extractCodes("src/lib/functions/persistence.ts", "persist");
    for (const code of emitted) {
      expect(isPersistenceErrorCode(code)).toBe(true);
    }
  });
});
