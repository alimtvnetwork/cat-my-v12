import { describe, it, expect } from "vitest";
import { formatRelative } from "../SavedBadge";

// Plan 81 step 4: relative-time helper must round to the nearest useful
// bucket. These cases lock in the labels that appear in the Settings hub
// so a stray change (e.g. dropping the "just now" bucket) fails loudly.
describe("SavedBadge / formatRelative", () => {
  const at = 1_000_000;

  it("labels sub-second deltas as 'just now'", () => {
    expect(formatRelative(at + 400, at)).toBe("just now");
  });

  it("labels seconds with an s suffix", () => {
    expect(formatRelative(at + 3_000, at)).toBe("3s ago");
    expect(formatRelative(at + 45_000, at)).toBe("45s ago");
  });

  it("labels minutes with an m suffix", () => {
    expect(formatRelative(at + 90_000, at)).toBe("2m ago");
    expect(formatRelative(at + 30 * 60_000, at)).toBe("30m ago");
  });

  it("labels hours with an h suffix", () => {
    expect(formatRelative(at + 2 * 60 * 60_000, at)).toBe("2h ago");
  });

  it("clamps negative deltas to 'just now'", () => {
    expect(formatRelative(at - 5_000, at)).toBe("just now");
  });
});
