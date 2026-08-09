import { describe, expect, it } from "vitest";
import { assertUlidArgs, invokeRpc, RpcError, RpcErrorCodeType } from "@/lib/rpc/client";

const VALID = "01J8Z9K3QF6H2N4A5B7C8D9E0F";

describe("assertUlidArgs (F-20/21/29 boundary guard)", () => {
  it("returns args when all named fields are valid ULIDs", () => {
    const args = { taskId: VALID, runId: VALID };
    expect(assertUlidArgs(args, ["taskId", "runId"])).toBe(args);
  });

  it("throws RpcError(E_ID_INVALID) with the failing field name", () => {
    try {
      assertUlidArgs({ taskId: "not-a-ulid" }, ["taskId"]);
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(RpcError);
      expect((err as RpcError).code).toBe(RpcErrorCodeType.E_ID_INVALID);
      expect((err as RpcError).message).toContain("taskId");
    }
  });

  it("invokeRpc rejects before dispatching when ulidFields fail", async () => {
    let called = false;
    const fn = async () => {
      called = true;
      return "ok";
    };
    await expect(
      invokeRpc(fn as never, { imageId: "bad" }, { ulidFields: ["imageId"] }),
    ).rejects.toMatchObject({ code: RpcErrorCodeType.E_ID_INVALID });
    expect(called).toBe(false);
  });
});
