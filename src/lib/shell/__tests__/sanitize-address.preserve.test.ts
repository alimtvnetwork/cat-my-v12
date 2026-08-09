// Regression: sanitizer must ONLY strip __lovable_* and e2e params,
// and preserve every other legitimate query parameter (value, order,
// duplicates, encoding, empty values, reserved-looking names).

import { describe, expect, it } from "vitest";
import { sanitizeSearchString } from "../sanitize-address";

describe("sanitizeSearchString preserves legitimate params", () => {
  it("keeps typical app params untouched when no internal keys present", () => {
    const out = sanitizeSearchString("?project=abc&ruleset=main&tab=rules");
    expect(out).toBe("project=abc&ruleset=main&tab=rules");
  });

  it("strips internal keys while preserving surrounding params and order", () => {
    const out = sanitizeSearchString(
      "?project=abc&__lovable_token=xyz&ruleset=main&e2e=1&tab=rules",
    );
    expect(out).toBe("project=abc&ruleset=main&tab=rules");
  });

  it("preserves duplicate legitimate keys (e.g. multi-select filters)", () => {
    const out = sanitizeSearchString("?tag=a&tag=b&__lovable_sha=deadbeef&tag=c");
    expect(out).toBe("tag=a&tag=b&tag=c");
  });

  it("preserves empty-value params", () => {
    const out = sanitizeSearchString("?q=&__lovable_x=1&sort=");
    expect(out).toBe("q=&sort=");
  });

  it("preserves URL-encoded values", () => {
    const out = sanitizeSearchString("?name=John%20Doe&__lovable_token=abc&path=%2Fsetup%2Froi");
    // URLSearchParams re-encodes spaces as '+', which is equivalent.
    expect(out).toBe("name=John+Doe&path=%2Fsetup%2Froi");
  });

  it("does NOT strip params that merely contain 'lovable' or 'e2e' as a substring", () => {
    const out = sanitizeSearchString("?lovable=keep&myE2E=keep&e2etest=keep&__lovable_drop=1");
    expect(out).toBe("lovable=keep&myE2E=keep&e2etest=keep");
  });

  it("is case-sensitive: E2E and __LOVABLE_* are preserved (not internal)", () => {
    const out = sanitizeSearchString("?E2E=1&__LOVABLE_TOKEN=xyz&project=abc");
    expect(out).toBe("E2E=1&__LOVABLE_TOKEN=xyz&project=abc");
  });

  it("returns empty when only internal keys are present", () => {
    expect(sanitizeSearchString("?__lovable_token=a&__lovable_sha=b&e2e=1")).toBe("");
  });
});
