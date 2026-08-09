import { describe, expect, it } from "vitest";
import { assertUlid, isUlid, ULID_RE, UlidFormatError } from "@/lib/ids/ulid";

const VALID = "01J8Z9K3QF6H2N4A5B7C8D9E0F";

describe("ULID regex + assert (F-20 boundary parity with app/core/ids/ulid.py)", () => {
  it("accepts a Crockford Base32 26-char id", () => {
    expect(ULID_RE.test(VALID)).toBe(true);
    expect(isUlid(VALID)).toBe(true);
    expect(assertUlid(VALID, "taskId")).toBe(VALID);
  });

  it.each([
    ["empty", ""],
    ["25 chars", VALID.slice(0, 25)],
    ["27 chars", VALID + "Z"],
    ["contains I (excluded)", "01J8Z9K3QF6H2N4A5B7C8D9E0I"],
    ["contains L (excluded)", "01J8Z9K3QF6H2N4A5B7C8D9E0L"],
    ["contains O (excluded)", "01J8Z9K3QF6H2N4A5B7C8D9E0O"],
    ["contains U (excluded)", "01J8Z9K3QF6H2N4A5B7C8D9E0U"],
    ["lowercase", VALID.toLowerCase()],
  ])("rejects %s", (_label, bad) => {
    expect(isUlid(bad)).toBe(false);
    expect(() => assertUlid(bad, "taskId")).toThrow(UlidFormatError);
  });

  it.each([[null], [undefined], [123], [{}], [[VALID]]])("rejects non-string %p", (bad) => {
    expect(isUlid(bad as unknown)).toBe(false);
    expect(() => assertUlid(bad as unknown, "taskId")).toThrow(UlidFormatError);
  });

  it("attaches E_ID_INVALID + field name for downstream RPC mapping", () => {
    try {
      assertUlid("bad", "runId");
      throw new Error("expected throw");
    } catch (err) {
      const e = err as UlidFormatError;
      expect(e).toBeInstanceOf(UlidFormatError);
      expect(e.code).toBe("E_ID_INVALID");
      expect(e.field).toBe("runId");
      expect(e.message).toContain("runId");
    }
  });
});
