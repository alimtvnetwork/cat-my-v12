// Verifies the Toaster is configured for compact stacked toasts with right-side close.

import { describe, it, expect, vi } from "vitest";

const captured: { props: Record<string, unknown> | null } = { props: null };

vi.mock("sonner", () => ({
  Toaster: (props: Record<string, unknown>) => {
    captured.props = props;

    return null;
  },
}));

import { renderToString } from "react-dom/server";
import { Toaster } from "@/components/ui/sonner";

describe("Toaster", () => {
  it("configures compact stacking + right-aligned close", () => {
    renderToString(<Toaster />);
    expect(captured.props?.closeButton).toBe(true);
    expect(captured.props?.visibleToasts).toBe(5);
    expect(captured.props?.position).toBe("bottom-right");
    const classNames = (
      captured.props?.toastOptions as {
        classNames: { toast: string; closeButton: string };
      }
    ).classNames;
    // Compact wrapper padding + right-side close positioning override.
    expect(classNames.toast).toMatch(/pr-7/);
    expect(classNames.toast).toMatch(/data-close-button.*right-1/);
    // Close button is absolutely pinned to the top-right.
    expect(classNames.closeButton).toMatch(/!right-1/);
    expect(classNames.closeButton).toMatch(/!left-auto/);
  });
});
