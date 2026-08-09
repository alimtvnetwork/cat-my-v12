// Plan 90 Step 138 tests.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../reconcileDrafts", () => ({
  reconcileDrafts: vi.fn(),
}));

import { reconcileDrafts } from "../reconcileDrafts";
import { runBootReconcile, __resetBootReconcileForTests } from "../bootReconcile";

const mocked = reconcileDrafts as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  __resetBootReconcileForTests();
  mocked.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("runBootReconcile", () => {
  it("runs reconcileDrafts exactly once per page load", async () => {
    mocked.mockResolvedValue([]);
    const notify = vi.fn();

    await runBootReconcile({ notify });
    await runBootReconcile({ notify });
    await runBootReconcile({ notify });

    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it("dedupes concurrent invocations to a single in-flight call", async () => {
    let resolve!: (v: unknown[]) => void;
    mocked.mockReturnValue(new Promise((r) => (resolve = r as never)));

    const a = runBootReconcile({ notify: vi.fn() });
    const b = runBootReconcile({ notify: vi.fn() });
    resolve([]);
    await Promise.all([a, b]);

    expect(mocked).toHaveBeenCalledTimes(1);
  });

  it("notifies operator once per server-newer / local-newer entry", async () => {
    mocked.mockResolvedValue([
      {
        RuleSetId: 1,
        Kind: "server-newer",
        Local: { Version: 2 } as never,
        Server: { Version: 5 } as never,
      },
      {
        RuleSetId: 2,
        Kind: "local-newer",
        Local: { Version: 7 } as never,
        Server: { Version: 3 } as never,
      },
      {
        RuleSetId: 3,
        Kind: "in-sync",
        Local: { Version: 1 } as never,
        Server: { Version: 1 } as never,
      },
      {
        RuleSetId: 4,
        Kind: "server-missing",
        Local: { Version: 1 } as never,
        Server: null,
      },
      {
        RuleSetId: 5,
        Kind: "load-failed",
        Local: { Version: 1 } as never,
        Server: null,
      },
    ]);
    const notify = vi.fn();

    const entries = await runBootReconcile({ notify });

    expect(entries).toHaveLength(5);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify.mock.calls[0]?.[0]).toContain("#1");
    expect(notify.mock.calls[1]?.[0]).toContain("#2");
  });

  it("never throws when reconcileDrafts rejects (shell must not brick)", async () => {
    mocked.mockRejectedValue(new Error("idb offline"));
    const notify = vi.fn();
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const entries = await runBootReconcile({ notify });

    expect(entries).toEqual([]);
    expect(err).toHaveBeenCalledWith("[bootReconcile] fatal", expect.any(Error));
  });
});
