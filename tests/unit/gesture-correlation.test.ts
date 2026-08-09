// Gesture correlation ids (plan 30 step 91).
import { describe, expect, it } from "vitest";
import { nextGestureId, withGesture } from "@/lib/editor/errors";
import { tail } from "@/lib/editor/log-stream";

describe("gesture correlation (91)", () => {
  it("nextGestureId returns a source-tagged unique id per call", () => {
    const a = nextGestureId("shortcut");
    const b = nextGestureId("shortcut");
    expect(a.startsWith("gid-shortcut-")).toBe(true);
    expect(a).not.toEqual(b);
  });

  it("withGesture reuses the same correlationId across every entry", () => {
    const gid = nextGestureId("test");
    const g = withGesture(gid);
    g.info("I_TEST_A", { step: 1 });
    g.warn("I_TEST_B", { step: 2 });
    g.error("I_TEST_C", { step: 3 });
    const entries = tail(3);
    expect(entries.map((e) => e.correlationId)).toEqual([gid, gid, gid]);
    expect(entries.map((e) => e.code)).toEqual(["I_TEST_A", "I_TEST_B", "I_TEST_C"]);
  });
});
