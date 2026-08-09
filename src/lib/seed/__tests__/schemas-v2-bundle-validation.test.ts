import { describe, it, expect } from "vitest";
import {
  parseSeedBundleV2,
  checkBundleIntegrity,
  checkReferentialIntegrity,
  SeedBundleValidationError,
} from "../schemas-v2";
import bundle from "../data/bundle.v2.json";

// Regression coverage for the three failure modes bundle.v2.json editors
// most often introduce: duplicate ids, missing required fields, and bad
// cross-slice references. Complements schemas-v2-detailed-errors.test.ts;
// this file focuses on the negative-path fixtures a human editing the
// JSON is likely to trip.

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe("bundle.v2.json schema validation", () => {
  describe("baseline", () => {
    it("the shipped bundle passes shape, integrity, and referential checks", () => {
      const parsed = parseSeedBundleV2(bundle);
      expect(checkBundleIntegrity(parsed)).toEqual([]);
      expect(checkReferentialIntegrity(parsed)).toEqual([]);
    });
  });

  describe("duplicate ids", () => {
    it("flags a duplicate rule id with slice-indexed path", () => {
      const b = clone(bundle) as unknown as {
        rules: Array<{ id: string; rulesetId: string; categoryId?: string }>;
      };
      const first = b.rules[0];
      b.rules.push({ ...first });
      try {
        parseSeedBundleV2(b);

        throw new Error("expected throw");
      } catch (err) {
        const e = err as SeedBundleValidationError;
        expect(e).toBeInstanceOf(SeedBundleValidationError);
        const dup = e.issues.find(
          (i) => i.kind === "integrity" && i.message.startsWith(`duplicate id "${first.id}"`),
        );
        expect(dup?.path).toBe(`rules[${b.rules.length - 1}].id`);
      }
    });

    it("flags a duplicate project id", () => {
      const b = clone(bundle) as unknown as {
        projects: Array<Record<string, unknown> & { id: string }>;
      };
      const first = b.projects[0];
      b.projects.push({ ...first });
      try {
        parseSeedBundleV2(b);

        throw new Error("expected throw");
      } catch (err) {
        const e = err as SeedBundleValidationError;
        expect(
          e.issues.some(
            (i) => i.kind === "integrity" && i.got === first.id && i.path.startsWith("projects["),
          ),
        ).toBe(true);
      }
    });

    it("flags a missing frozen profile via integrity check", () => {
      const b = clone(bundle) as unknown as {
        profiles: Array<Record<string, unknown> & { id: string }>;
        projects: Array<Record<string, unknown> & { profileId?: string }>;
      };
      b.profiles = b.profiles.filter((p) => p.id !== "prof-error-preview");
      // scrub any project referencing the removed profile so we isolate the integrity signal
      b.projects = b.projects.filter((p) => p.profileId !== "prof-error-preview");
      try {
        parseSeedBundleV2(b);

        throw new Error("expected throw");
      } catch (err) {
        const e = err as SeedBundleValidationError;
        expect(
          e.issues.some(
            (i) =>
              i.kind === "integrity" &&
              i.expected === "frozen profile present" &&
              i.got === "prof-error-preview",
          ),
        ).toBe(true);
      }
    });
  });

  describe("missing required fields", () => {
    it("throws SeedBundleValidationError when a sample is missing projectId", () => {
      expect(() =>
        parseSeedBundleV2({
          ...(bundle as object),
          samples: [{ id: "smp-x", cameraId: "cam-1" }],
        }),
      ).toThrow(SeedBundleValidationError);
    });

    it("throws when a project is missing profileId", () => {
      const b = clone(bundle) as unknown as {
        projects: Array<Record<string, unknown> & { id: string }>;
      };
      const { profileId: _drop, ...rest } = b.projects[0] as {
        profileId?: string;
      } & Record<string, unknown>;
      b.projects[0] = rest as (typeof b.projects)[0];
      try {
        parseSeedBundleV2(b);

        throw new Error("expected throw");
      } catch (err) {
        const e = err as SeedBundleValidationError;
        expect(e).toBeInstanceOf(SeedBundleValidationError);
        expect(e.issues.some((i) => i.path === "projects[0].profileId" && i.kind === "shape")).toBe(
          true,
        );
      }
    });

    it("throws when a rule is missing its id", () => {
      const b = clone(bundle) as unknown as {
        rules: Array<Record<string, unknown>>;
      };
      const { id: _dropId, ...rest } = b.rules[0] as { id?: string } & Record<string, unknown>;
      b.rules[0] = rest;
      try {
        parseSeedBundleV2(b);

        throw new Error("expected throw");
      } catch (err) {
        const e = err as SeedBundleValidationError;
        expect(e.issues.some((i) => i.path === "rules[0].id" && i.kind === "shape")).toBe(true);
      }
    });
  });

  describe("bad slice references", () => {
    it("flags a dangling sample.projectId as a reference issue", () => {
      try {
        parseSeedBundleV2({
          ...(bundle as object),
          samples: [{ id: "smp-x", projectId: "proj-nope", cameraId: "cam-nope" }],
        });

        throw new Error("expected throw");
      } catch (err) {
        const e = err as SeedBundleValidationError;
        const paths = e.issues.filter((i) => i.kind === "reference").map((i) => i.path);
        expect(paths).toEqual(
          expect.arrayContaining(["samples[0].projectId", "samples[0].cameraId"]),
        );
      }
    });

    it("flags a dangling rule.rulesetId via checkReferentialIntegrity", () => {
      const parsed = parseSeedBundleV2(bundle);
      const issues = checkReferentialIntegrity({
        ...parsed,
        rules: [
          ...parsed.rules,
          {
            id: "rule-orphan",
            rulesetId: "rs-does-not-exist",
            categoryId: parsed.rules[0].categoryId,
          } as (typeof parsed.rules)[number],
        ],
      });
      const iss = issues.find((i) => i.kind === "reference" && i.got === "rs-does-not-exist");
      expect(iss).toBeDefined();
      expect(iss?.expected).toContain("rulesets");
    });

    it("flags an unsupported top-level slice key", () => {
      try {
        parseSeedBundleV2({
          ...(bundle as object),
          widgets: [{ id: "wid-1" }],
        } as never);

        throw new Error("expected throw");
      } catch (err) {
        const e = err as SeedBundleValidationError;
        expect(
          e.issues.some(
            (i) =>
              i.kind === "integrity" && i.path === "widgets" && i.message === "unsupported slice",
          ),
        ).toBe(true);
      }
    });
  });
});
