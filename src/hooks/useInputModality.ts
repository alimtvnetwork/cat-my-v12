/**
 * Plan 100 Phase F step 54: track the last input modality (keyboard or
 * pointer) so UI can surface a "Keyboard mode" indicator and CSS can
 * gate focus-ring intensity via `[data-input-modality="keyboard"]` on
 * `<html>`. Single listener pair on window; state is memoized in a
 * module-level store so multiple consumers share one signal.
 */
import { useEffect, useSyncExternalStore } from "react";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export enum ModalityType {
  Keyboard = "keyboard",
  Pointer = "pointer",
}
export type Modality = ModalityType;

let current: Modality = ModalityType.Pointer;
const listeners = new Set<() => void>();

function set(next: Modality): void {
  if (current === next) return;
  current = next;

  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.dataset.inputModality = next;
  }

  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);

  return () => {
    listeners.delete(l);
  };
}

function getSnapshot(): Modality {
  return current;
}

function getServerSnapshot(): Modality {
  return ModalityType.Pointer;
}

export function InputModalityTracker(): null {
  useEffect(() => {
    if (typeof document === "undefined" || !document.documentElement) {
      console.warn("[input-modality] document unavailable; skipping tracker");

      return;
    }

    document.documentElement.dataset.inputModality = current;
    const onKey = (e: KeyboardEvent) => {
      if (
        KeyboardKeyType.isEscape(e.key) ||
        e.key.startsWith("Arrow") ||
        KeyboardKeyType.isTab(e.key) ||
        KeyboardKeyType.isEnter(e.key) ||
        KeyboardKeyType.isSpace(e.key) ||
        e.key.length === 1
      ) {
        set(ModalityType.Keyboard);
      }
    };
    const onPointer = () => set(ModalityType.Pointer);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousedown", onPointer, true);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("touchstart", onPointer, { capture: true, passive: true });

    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("mousedown", onPointer, true);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("touchstart", onPointer, true);
    };
  }, []);

  return null;
}

export function useInputModality(): Modality {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}