// Plan 66 step 20 (FS-01) slice 1: JS function library core.
//
// A "function" here is a user-authored JS snippet that runs between rules
// as a chain event (step 21 / FS-02). This module owns the pure store
// shape, validation, CRUD, and import/export. Slice 2 wires the
// /setup/functions route, Monaco editor, and the persistence adapter.

export interface FunctionEntry {
  /** Stable identifier; short slug or ULID assigned by the caller. */
  id: string;
  /** Human-readable name. Non-empty, trimmed. */
  name: string;
  /** Optional one-line description. */
  description: string;
  /** JS source. Never executed here; slice 2 sandbox handles that. */
  source: string;
  /** Millisecond epoch. Filled by the caller. */
  createdAt: number;
  updatedAt: number;
}

export interface FunctionLibrary {
  version: 1;
  entries: FunctionEntry[];
}

export const EMPTY_LIBRARY: Readonly<FunctionLibrary> = Object.freeze({
  version: 1,
  entries: [],
});

export interface FunctionValidationError {
  code:
    | "fn.id.empty"
    | "fn.name.empty"
    | "fn.source.empty"
    | "fn.source.tooLarge"
    | "fn.timestamps.invalid";
  message: string;
}

export const FUNCTION_SOURCE_MAX_BYTES = 64 * 1024;

export function validateFunctionEntry(entry: FunctionEntry): FunctionValidationError[] {
  const errs: FunctionValidationError[] = [];

  if (!entry.id || entry.id.trim().length === 0) {
    errs.push({ code: "fn.id.empty", message: "id must be a non-empty string." });
  }

  if (!entry.name || entry.name.trim().length === 0) {
    errs.push({ code: "fn.name.empty", message: "name must be a non-empty string." });
  }

  if (!entry.source || entry.source.trim().length === 0) {
    errs.push({ code: "fn.source.empty", message: "source must be a non-empty string." });
  } else if (entry.source.length > FUNCTION_SOURCE_MAX_BYTES) {
    errs.push({
      code: "fn.source.tooLarge",
      message: `source exceeds ${FUNCTION_SOURCE_MAX_BYTES} bytes.`,
    });
  }

  if (
    Number.isFinite(entry.createdAt) === false ||
    Number.isFinite(entry.updatedAt) === false ||
    entry.createdAt <= 0 ||
    entry.updatedAt < entry.createdAt
  ) {
    errs.push({
      code: "fn.timestamps.invalid",
      message: "createdAt must be > 0 and updatedAt >= createdAt.",
    });
  }

  return errs;
}

// ---------------------------------------------------------------------------
// Pure CRUD. Every op returns a NEW library; callers persist via slice 2.
// ---------------------------------------------------------------------------

export interface CrudResult {
  library: FunctionLibrary;
  errors: FunctionValidationError[];
}

export function upsertFunction(library: FunctionLibrary, entry: FunctionEntry): CrudResult {
  const errors = validateFunctionEntry(entry);

  if (errors.length > 0) return { library, errors };

  const existing = library.entries.findIndex((e) => e.id === entry.id);
  const nextEntries = library.entries.slice();

  if (existing === -1) {
    nextEntries.push(entry);
  } else {
    nextEntries[existing] = { ...entry, createdAt: nextEntries[existing].createdAt };
  }

  return { library: { ...library, entries: nextEntries }, errors: [] };
}

export function deleteFunction(library: FunctionLibrary, id: string): FunctionLibrary {
  return {
    ...library,
    entries: library.entries.filter((e) => e.id !== id),
  };
}

export function getFunction(library: FunctionLibrary, id: string): FunctionEntry | null {
  return library.entries.find((e) => e.id === id) ?? null;
}

// ---------------------------------------------------------------------------
// Import / export. JSON is the canonical wire format.
// ---------------------------------------------------------------------------

export function exportLibraryJson(library: FunctionLibrary): string {
  return JSON.stringify(library, null, 2);
}

export interface ImportResult {
  library: FunctionLibrary;
  errors: FunctionValidationError[];
  /** Reason the payload was rejected outright (parse failure, schema mismatch). */
  parseError?: string;
}

/**
 * Parse and validate a serialized library. Rejects payloads with the wrong
 * shape (surfaces `parseError`); otherwise returns the library plus a
 * flat list of per-entry validation errors. Never throws.
 */
export function importLibraryJson(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    return {
      library: { ...EMPTY_LIBRARY },
      errors: [],
      parseError: err instanceof Error ? err.message : String(err),
    };
  }

  if (!raw || typeof raw !== "object") {
    return { library: { ...EMPTY_LIBRARY }, errors: [], parseError: "payload is not an object" };
  }

  const obj = raw as { version?: unknown; entries?: unknown };

  if (obj.version !== 1) {
    return {
      library: { ...EMPTY_LIBRARY },
      errors: [],
      parseError: `unsupported version: ${String(obj.version)}`,
    };
  }

  if (Array.isArray(obj.entries) === false) {
    return { library: { ...EMPTY_LIBRARY }, errors: [], parseError: "entries must be an array" };
  }

  const errors: FunctionValidationError[] = [];
  const kept: FunctionEntry[] = [];
  for (const raw of obj.entries) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Partial<FunctionEntry>;
    const entry: FunctionEntry = {
      id: typeof e.id === "string" ? e.id : "",
      name: typeof e.name === "string" ? e.name : "",
      description: typeof e.description === "string" ? e.description : "",
      source: typeof e.source === "string" ? e.source : "",
      createdAt: typeof e.createdAt === "number" ? e.createdAt : 0,
      updatedAt: typeof e.updatedAt === "number" ? e.updatedAt : 0,
    };
    const entryErrs = validateFunctionEntry(entry);

    if (entryErrs.length > 0) {
      errors.push(...entryErrs);
      continue;
    }

    kept.push(entry);
  }

  return {
    library: { version: 1, entries: kept },
    errors,
  };
}