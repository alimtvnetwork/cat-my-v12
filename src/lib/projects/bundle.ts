// Project bundle: JSON envelope for exporting a project (with its rule sets
// and category list) so users can migrate configurations between projects
// or Lovable installs. Consumed by the store's `importProjectBundle`.
// SU-06 (plan 66, step 8): parity YAML serialization so operators can hand-
// edit and diff bundles. Both formats round-trip through the same schema.
import type { Project, RuleSet, ProjectStoreState } from "./store";
import type { CameraSetting } from "@/lib/camera/model";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import JSZip from "jszip";

export const BUNDLE_KIND = "ca.project-bundle" as const;
export const BUNDLE_VERSION = 2 as const;

export interface ProjectBundle {
  kind: typeof BUNDLE_KIND;
  version: 1 | 2;
  exportedAt: string;
  project: Project;
  rulesets: RuleSet[];
  /**
   * Plan 78 slice 5 (I-SU-05 bundle parity): embed the CameraSetting the
   * project references so importing on another machine can re-hydrate the
   * binding without a shared camera library. Optional for v1 back-compat.
   */
  cameraSetting?: CameraSetting;
}

/** Build a serialisable envelope for `projectId`. Returns null if unknown. */
export function exportProjectBundle(
  state: Pick<ProjectStoreState, "projects" | "rulesets">,
  projectId: string,
  opts?: { resolveCameraSetting?: (id: string) => CameraSetting | null | undefined },
): ProjectBundle | null {
  const project = state.projects[projectId];

  if (!project) return null;
  const rulesets = project.rulesetIds
    .map((id) => state.rulesets[id])
    .filter((rs): rs is RuleSet => Boolean(rs));
  const cameraSetting =
    project.cameraSettingId && opts?.resolveCameraSetting
      ? (opts.resolveCameraSetting(project.cameraSettingId) ?? undefined)
      : undefined;

  return {
    kind: BUNDLE_KIND,
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    project,
    rulesets,
    ...(cameraSetting ? { cameraSetting } : {}),
  };
}

export interface ParseResult {
  ok: boolean;
  bundle?: ProjectBundle;
  error?: string;
}

/** Parse and shape-check a JSON string produced by `exportProjectBundle`. */
export function parseProjectBundle(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {

    return { ok: false, error: `Not valid JSON: ${(err as Error).message}` };
  }

  if (!raw || typeof raw !== "object") return { ok: false, error: "Bundle must be an object" };
  const b = raw as Partial<ProjectBundle>;

  if (b.kind !== BUNDLE_KIND) return { ok: false, error: `Unexpected kind: ${String(b.kind)}` };

  if (b.version !== 1 && b.version !== 2) {

    return { ok: false, error: `Unsupported bundle version: ${String(b.version)}` };
  }

  if (!b.project || typeof b.project !== "object") return { ok: false, error: "Missing project" };

  if (Array.isArray(b.rulesets) === false) return { ok: false, error: "Missing rulesets array" };
  const project = b.project as Project;

  if (typeof project.name !== "string" || project.name.trim() === "") {

    return { ok: false, error: "Project name required" };
  }

  for (const rs of b.rulesets as RuleSet[]) {
    if (!rs || typeof rs.name !== "string" || Array.isArray(rs.rules) === false) {

      return { ok: false, error: "Ruleset entry malformed" };
    }
  }

  return { ok: true, bundle: b as ProjectBundle };
}

/** Suggest a filename slug for downloads. */
export function bundleFilename(projectName: string): string {
  const slug =
    projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "project";
  const date = new Date().toISOString().slice(0, 10);

  return `${slug}-bundle-${date}.json`;
}

/** Format-aware filename. `format` is "json" (default) or "yaml". */
export function bundleFilenameFor(
  projectName: string,
  format: BundleFormat = BundleFormatType.Json,
): string {
  const base = bundleFilename(projectName);

  if (format === "yaml") return base.replace(/\.json$/, ".yaml");

  return base;
}

export enum BundleFormatType {
  Json = "json",
  Yaml = "yaml",
}
export type BundleFormat = BundleFormatType;

/** Serialize a bundle in the requested format. */
export function serializeProjectBundle(
  bundle: ProjectBundle,
  format: BundleFormat = BundleFormatType.Json,
): string {
  if (format === "yaml") return stringifyYaml(bundle);

  return JSON.stringify(bundle, null, 2);
}

/**
 * Format-tolerant parser: detects YAML vs JSON from the input shape and
 * runs the same shape check as `parseProjectBundle`. Accepts either
 * `application/json` text or a YAML document.
 */
export function parseProjectBundleAuto(text: string): ParseResult {
  const trimmed = text.trim();

  if (!trimmed) return { ok: false, error: "Empty bundle" };
  // Route JSON directly for the fast path and to keep JSON error messages.
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {

    return parseProjectBundle(text);
  }

  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (err) {

    return { ok: false, error: `Not valid YAML: ${(err as Error).message}` };
  }

  // Reuse the shape check by re-stringifying to JSON.
  return parseProjectBundle(JSON.stringify(raw));
}

/** Sniff format from filename extension or MIME type. */
export function detectBundleFormat(fileName: string, mimeType?: string): BundleFormat {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".yaml") || lower.endsWith(".yml")) return BundleFormatType.Yaml;

  if (mimeType && (mimeType.includes(BundleFormatType.Yaml) || mimeType.includes("yml")))

    return BundleFormatType.Yaml;

  return BundleFormatType.Json;
}

// SU-07 (plan 66, step 9, Q2 option c): SQLite-zip placeholder. There is no
// SQLite runtime in the web build yet (sql.js would pull a 1MB+ WASM into
// the client bundle just for one export path), so we emit a zip that
// contains the JSON bundle plus a README explaining the placeholder. The
// filename is `.sqlite.zip` so downstream tools can already register the
// association; the desktop worker will later replace the payload with a
// real SQLite database without changing the container or the extension.
export const SQLITE_ZIP_PLACEHOLDER_WARNING =
  "This .sqlite.zip is a placeholder: it contains the JSON bundle inside a zip, " +
  "not a real SQLite database. The desktop worker will replace the payload with " +
  "an actual database file without changing the filename.";

export async function buildSqliteZipPlaceholder(bundle: ProjectBundle): Promise<Blob> {
  const zip = new JSZip();
  zip.file("bundle.json", JSON.stringify(bundle, null, 2));
  zip.file(
    "README.txt",
    [
      "SQLite zip placeholder",
      "",
      SQLITE_ZIP_PLACEHOLDER_WARNING,
      "",
      `Exported at: ${bundle.exportedAt}`,
      `Project: ${bundle.project.name}`,
      `Rulesets: ${bundle.rulesets.length}`,
    ].join("\n"),
  );

  return zip.generateAsync({ type: "blob", mimeType: "application/zip" });
}

export function sqliteZipFilename(projectName: string): string {

  return bundleFilenameFor(projectName, BundleFormatType.Json).replace(/\.json$/, ".sqlite.zip");
}
