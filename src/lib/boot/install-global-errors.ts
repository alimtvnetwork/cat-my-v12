import { useEffect } from "react";
import { installGlobalErrorCapture } from "@/lib/errors/globalCapture";
import { useErrorStore } from "@/lib/stores/errorStore";

export function useGlobalErrors() {
  useEffect(() => {
    const uninstall = installGlobalErrorCapture();
    return uninstall;
  }, []);

  useEffect(() => {
    void useErrorStore.getState().hydrateFromStorage();
  }, []);
}
