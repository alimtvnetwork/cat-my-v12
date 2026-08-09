// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { computeRouteParent, isTypingTarget } from "../HistoryNav";

describe("computeRouteParent", () => {
  it("returns null at the root", () => {
    expect(computeRouteParent("/")).toBeNull();
    expect(computeRouteParent("")).toBeNull();
  });
  it("drops the last segment", () => {
    expect(computeRouteParent("/projects/abc")).toBe("/projects");
    expect(computeRouteParent("/setup/rules")).toBe("/setup");
    expect(computeRouteParent("/projects/abc/rulesets/x")).toBe("/projects/abc/rulesets");
  });
  it("returns / when the current path has a single segment", () => {
    expect(computeRouteParent("/projects")).toBe("/");
    expect(computeRouteParent("/setup")).toBe("/");
  });
  it("strips trailing slashes before computing the parent", () => {
    expect(computeRouteParent("/projects/abc/")).toBe("/projects");
  });
});

describe("isTypingTarget", () => {
  it("returns false for null / non-elements", () => {
    expect(isTypingTarget(null)).toBe(false);
  });
  it("returns true for INPUT, TEXTAREA, SELECT", () => {
    for (const tag of ["input", "textarea", "select"]) {
      const el = document.createElement(tag);
      expect(isTypingTarget(el)).toBe(true);
    }
  });
  it("returns true for contenteditable elements", () => {
    // jsdom does not compute isContentEditable from the attribute; test
    // the duck-typed shape isTypingTarget actually reads.
    const el = { tagName: "DIV", isContentEditable: true };
    expect(isTypingTarget(el as unknown as EventTarget)).toBe(true);
  });
  it("returns false for a plain BUTTON", () => {
    const el = document.createElement("button");
    expect(isTypingTarget(el)).toBe(false);
  });
});
