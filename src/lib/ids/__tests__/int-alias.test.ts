import { IntAliasNamespaceType } from "@/lib/ids/int-alias";
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { __resetIntAliasForTests, seedIntParams, toIntParam, resolveIdParam } from "../int-alias";

describe("int-alias deterministic seeding", () => {
  beforeEach(() => __resetIntAliasForTests());

  it("assigns integers in lexicographic order", () => {
    seedIntParams(IntAliasNamespaceType.Project, ["zeta", "alpha", "mike"]);
    expect(toIntParam(IntAliasNamespaceType.Project, "alpha")).toBe("1");
    expect(toIntParam(IntAliasNamespaceType.Project, "mike")).toBe("2");
    expect(toIntParam(IntAliasNamespaceType.Project, "zeta")).toBe("3");
  });

  it("is idempotent and cross-install deterministic", () => {
    seedIntParams(IntAliasNamespaceType.Ruleset, ["b", "a", "c"]);
    seedIntParams(IntAliasNamespaceType.Ruleset, ["a", "b", "c"]);
    expect(toIntParam(IntAliasNamespaceType.Ruleset, "a")).toBe("1");
    expect(toIntParam(IntAliasNamespaceType.Ruleset, "c")).toBe("3");
  });

  it("preserves prior aliases when new ids are added", () => {
    seedIntParams(IntAliasNamespaceType.Project, ["one", "two"]);
    const one = toIntParam(IntAliasNamespaceType.Project, "one");
    seedIntParams(IntAliasNamespaceType.Project, ["aaa", "one", "two", "zzz"]);
    expect(toIntParam(IntAliasNamespaceType.Project, "one")).toBe(one);
    expect(resolveIdParam(IntAliasNamespaceType.Project, "1")).toBe("one");
  });

  it("skips numeric-looking ids", () => {
    seedIntParams(IntAliasNamespaceType.Project, ["42", "beta"]);
    expect(toIntParam(IntAliasNamespaceType.Project, "beta")).toBe("1");
    expect(toIntParam(IntAliasNamespaceType.Project, "42")).toBe("42");
  });
});
