import { DataSourceType } from "@/lib/data-source/store";
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { runBackendWrite } from "../gate";
import { __resetDataSourceForTests, setDataSource } from "../store";

describe("runBackendWrite", () => {
  beforeEach(() => {
    __resetDataSourceForTests();
  });

  it("short-circuits with seedResult when data-source is seed", async () => {
    const op = vi.fn().mockResolvedValue("real");
    const onSeedSkip = vi.fn();
    const result = await runBackendWrite(op, {
      seedResult: "mock",
      label: "save rule",
      onSeedSkip,
    });
    expect(result).toBe("mock");
    expect(op).not.toHaveBeenCalled();
    expect(onSeedSkip).toHaveBeenCalledWith("save rule");
  });

  it("invokes op when data-source is backend", async () => {
    setDataSource(DataSourceType.Backend);
    const op = vi.fn().mockResolvedValue("real");
    const result = await runBackendWrite(op, { seedResult: "mock", label: "save rule" });
    expect(result).toBe("real");
    expect(op).toHaveBeenCalledOnce();
  });
});
