import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Plan 64 step 86: Export Project JSON.
 *
 * Root cause: Section C shipped the persistence layer (projects, rulesets,
 * runs) but no export path, so projects could not be moved between accounts
 * or bundled for the desktop shell (ADR AI-02). Steps 87 (YAML) and 88
 * (SQLite-Zip) build on the same envelope; this file owns the JSON shape.
 *
 * The envelope is intentionally client-side: it reads the local Zustand
 * project store to avoid needing a new server round-trip for what is a
 * pure serialisation. When the store swaps to a live query it will still
 * feed the same envelope shape.
 */
import type { Project, RuleSet } from "@/lib/projects/store";
import YAML from "yaml";
import JSZip from "jszip";

export const EXPORT_ENVELOPE_VERSION = 1 as const;
export const EXPORT_KIND_PROJECT = "control-automation.project" as const;

export interface ProjectExportEnvelope {
  envelope: typeof EXPORT_KIND_PROJECT;
  version: typeof EXPORT_ENVELOPE_VERSION;
  exportedAt: string;
  project: Project;
  rulesets: RuleSet[];
}

export function buildProjectExport(
  project: Project,
  rulesets: readonly RuleSet[],
): ProjectExportEnvelope {
  return {
    envelope: EXPORT_KIND_PROJECT,
    version: EXPORT_ENVELOPE_VERSION,
    exportedAt: new Date().toISOString(),
    project,
    rulesets: [...rulesets],
  };
}

export function projectExportFilename(project: Project): string {
  const safe = project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const stamp = new Date().toISOString().slice(0, 10);

  return `${safe || "project"}-${stamp}.project.json`;
}

export function downloadProjectExport(
  project: Project,
  rulesets: readonly RuleSet[],
): { filename: string; size: number } {
  if (typeof window === "undefined") {
    throw new Error("downloadProjectExport requires a browser environment");
  }

  const envelope = buildProjectExport(project, rulesets);
  const text = JSON.stringify(envelope, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const filename = projectExportFilename(project);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  ClientLogger.info("[export-project] downloaded", {
    projectId: project.id,
    filename,
    size: text.length,
    rulesetCount: rulesets.length,
  });

  return { filename, size: text.length };
}

// -------------------- Step 87: YAML --------------------

/** Serialise the envelope to YAML using the same shape as JSON. */
export function projectExportYaml(project: Project, rulesets: readonly RuleSet[]): string {
  const env = buildProjectExport(project, rulesets);

  return YAML.stringify(env);
}

export function downloadProjectExportYaml(
  project: Project,
  rulesets: readonly RuleSet[],
): { filename: string; size: number } {
  if (typeof window === "undefined") {
    throw new Error("downloadProjectExportYaml requires a browser environment");
  }

  const text = projectExportYaml(project, rulesets);
  const blob = new Blob([text], { type: "application/yaml" });
  const url = URL.createObjectURL(blob);
  const filename = projectExportFilename(project).replace(/\.project\.json$/, ".project.yaml");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  ClientLogger.info("[export-project] yaml downloaded", {
    projectId: project.id,
    filename,
    size: text.length,
  });

  return { filename, size: text.length };
}

// -------------------- Step 88: Zip bundle --------------------

/**
 * Zip bundle exports the same envelope as JSON + YAML plus a `manifest.json`
 * describing the archive. This is the desktop-bundle format per ADR AI-02:
 * a true SQLite payload will be emitted from the same envelope by the
 * SQLite emitter once the Postgres-to-SQLite generator lands (tracked
 * separately). Zip today, sqlite blob inside the zip later.
 */
export async function downloadProjectExportZip(
  project: Project,
  rulesets: readonly RuleSet[],
): Promise<{ filename: string; size: number }> {
  if (typeof window === "undefined") {
    throw new Error("downloadProjectExportZip requires a browser environment");
  }

  const zip = new JSZip();
  const envelope = buildProjectExport(project, rulesets);
  const jsonText = JSON.stringify(envelope, null, 2);
  const yamlText = YAML.stringify(envelope);
  zip.file("project.json", jsonText);
  zip.file("project.yaml", yamlText);
  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        envelope: envelope.envelope,
        version: envelope.version,
        exportedAt: envelope.exportedAt,
        entries: ["project.json", "project.yaml"],
        rulesetCount: rulesets.length,
        note: "SQLite payload lands with the Postgres-to-SQLite emitter (ADR AI-02).",
      },
      null,
      2,
    ),
  );
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const filename = projectExportFilename(project).replace(/\.project\.json$/, ".project.zip");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  ClientLogger.info("[export-project] zip downloaded", {
    projectId: project.id,
    filename,
    size: blob.size,
  });

  return { filename, size: blob.size };
}

// -------------------- Import (JSON + YAML) --------------------

export interface ImportResult {
  project: Project;
  rulesets: RuleSet[];
}

/**
 * Parse a JSON or YAML export envelope and return the raw project + rulesets.
 * Caller is responsible for writing into the local store (or a server fn once
 * the import server path lands). Strict envelope + version check; throws
 * with a tagged message on mismatch so callers can surface it.
 */
export function parseProjectExport(text: string, format: "json" | "yaml"): ImportResult {
  const parsed = format === "yaml" ? (YAML.parse(text) as unknown) : (JSON.parse(text) as unknown);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("import: envelope is not an object");
  }

  const env = parsed as Partial<ProjectExportEnvelope>;

  if (env.envelope !== EXPORT_KIND_PROJECT) {
    throw new Error(`import: unexpected envelope kind '${String(env.envelope)}'`);
  }

  if (env.version !== EXPORT_ENVELOPE_VERSION) {
    throw new Error(`import: unsupported version ${String(env.version)}`);
  }

  if (!env.project || Array.isArray(env.rulesets) === false) {
    throw new Error("import: missing project or rulesets");
  }

  ClientLogger.info("[export-project] import parsed", {
    projectId: env.project.id,
    rulesetCount: env.rulesets.length,
    format,
  });

  return { project: env.project as Project, rulesets: env.rulesets as RuleSet[] };
}
