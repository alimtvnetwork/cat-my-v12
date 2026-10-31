import { useEffect, useRef } from "react";
import { HttpMethod } from "@/lib/constants";

import { useBackendMode } from "@/lib/backend/mode";
import { ClientLogger } from "@/lib/observability/client-logger";
import { useErrorStore } from "@/lib/stores/errorStore";
import type { UiRemotePacket } from "@/lib/ui-remote/registry";

// Spec 54: CLI-to-UI bridge for a browser --app SPA (no Tauri event bus).
// The hook polls the backend packet queue and performs each action through
// the SAME code path as a user click (real el.click() / native value setter
// + input/change events), so React state updates exactly as if the user
// acted. Missing elements are captured into the error store as tracked
// warnings — never silent failures (AGM "No Silent Errors" principle).

const POLL_INTERVAL_MS = 1000;

type ResolvedElement = {
  element: HTMLElement;
  resolvedVia: string;
};

function resolveById(elementId: string): ResolvedElement | null {
  const byId = document.getElementById(elementId);

  if (byId) {
    return { element: byId as HTMLElement, resolvedVia: "id" };
  }

  const selectors = [
    `[data-automation-id="${elementId}"]`,
    `[data-automation-name="${elementId}"]`,
    `[data-ui-id="${elementId}"]`,
    `[data-ui-name="${elementId}"]`,
    `[data-testid="${elementId}"]`,
    `[title="${elementId}"]`,
  ];

  for (const selector of selectors) {
    const found = document.querySelector(selector);

    if (found) {
      return { element: found as HTMLElement, resolvedVia: selector };
    }
  }

  return null;
}

function resolveByXpath(xpath: string): ResolvedElement | null {
  const found = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  ).singleNodeValue;

  if (!found) {
    return null;
  }

  return { element: found as HTMLElement, resolvedVia: "xpath" };
}

function resolveElement(packet: UiRemotePacket): ResolvedElement | null {
  if (packet.elementId) {
    const byId = resolveById(packet.elementId);

    if (byId) {
      return byId;
    }
  }

  if (packet.xpath) {
    return resolveByXpath(packet.xpath);
  }

  return null;
}

function setInputValue(element: HTMLElement, value: string): void {
  const isSelect = element.tagName === "SELECT";
  const prototype = isSelect
    ? window.HTMLSelectElement.prototype
    : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  if (descriptor?.set) {
    descriptor.set.call(element, value);
  } else {
    (element as HTMLInputElement).value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function performAction(packet: UiRemotePacket, element: HTMLElement): void {
  if (packet.action === "click") {
    element.click();

    return;
  }

  if (packet.action === "scroll") {
    element.scrollIntoView({ block: "center" });

    if (typeof element.focus === "function") {
      element.focus();
    }

    return;
  }

  if (packet.action === "focus") {
    element.focus();

    return;
  }

  if (packet.action === "set" && packet.value !== null && packet.value !== undefined) {
    setInputValue(element, packet.value);

    return;
  }

  throw new Error(`Unsupported action for element: ${packet.action}`);
}

function performNavigate(packet: UiRemotePacket): void {
  const target = packet.route ?? "/";

  if (window.location.pathname !== target) {
    window.history.pushState(null, "", target);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
}

async function reportResult(
  baseUrl: string,
  packetId: string,
  result: {
    performed: boolean;
    resolvedVia?: string | null;
    error?: string | null;
  },
): Promise<void> {
  await fetch(`${baseUrl}/ui-remote/results`, {
    method: HttpMethod.Post,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packetId, ...result }),
  });
}

export function useUiRemoteControl(): void {
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const poll = async (): Promise<void> => {
      const baseUrl = useBackendMode.getState().baseUrl;

      let pending: UiRemotePacket[] = [];

      try {
        const response = await fetch(`${baseUrl}/ui-remote/pending`);

        if (!response.ok) {
          ClientLogger.warn(`[ui-remote] pending poll failed: ${response.status}`);

          return;
        }

        const envelope = (await response.json()) as { Results?: UiRemotePacket[] };
        pending = envelope.Results ?? [];
      } catch (error) {
        ClientLogger.warn(`[ui-remote] pending poll error: ${String(error)}`);

        return;
      }

      for (const packet of pending) {
        try {
          if (packet.action === "navigate") {
            performNavigate(packet);
            await reportResult(baseUrl, packet.packetId, {
              performed: true,
              resolvedVia: "history",
            });

            continue;
          }

          const resolved = resolveElement(packet);

          if (!resolved) {
            const target = packet.elementId ?? packet.xpath ?? "unknown";
            const message = `UI remote target not found: ${target}`;

            useErrorStore.getState().captureError(new Error(message), {
              triggerComponent: "useUiRemoteControl",
            });

            await reportResult(baseUrl, packet.packetId, {
              performed: false,
              resolvedVia: null,
              error: message,
            });

            continue;
          }

          performAction(packet, resolved.element);

          await reportResult(baseUrl, packet.packetId, {
            performed: true,
            resolvedVia: resolved.resolvedVia,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);

          useErrorStore.getState().captureError(error, {
            triggerComponent: "useUiRemoteControl",
          });

          await reportResult(baseUrl, packet.packetId, {
            performed: false,
            resolvedVia: null,
            error: message,
          });
        }
      }
    };

    const timer = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    void poll();

    return () => {
      window.clearInterval(timer);
    };
  }, []);
}
