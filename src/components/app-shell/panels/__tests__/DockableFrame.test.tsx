// @vitest-environment jsdom
// Plan 66 step 10 (SS-03 slice 1): DockableFrame primitive tests.
// Exercises the four-mode state machine (dock/float/min/hidden) and the
// control wiring back to the workspace layout store.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DockableFrame, derivePanelMode } from "../DockableFrame";
import { PanelModeType, DockSlotType } from "@/lib/enums/ui";
import {
  useWorkspaceLayoutStore,
  buildDefaultPanels,
  DEFAULT_DOCK_SIZES,
} from "@/lib/workspace/layout-slice";

function resetLayout() {
  useWorkspaceLayoutStore.setState({
    panels: buildDefaultPanels(),
    dockSizes: { ...DEFAULT_DOCK_SIZES },
  });
}

describe("derivePanelMode", () => {
  it("returns 'hidden' when state is missing or closed", () => {
    expect(derivePanelMode(undefined)).toBe(PanelModeType.Hidden);
    expect(
      derivePanelMode({ open: false, dock: DockSlotType.Right, minimized: false, order: 0 }),
    ).toBe(PanelModeType.Hidden);
  });
  it("returns 'min' when open and minimized", () => {
    expect(
      derivePanelMode({ open: true, dock: DockSlotType.Right, minimized: true, order: 0 }),
    ).toBe(PanelModeType.Min);
  });
  it("returns 'float' when docked to floating slot", () => {
    expect(
      derivePanelMode({ open: true, dock: DockSlotType.Floating, minimized: false, order: 0 }),
    ).toBe(PanelModeType.Float);
  });
  it("returns 'dock' otherwise", () => {
    expect(
      derivePanelMode({ open: true, dock: DockSlotType.Right, minimized: false, order: 0 }),
    ).toBe(PanelModeType.Dock);
  });
});

describe("DockableFrame", () => {
  beforeEach(() => {
    resetLayout();
    // Ensure the target panel is open so it renders.
    useWorkspaceLayoutStore.getState().openPanel("properties");
  });
  afterEach(() => cleanup());

  it("renders the registry title and marks the current mode", () => {
    render(
      <DockableFrame panelId="properties">
        <p>body</p>
      </DockableFrame>,
    );
    expect(screen.getByText("Properties")).toBeTruthy();
    expect(screen.getByText("body")).toBeTruthy();
    expect(screen.getByTestId("dockable-properties").getAttribute("data-panel-mode")).toBe("dock");
  });

  it("returns null when the panel is hidden (closed)", () => {
    useWorkspaceLayoutStore.getState().closePanel("properties");
    const { container } = render(
      <DockableFrame panelId="properties">
        <p>body</p>
      </DockableFrame>,
    );
    expect(container.textContent).toBe("");
  });

  it("minimize button dispatches minimizePanel and toggles collapsed", async () => {
    const user = userEvent.setup();
    render(
      <DockableFrame panelId="properties">
        <p>body</p>
      </DockableFrame>,
    );
    await user.click(screen.getByTestId("panel-properties-minimize"));
    const state = useWorkspaceLayoutStore.getState().panels.properties;
    expect(state.minimized).toBe(true);
    expect(screen.getByTestId("dockable-properties").getAttribute("data-panel-mode")).toBe("min");
    // Collapsed body is hidden via aria-hidden per PanelChrome contract.
    expect(screen.getByTestId("panel-properties-body").getAttribute("aria-hidden")).toBe("true");
  });

  it("close button dispatches closePanel and unmounts the frame", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DockableFrame panelId="properties">
        <p>body</p>
      </DockableFrame>,
    );
    await user.click(screen.getByTestId("panel-properties-close"));
    expect(useWorkspaceLayoutStore.getState().panels.properties.open).toBe(false);
    expect(container.textContent).toBe("");
  });

  it("chevron restores from minimized to expanded", async () => {
    useWorkspaceLayoutStore.getState().minimizePanel("properties");
    const user = userEvent.setup();
    render(
      <DockableFrame panelId="properties">
        <p>body</p>
      </DockableFrame>,
    );
    expect(screen.getByTestId("dockable-properties").getAttribute("data-panel-mode")).toBe("min");
    await user.click(screen.getByTestId("panel-properties-toggle"));
    expect(useWorkspaceLayoutStore.getState().panels.properties.minimized).toBe(false);
    expect(screen.getByTestId("dockable-properties").getAttribute("data-panel-mode")).toBe("dock");
  });

  it("reflects float mode when dock === 'floating'", () => {
    useWorkspaceLayoutStore
      .getState()
      .floatPanel("properties", { x: 10, y: 20, width: 320, height: 240 });
    render(
      <DockableFrame panelId="properties">
        <p>body</p>
      </DockableFrame>,
    );
    expect(screen.getByTestId("dockable-properties").getAttribute("data-panel-mode")).toBe(
      PanelModeType.Float,
    );
  });

  it("returns null for unknown panel ids (no throw)", () => {
    const { container } = render(
      <DockableFrame panelId="__nope__">
        <p>body</p>
      </DockableFrame>,
    );
    expect(container.textContent).toBe("");
  });
});
