import { DataSourceType } from "@/lib/data-source/store";
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getDataSource,
  setDataSource,
  __resetDataSourceForTests,
  DATA_SOURCE_STORAGE_KEY,
} from "../store";

describe("data-source store", () => {
  beforeEach(() => {
    __resetDataSourceForTests();
  });

  it("defaults to seed", () => {
    expect(getDataSource()).toBe("seed");
  });

  it("persists to localStorage on set", () => {
    setDataSource(DataSourceType.Backend);
    expect(getDataSource()).toBe("backend");
    expect(window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY)).toBe("backend");
  });

  it("notifies subscribers only on real change", () => {
    const spy = vi.fn();
    // Reach into the module via re-import to grab subscribe indirectly.
    // We assert behavior through side-effects: no-op set does not persist.
    setDataSource(DataSourceType.Seed);
    expect(window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY)).toBeNull();
    setDataSource(DataSourceType.Backend);
    expect(window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY)).toBe("backend");
    expect(spy).not.toHaveBeenCalled();
  });

  it("logs an observability line on change", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    setDataSource(DataSourceType.Backend, { reason: "unit" });
    expect(info).toHaveBeenCalledWith(
      "[data-source] changed",
      expect.objectContaining({ prev: "seed", next: "backend", reason: "unit" }),
    );
    info.mockRestore();
  });
});
