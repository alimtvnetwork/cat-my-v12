import { EditorRuleKindType } from "@/lib/editor/types";
import { DndStepType } from "@/lib/editor/dnd/constants";
import { describe, it, expect, beforeEach } from "vitest";
import { useKeyboardDnd } from "./keyboard-controller";
import { DndModeType } from "@/types/rules/DndMode";
import { DndAxisType } from "@/types/rules/DndAxis";
import type { EditorRule } from "@/lib/editor/types";

describe("keyboard-controller", () => {
  beforeEach(() => {
    // Reset store before each test
    useKeyboardDnd.setState({
      mode: DndModeType.Idle,
      grabbedId: null,
      originRect: null,
      activeRect: null,
      announcement: "",
    });
  });

  const mockRule: EditorRule = {
    id: "r1",
    kind: EditorRuleKindType.R,
    name: "Test Rule",
    x: 100,
    y: 200,
    width: 50,
    height: 60,
    isHidden: false,
    isLocked: false,
    params: {},
  };

  it("transitions to grabbed state on grab()", () => {
    const store = useKeyboardDnd.getState();
    store.grab(mockRule);

    const next = useKeyboardDnd.getState();
    expect(next.mode).toBe(DndModeType.KeyboardGrabbed);
    expect(next.grabbedId).toBe("r1");
    expect(next.originRect).toEqual({ x: 100, y: 200, width: 50, height: 60 });
    expect(next.activeRect).toEqual({ x: 100, y: 200, width: 50, height: 60 });
    expect(next.announcement).toMatch(/Grabbed/);
  });

  it("updates activeRect on move()", () => {
    const store = useKeyboardDnd.getState();
    store.grab(mockRule);

    useKeyboardDnd.getState().move(DndAxisType.X, 1, DndStepType.Fine);

    const next = useKeyboardDnd.getState();
    expect(next.activeRect?.x).toBe(101); // 100 + 1 * 1
    expect(next.activeRect?.y).toBe(200);
    expect(next.announcement).toMatch(/Moved/);

    useKeyboardDnd.getState().move(DndAxisType.Y, -1, DndStepType.Coarse);
    const after = useKeyboardDnd.getState();
    expect(after.activeRect?.y).toBe(190); // 200 - 1 * 10
  });

  it("cancels and restores state on cancel()", () => {
    const store = useKeyboardDnd.getState();
    store.grab(mockRule);
    useKeyboardDnd.getState().move(DndAxisType.X, 1, DndStepType.Coarse);

    useKeyboardDnd.getState().cancel();

    const next = useKeyboardDnd.getState();
    expect(next.mode).toBe(DndModeType.Idle);
    expect(next.grabbedId).toBeNull();
    expect(next.originRect).toBeNull();
    expect(next.activeRect).toBeNull();
    expect(next.announcement).toMatch(/cancelled/i);
  });

  it("clears state on drop()", () => {
    const store = useKeyboardDnd.getState();
    store.grab(mockRule);

    useKeyboardDnd.getState().drop();

    const next = useKeyboardDnd.getState();
    expect(next.mode).toBe(DndModeType.Idle);
    expect(next.grabbedId).toBeNull();
    expect(next.announcement).toMatch(/Dropped/);
  });
});
