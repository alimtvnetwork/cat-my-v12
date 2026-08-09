import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { parseFacadeRows, serializeFacadeRows } from "../contracts";

const rowSchema = z.object({ id: z.string().min(1), n: z.number().int() });
type Row = z.infer<typeof rowSchema>;

describe("parseFacadeRows", () => {
  it("returns [] for null / empty input without warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parseFacadeRows<Row>(null, rowSchema, "test")).toEqual([]);
    expect(parseFacadeRows<Row>("", rowSchema, "test")).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    expect(err).not.toHaveBeenCalled();
    warn.mockRestore();
    err.mockRestore();
  });

  it("returns [] and errors when payload is not JSON", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(parseFacadeRows<Row>("{not json", rowSchema, "test")).toEqual([]);
    expect(err).toHaveBeenCalledOnce();
    err.mockRestore();
  });

  it("returns [] and warns when payload is not an array", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseFacadeRows<Row>('{"id":"a","n":1}', rowSchema, "test")).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("drops invalid rows and keeps valid ones", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const raw = JSON.stringify([
      { id: "a", n: 1 },
      { id: "", n: 2 }, // invalid id
      { id: "b", n: "nope" }, // invalid n
      { id: "c", n: 3 },
    ]);
    const rows = parseFacadeRows<Row>(raw, rowSchema, "test");
    expect(rows).toEqual([
      { id: "a", n: 1 },
      { id: "c", n: 3 },
    ]);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("round-trips via serializeFacadeRows", () => {
    const rows: Row[] = [
      { id: "a", n: 1 },
      { id: "b", n: 2 },
    ];
    expect(parseFacadeRows<Row>(serializeFacadeRows(rows), rowSchema, "test")).toEqual(rows);
  });
});
