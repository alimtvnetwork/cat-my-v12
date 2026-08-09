import { describe, it, expect } from "vitest";
import {
  parseSeedBundleV2,
  checkReferentialIntegrity,
  SeedBundleValidationError,
} from "../schemas-v2";
import bundle from "../data/bundle.v2.json";

// Detailed, contextual error surfaces for the seed bundle validator.
// Each assertion checks (a) the `path` string is precise, (b) the `kind`
// is one of shape|integrity|reference, and (c) `expected`/`got` are set
// so callers can render structured UI without regexing the message.
describe("seed bundle v2 - detailed validation errors", () => {
  it("shape: required cross-slice FK missing surfaces as a shape issue with slice-indexed path", () => {
    try {
      parseSeedBundleV2({
        ...(bundle as object),
        samples: [{ id: "smp-x", cameraId: "cam-1" }], // missing required projectId
      });

      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(SeedBundleValidationError);
      const e = err as SeedBundleValidationError;
      const iss = e.issues.find((i) => i.path === "samples[0].projectId");
      expect(iss?.kind).toBe("shape");
      expect(iss?.message).toMatch(/Required|invalid_type/i);
    }
  });

  it("reference: dangling projectId on a sample yields a reference issue with expected+got", () => {
    try {
      parseSeedBundleV2({
        ...(bundle as object),
        samples: [{ id: "smp-x", projectId: "proj-does-not-exist" }],
      });

      throw new Error("expected throw");
    } catch (err) {
      const e = err as SeedBundleValidationError;
      const iss = e.issues.find((i) => i.path === "samples[0].projectId");
      expect(iss?.kind).toBe("reference");
      expect(iss?.expected).toBe("id in slice `projects`");
      expect(iss?.got).toBe("proj-does-not-exist");
    }
  });

  it("reference: ruleset<->rule bidirectional mismatch surfaces with a targeted message", () => {
    const issues = checkReferentialIntegrity({
      ...(bundle as unknown as Parameters<typeof checkReferentialIntegrity>[0]),
      rulesets: [
        {
          id: "rs-only",
          categoryId: "cat-solder",
          ruleIds: [], // missing rule-a
        },
      ] as never,
      rules: [{ id: "rule-a", rulesetId: "rs-only", categoryId: "cat-solder" }] as never,
    });
    const bidi = issues.find(
      (i) => i.path === "rules[0].rulesetId" && i.message.includes("does not list it"),
    );
    expect(bidi).toBeDefined();
    expect(bidi?.expected).toContain(`ruleIds contains "rule-a"`);
  });

  it("reference: emptyStates ctaArgs.profileId is checked", () => {
    const issues = checkReferentialIntegrity({
      ...(bundle as unknown as Parameters<typeof checkReferentialIntegrity>[0]),
      emptyStates: [
        {
          id: "es-x",
          surface: "test",
          ctaArgs: { profileId: "prof-bogus" },
        },
      ] as never,
    });
    const iss = issues.find((i) => i.path === "emptyStates[0].ctaArgs.profileId");
    expect(iss?.kind).toBe("reference");
    expect(iss?.got).toBe("prof-bogus");
  });

  it("aggregates all issues in a single throw, not just the first", () => {
    try {
      parseSeedBundleV2({
        ...(bundle as object),
        samples: [
          { id: "smp-a", projectId: "proj-nope-1" },
          { id: "smp-b", projectId: "proj-nope-2", cameraId: "cam-nope" },
        ],
      });

      throw new Error("expected throw");
    } catch (err) {
      const e = err as SeedBundleValidationError;
      const refPaths = e.issues.filter((i) => i.kind === "reference").map((i) => i.path);
      expect(refPaths).toEqual(
        expect.arrayContaining([
          "samples[0].projectId",
          "samples[1].projectId",
          "samples[1].cameraId",
        ]),
      );
    }
  });

  it("error message is human-readable and prefixed", () => {
    try {
      parseSeedBundleV2({
        ...(bundle as object),
        samples: [{ id: "smp-x" }],
      });

      throw new Error("expected throw");
    } catch (err) {
      expect((err as Error).message).toMatch(/^\[seed-bundle-v2\] \d+ issue/);
      expect((err as Error).message).toContain("samples[0].projectId");
    }
  });
});
