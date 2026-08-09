/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor, cleanup } from "@testing-library/react";
import { SeedProvider, useSeedContext } from "../provider";
import { MemoryUiSeedFacade, EMPTY_CAT_SEED_BUNDLE } from "../memory-facade";
import { UiSeedSourceType, type UiSeedFacade } from "../facade";
import type { CatSeedBundle } from "../types";

function StatusProbe() {
  const { status, bundle, error, reload } = useSeedContext();

  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="version">{bundle?.version ?? "-"}</span>
      <span data-testid="err">{error?.message ?? "-"}</span>
      <button data-testid="reload" onClick={reload}>
        reload
      </button>
    </div>
  );
}

/** Facade that lets a test drive load() resolution manually and count calls. */
class ControllableFacade implements UiSeedFacade {
  public readonly source = UiSeedSourceType.Memory;
  public calls = 0;
  private resolvers: Array<{
    resolve: (b: CatSeedBundle) => void;
    reject: (e: unknown) => void;
  }> = [];
  load(): Promise<CatSeedBundle> {
    this.calls += 1;

    return new Promise((resolve, reject) => {
      this.resolvers.push({ resolve, reject });
    });
  }

  getSlice(): Promise<never> {
    throw new Error("not used in these tests");
  }

  resolveNext(bundle: CatSeedBundle): void {
    const next = this.resolvers.shift();

    if (!next) throw new Error("no pending load() to resolve");
    next.resolve(bundle);
  }

  rejectNext(err: unknown): void {
    const next = this.resolvers.shift();

    if (!next) throw new Error("no pending load() to reject");
    next.reject(err);
  }
}

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe("SeedProvider transitions (Plan 72 step 22)", () => {
  it("transitions loading -> ready and exposes the bundle", async () => {
    const facade = new ControllableFacade();
    render(
      <SeedProvider facade={facade}>
        <StatusProbe />
      </SeedProvider>,
    );
    // useEffect flushes microtask: status is already "loading".
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("loading"));
    await act(async () => {
      facade.resolveNext({ ...EMPTY_CAT_SEED_BUNDLE, version: "1.2.3" });
    });
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("ready"));
    expect(screen.getByTestId("version").textContent).toBe("1.2.3");
    expect(screen.getByTestId("err").textContent).toBe("-");
  });

  it("transitions loading -> error and preserves the Error instance", async () => {
    const facade = new ControllableFacade();
    render(
      <SeedProvider facade={facade}>
        <StatusProbe />
      </SeedProvider>,
    );
    await act(async () => {
      facade.rejectNext(new Error("bundle unreachable"));
    });
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("error"));
    expect(screen.getByTestId("err").textContent).toBe("bundle unreachable");
  });

  it("reload() re-invokes the facade and returns to ready", async () => {
    const facade = new ControllableFacade();
    render(
      <SeedProvider facade={facade}>
        <StatusProbe />
      </SeedProvider>,
    );
    await act(async () => {
      facade.rejectNext(new Error("first fail"));
    });
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("error"));
    // Click reload -> a second load() is issued.
    await act(async () => {
      screen.getByTestId("reload").click();
    });
    expect(facade.calls).toBe(2);
    await act(async () => {
      facade.resolveNext({ ...EMPTY_CAT_SEED_BUNDLE, version: "9.9.9" });
    });
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("ready"));
    expect(screen.getByTestId("version").textContent).toBe("9.9.9");
  });

  it("useSeedContext throws when used outside SeedProvider", () => {
    // Suppress the expected React error boundary noise.
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<StatusProbe />)).toThrow(
      /useSeedContext must be used inside <SeedProvider>/,
    );
    err.mockRestore();
  });

  it("MemoryUiSeedFacade + SeedProvider resolves ready on first tick", async () => {
    // Sanity path used by other tests / storybook: no manual driving.
    const facade = new MemoryUiSeedFacade({
      ...EMPTY_CAT_SEED_BUNDLE,
      version: "mem-1",
    });
    render(
      <SeedProvider facade={facade}>
        <StatusProbe />
      </SeedProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("ready"));
    expect(screen.getByTestId("version").textContent).toBe("mem-1");
  });
});
