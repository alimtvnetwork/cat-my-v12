import { describe, expect, it } from "vitest";
import { buildCrumbsFromMatches } from "../AppBreadcrumb";
import { registerParamResolver } from "@/lib/breadcrumb-tokens";

describe("buildCrumbsFromMatches", () => {
  it("resolves literal segments via the static token map", () => {
    const crumbs = buildCrumbsFromMatches("/setup/rules", {}, true);
    expect(crumbs).toEqual([
      { to: "/setup", label: "Setup" },
      { to: "/setup/rules", label: "Rules" },
    ]);
  });

  it("resolves dynamic params through registered store resolvers", () => {
    registerParamResolver("projectId", (id) => (id === "p1" ? "Alpha Project" : undefined));
    registerParamResolver("rulesetId", (id) => (id === "r9" ? "Ruleset 9" : undefined));
    const crumbs = buildCrumbsFromMatches(
      "/projects/p1/rulesets/r9",
      { projectId: "p1", rulesetId: "r9" },
      true,
    );
    expect(crumbs.map((c) => c.label)).toEqual([
      "Projects",
      "Alpha Project",
      "Rule Sets",
      "Ruleset 9",
    ]);
  });

  it("skips resolvers when not hydrated (SSR parity)", () => {
    registerParamResolver("projectId", () => "Should Not Appear");
    const crumbs = buildCrumbsFromMatches("/projects/p1", { projectId: "p1" }, false);
    // Without resolvers, the segment falls through to formatLabel which
    // title-cases the raw id.
    expect(crumbs.map((c) => c.label)).toEqual(["Projects", "P1"]);
  });

  it("falls back to the raw id when the resolver returns undefined", () => {
    registerParamResolver("projectId", () => undefined);
    const crumbs = buildCrumbsFromMatches("/projects/missing", { projectId: "missing" }, true);
    // resolveCrumb returns the raw segment when a resolver exists but yields
    // undefined, so the id remains lowercase (unlike the unresolved path).
    expect(crumbs.map((c) => c.label)).toEqual(["Projects", "missing"]);
  });
});
