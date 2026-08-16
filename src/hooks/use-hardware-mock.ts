import { useState, useEffect } from "react";

export const HARDWARE_MOCK_KEY = "ca.vision.hardwareMock";

const readFlag = () => {
  if (typeof window === "undefined") return false;
  // If the env var is explicitly 1, we default to no mock (real hardware)
  // If we're not running with real hardware, default mock to true.
  const envVal = import.meta.env.VITE_LOVABLE_HW_DAHENG;
  const defaultMock = envVal !== "1";

  const raw = window.localStorage.getItem(HARDWARE_MOCK_KEY);
  if (!raw) return defaultMock;
  return raw === "true";
};

export function useHardwareMockToggle() {
  const [mock, setMock] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMock(readFlag());
    setHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === HARDWARE_MOCK_KEY) {
        setMock(e.newValue === "true");
      }
    };

    const onCustom = (e: CustomEvent<boolean>) => {
      setMock(e.detail);
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("ca:hardwareMock", onCustom as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ca:hardwareMock", onCustom as EventListener);
    };
  }, []);

  const toggle = (val: boolean) => {
    setMock(val);
    window.localStorage.setItem(HARDWARE_MOCK_KEY, String(val));
    window.dispatchEvent(new CustomEvent("ca:hardwareMock", { detail: val }));
  };

  return { mock, hydrated, setMock: toggle };
}
