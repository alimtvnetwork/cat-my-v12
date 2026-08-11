/** @vitest-environment jsdom */
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef, useLayoutEffect, type MutableRefObject } from "react";
import { useViewportSafe } from "../useViewportSafe";

function makeRect(r: { left: number; top: number; right: number; bottom: number }): DOMRect {
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.right - r.left,
    height: r.bottom - r.top,
    x: r.left,
    y: r.top,
    toJSON: () => ({}),
  } as DOMRect;
}

function setViewport(w: number, h: number): void {
  Object.defineProperty(window, "innerWidth", { value: w, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: h, configurable: true });
}

afterEach(() => {
  setViewport(1024, 768);
});

describe("useViewportSafe", () => {
  it("returns true when the element fits inside the viewport", () => {
    setViewport(1280, 800);
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null) as MutableRefObject<HTMLDivElement | null>;
      useLayoutEffect(() => {
        const div = document.createElement("div");
        div.getBoundingClientRect = () => makeRect({ left: 100, top: 60, right: 400, bottom: 160 });
        ref.current = div;
      }, []);

      return useViewportSafe(ref);
    });
    expect(result.current).toBe(true);
  });

  it("returns false when the element extends past the right edge", () => {
    setViewport(640, 800);
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null) as MutableRefObject<HTMLDivElement | null>;
      useLayoutEffect(() => {
        const div = document.createElement("div");
        div.getBoundingClientRect = () => makeRect({ left: 500, top: 60, right: 780, bottom: 160 });
        ref.current = div;
      }, []);

      return useViewportSafe(ref);
    });
    expect(result.current).toBe(false);
  });

  it("re-measures on window resize", () => {
    setViewport(1280, 800);
    const rectRef: { current: { left: number; top: number; right: number; bottom: number } } = {
      current: { left: 100, top: 60, right: 400, bottom: 160 },
    };
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null) as MutableRefObject<HTMLDivElement | null>;
      useLayoutEffect(() => {
        const div = document.createElement("div");
        div.getBoundingClientRect = () => makeRect(rectRef.current);
        ref.current = div;
      }, []);

      return useViewportSafe(ref);
    });
    expect(result.current).toBe(true);
    act(() => {
      setViewport(380, 800);
      window.dispatchEvent(new Event("resize"));
    });
    expect(result.current).toBe(false);
  });
});