// Unit tests for AddressBar sanitation helpers.
//
// Pure logic, no React or router. Locks: internal-key stripping across
// multiple `?` prefixes, repeated `__lovable_*` keys, mixed casing of
// the `__lovable` prefix, and the composeCleanUrl `??` invariant.

import { describe, expect, it } from "vitest";
import { composeCleanUrl, isInternalQueryKey, sanitizeSearchString } from "../sanitize-address";

describe("isInternalQueryKey", () => {
  it("matches __lovable_* and e2e, rejects everything else", () => {
    expect(isInternalQueryKey("__lovable_sha")).toBe(true);
    expect(isInternalQueryKey("__lovable_token")).toBe(true);
    expect(isInternalQueryKey("__lovable")).toBe(true);
    expect(isInternalQueryKey("e2e")).toBe(true);
    expect(isInternalQueryKey("project")).toBe(false);
    expect(isInternalQueryKey("ruleset")).toBe(false);
    expect(isInternalQueryKey("E2E")).toBe(false); // case-sensitive on purpose
    expect(isInternalQueryKey("lovable")).toBe(false);
  });
});

describe("sanitizeSearchString", () => {
  it("returns empty string for null / undefined / empty inputs", () => {
    expect(sanitizeSearchString(undefined)).toBe("");
    expect(sanitizeSearchString(null)).toBe("");
    expect(sanitizeSearchString("")).toBe("");
    expect(sanitizeSearchString("?")).toBe("");
    expect(sanitizeSearchString("???")).toBe("");
  });

  it("strips a single leading `?`", () => {
    expect(sanitizeSearchString("?project=alpha")).toBe("project=alpha");
  });

  it("strips multiple leading `?` characters", () => {
    expect(sanitizeSearchString("??project=alpha")).toBe("project=alpha");
    expect(sanitizeSearchString("????a=1&b=2")).toBe("a=1&b=2");
  });

  it("removes every __lovable_* param", () => {
    const out = sanitizeSearchString("?__lovable_sha=abc&__lovable_token=xyz&project=alpha");
    expect(out).not.toMatch(/__lovable/);
    expect(out).toContain("project=alpha");
  });

  it("removes repeated occurrences of the same __lovable key", () => {
    const out = sanitizeSearchString(
      "?__lovable_token=a&__lovable_token=b&__lovable_token=c&project=alpha",
    );
    expect(out).not.toMatch(/__lovable/);
    expect(out).toBe("project=alpha");
  });

  it("removes the e2e param", () => {
    expect(sanitizeSearchString("?e2e=1&project=alpha")).toBe("project=alpha");
    expect(sanitizeSearchString("?project=alpha&e2e=1")).toBe("project=alpha");
  });

  it("returns empty when only internal params are present", () => {
    expect(sanitizeSearchString("?__lovable_sha=abc&__lovable_token=xyz&e2e=1")).toBe("");
  });

  it("preserves real params in original order", () => {
    const out = sanitizeSearchString("?project=alpha&__lovable_sha=abc&ruleset=beta");
    expect(out).toBe("project=alpha&ruleset=beta");
  });

  it("handles searchStr without any leading `?`", () => {
    expect(sanitizeSearchString("project=alpha&__lovable_sha=abc")).toBe("project=alpha");
  });

  it("output never starts with `?`", () => {
    const inputs = ["?a=1", "??a=1", "a=1", "?__lovable_x=1&a=2", "?e2e=1&a=2"];
    for (const input of inputs) {
      expect(sanitizeSearchString(input).startsWith("?")).toBe(false);
    }
  });
});

describe("composeCleanUrl", () => {
  it("returns bare pathname when search is empty", () => {
    expect(composeCleanUrl("/setup/roi", "")).toBe("/setup/roi");
  });

  it("prefixes exactly one `?` when search is non-empty", () => {
    expect(composeCleanUrl("/setup/roi", "project=alpha")).toBe("/setup/roi?project=alpha");
  });

  it("never produces `??` even when composed against sanitized output", () => {
    const dirty = "??__lovable_sha=abc&project=alpha";
    const url = composeCleanUrl("/setup/roi", sanitizeSearchString(dirty));
    expect(url).toBe("/setup/roi?project=alpha");
    expect(url).not.toContain("??");
    expect((url.match(/\?/g) ?? []).length).toBe(1);
  });

  it("round-trip: internal-only search collapses to bare path", () => {
    const url = composeCleanUrl(
      "/setup/roi",
      sanitizeSearchString("?__lovable_sha=abc&__lovable_token=xyz&e2e=1"),
    );
    expect(url).toBe("/setup/roi");
    expect(url).not.toContain("?");
  });
});
