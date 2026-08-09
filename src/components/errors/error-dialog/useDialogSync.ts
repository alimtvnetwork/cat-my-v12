// Sync a semantic <dialog> element's open state to a boolean prop.

import { useEffect, type RefObject } from "react";

function openDialog(el: HTMLDialogElement): void {
  if (el.open === true) return;
  el.showModal?.();
}

function closeDialog(el: HTMLDialogElement): void {
  if (el.open === false) return;
  el.close();
}

export function useDialogSync(ref: RefObject<HTMLDialogElement | null>, isOpen: boolean): void {
  useEffect(() => {
    const el = ref.current;

    if (el === null) return;

    if (isOpen === true) openDialog(el);

    if (isOpen === false) closeDialog(el);
  }, [ref, isOpen]);
}
