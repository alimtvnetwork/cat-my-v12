// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { useLightingStore, DEFAULT_LIGHTING_CONTROLS } from "../store";
import { StorageKey } from "@/lib/constants/storage";

describe("lighting store", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") window.localStorage.clear();
    useLightingStore.setState({ ...DEFAULT_LIGHTING_CONTROLS });
  });

  it("clamps exposure to [-100, 100]", () => {
    useLightingStore.getState().setExposure(500);
    expect(useLightingStore.getState().exposure).toBe(100);
    useLightingStore.getState().setExposure(-500);
    expect(useLightingStore.getState().exposure).toBe(-100);
  });

  it("clamps gain / enhance / darken to [0, 100]", () => {
    const s = useLightingStore.getState();
    s.setGain(-5);
    s.setEnhance(500);
    s.setDarken(NaN);
    const next = useLightingStore.getState();
    expect(next.gain).toBe(0);
    expect(next.enhance).toBe(100);
    expect(next.darken).toBe(0);
  });

  it("persists to localStorage under the registered key", () => {
    useLightingStore.getState().setExposure(42);
    const raw = window.localStorage.getItem(StorageKey.LightingControls);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).exposure).toBe(42);
  });

  it("reset returns defaults", () => {
    useLightingStore.getState().setExposure(20);
    useLightingStore.getState().reset();
    expect(useLightingStore.getState()).toMatchObject(DEFAULT_LIGHTING_CONTROLS);
  });

  it("hydrate loads persisted values and clamps them", () => {
    window.localStorage.setItem(
      StorageKey.LightingControls,
      JSON.stringify({ exposure: 999, gain: 30 }),
    );
    useLightingStore.getState().hydrate();
    const s = useLightingStore.getState();
    expect(s.exposure).toBe(100);
    expect(s.gain).toBe(30);
  });
});
