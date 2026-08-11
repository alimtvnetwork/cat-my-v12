// Plan 78 slice 3 (I-SU-05): JSON export/import for the CameraSetting
// library. Every entry is re-validated on import through the same
// `validateCameraSetting` used by the store, so invalid records never enter
// the library silently. Failures are returned, never thrown.
import {
  validateCameraSetting,
  type CameraLibrary,
  type CameraSetting,
  type CameraValidationError,
} from "./model";

export interface CameraLibraryExport {
  kind: "ca.camera.library";
  version: 1;
  exportedAt: string;
  entries: CameraSetting[];
}

export function exportCameraLibraryJson(lib: CameraLibrary): string {
  const envelope: CameraLibraryExport = {
    kind: "ca.camera.library",
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: lib.entries,
  };

  return JSON.stringify(envelope, null, 2);
}

export type ImportResult =
  { ok: true; isFail: false; entries: CameraSetting[] } | { ok: false; isFail: true; errors: CameraValidationError[] };

export function importCameraLibraryJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {
      ok: false, isFail: true,
      errors: [{ path: "$", message: `Invalid JSON: ${(err as Error).message}` }],
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, isFail: true, errors: [{ path: "$", message: "Root must be an object" }] };
  }

  const obj = parsed as { kind?: unknown; version?: unknown; entries?: unknown };

  if (obj.kind !== "ca.camera.library") {
    return { ok: false, isFail: true, errors: [{ path: "kind", message: 'Expected "ca.camera.library"' }] };
  }

  if (obj.version !== 1) {
    return { ok: false, isFail: true, errors: [{ path: "version", message: "Unsupported version, expected 1" }] };
  }

  if (Array.isArray(obj.entries) === false) {
    return { ok: false, isFail: true, errors: [{ path: "entries", message: "Must be an array" }] };
  }

  const errors: CameraValidationError[] = [];
  const entries: CameraSetting[] = [];
  obj.entries.forEach((raw, idx) => {
    const r = validateCameraSetting(raw);

    if (r.ok) entries.push(r.value);
    else
      for (const e of r.errors)
        errors.push({ path: `entries[${idx}].${e.path}`, message: e.message });
  });

  if (errors.length > 0) return { ok: false, isFail: true, errors };

  return { ok: true, isFail: false, entries };
}