import { BundleFormatType } from "@/lib/projects/bundle";
// SU-06 (plan 66, step 8): YAML/JSON parity round-trip for project bundles.
import { describe, expect, it } from "vitest";
import {
  BUNDLE_KIND,
  BUNDLE_VERSION,
  bundleFilenameFor,
  buildSqliteZipPlaceholder,
  detectBundleFormat,
  parseProjectBundle,
  parseProjectBundleAuto,
  serializeProjectBundle,
  sqliteZipFilename,
  SQLITE_ZIP_PLACEHOLDER_WARNING,
  type ProjectBundle,
} from "../bundle";
import JSZip from "jszip";

const fixture: ProjectBundle = {
  kind: BUNDLE_KIND,
  version: BUNDLE_VERSION,
  exportedAt: "2026-07-17T00:00:00.000Z",
  project: {
    id: "p1",
    name: "Line A",
    createdAt: 1,
    updatedAt: 2,
    rulesetIds: ["r1"],
    categoryNames: ["A", "B"],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
  rulesets: [
    {
      id: "r1",
      projectId: "p1",
      name: "RS1",
      rules: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  ],
};

describe("project bundle YAML parity (SU-06)", () => {
  it("round-trips JSON without change", () => {
    const text = serializeProjectBundle(fixture, BundleFormatType.Json);
    const result = parseProjectBundle(text);
    expect(result.ok).toBe(true);
    expect(result.bundle).toEqual(fixture);
  });

  it("round-trips YAML with identical shape to JSON", () => {
    const yamlText = serializeProjectBundle(fixture, BundleFormatType.Yaml);
    expect(yamlText).not.toMatch(/^\s*\{/);
    const result = parseProjectBundleAuto(yamlText);
    expect(result.ok).toBe(true);
    expect(result.bundle).toEqual(fixture);
  });

  it("auto-parses JSON via the tolerant parser", () => {
    const jsonText = serializeProjectBundle(fixture, BundleFormatType.Json);
    const result = parseProjectBundleAuto(jsonText);
    expect(result.ok).toBe(true);
    expect(result.bundle).toEqual(fixture);
  });

  it("rejects non-YAML garbage with a YAML-scoped error", () => {
    const result = parseProjectBundleAuto(":\n  - [unbalanced");
    expect(result.ok).toBe(false);
  });

  it("picks filename extension by format", () => {
    expect(bundleFilenameFor("Line A", BundleFormatType.Json)).toMatch(/\.json$/);
    expect(bundleFilenameFor("Line A", BundleFormatType.Yaml)).toMatch(/\.yaml$/);
  });

  it("detects format from filename or mime", () => {
    expect(detectBundleFormat("bundle.yaml")).toBe("yaml");
    expect(detectBundleFormat("bundle.yml")).toBe("yaml");
    expect(detectBundleFormat("bundle.json")).toBe("json");
    expect(detectBundleFormat("bundle", "application/x-yaml")).toBe("yaml");
  });

  it("builds a .sqlite.zip placeholder containing the JSON bundle and a warning", async () => {
    const blob = await buildSqliteZipPlaceholder(fixture);
    expect(blob.type).toBe("application/zip");
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const jsonText = await zip.file("bundle.json")!.async("string");
    const readme = await zip.file("README.txt")!.async("string");
    expect(readme).toContain(SQLITE_ZIP_PLACEHOLDER_WARNING);
    const parsed = parseProjectBundle(jsonText);
    expect(parsed.ok).toBe(true);
    expect(parsed.bundle).toEqual(fixture);
  });

  it("names the sqlite zip with the .sqlite.zip suffix", () => {
    expect(sqliteZipFilename("Line A")).toMatch(/\.sqlite\.zip$/);
  });
});

describe("project bundle camera parity (I-SU-05 slice 5)", () => {
  it("embeds a CameraSetting when the project references one and a resolver is provided", async () => {
    const { exportProjectBundle } = await import("../bundle");
    const camera = {
      id: "cam-1",
      name: "Cam",
      vendor: "GenericV4L2",
      deviceSerial: "",
      fovMmW: 100,
      fovMmH: 75,
      resolutionW: 1920,
      resolutionH: 1080,
      exposureUs: 5000,
      gainDb: 0,
      gamma: 1,
      whiteBalanceKelvin: 0,
      focusMode: "Auto",
      triggerMode: "Software",
      frameRateHz: 30,
      pockets: 1,
      roi: null,
      ColorModeType: "Mono8",
      notes: "",
      createdAt: 1,
      updatedAt: 2,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const state = {
      projects: {
        p1: { id: "p1", name: "P", createdAt: 0, rulesetIds: [], cameraSettingId: "cam-1" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      rulesets: {},
    };
    const b = exportProjectBundle(state, "p1", { resolveCameraSetting: () => camera });
    expect(b?.cameraSetting?.id).toBe("cam-1");
    expect(b?.version).toBe(2);
    const round = parseProjectBundle(serializeProjectBundle(b!));
    expect(round.ok).toBe(true);
    expect(round.bundle?.cameraSetting?.id).toBe("cam-1");
  });

  it("still parses legacy v1 bundles without cameraSetting", () => {
    const legacy = { ...fixture, version: 1 as const };
    const r = parseProjectBundle(JSON.stringify(legacy));
    expect(r.ok).toBe(true);
  });
});
