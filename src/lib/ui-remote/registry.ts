/** Generated from BE/ui_remote/registry.py — do not edit by hand. */

export type UiRemoteAction = "click" | "scroll" | "focus" | "set" | "navigate";

export interface UiRemoteElement {
  id: string;
  name: string;
  kind: "button" | "input" | "select" | "region";
  xpath: string;
  routes: string[];
  actions: UiRemoteAction[];
  setRange: [number, number] | null;
}

export interface UiRemotePacket {
  packetId: string;
  action: UiRemoteAction;
  elementId?: string | null;
  xpath?: string | null;
  route?: string | null;
  value?: string | null;
  actor: string;
  status: string;
  createdAt: string;
}

export interface UiRemoteResult {
  packetId: string;
  performed: boolean;
  resolvedVia?: string | null;
  error?: string | null;
}

export const UI_REMOTE_ELEMENTS: UiRemoteElement[] = [
  {
    id: "ui-window-minimize",
    name: "Minimize Window",
    kind: "button",
    xpath: "//div[@data-testid='window-controls-bar']//button[@aria-label='Minimize Window']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-window-maximize",
    name: "Window Layer or Maximize",
    kind: "button",
    xpath: "//div[@data-testid='window-controls-bar']//button[@aria-label='Window Layer or Maximize']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-window-close",
    name: "Close Application",
    kind: "button",
    xpath: "//div[@data-testid='window-controls-bar']//button[@aria-label='Close Application']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-exit-cancel",
    name: "Cancel",
    kind: "button",
    xpath: "//div[@role='dialog']//button[normalize-space()='Cancel']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-exit-confirm",
    name: "Exit Now",
    kind: "button",
    xpath: "//div[@role='dialog']//button[normalize-space()='Exit Now']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-sim-previous",
    name: "Previous Step",
    kind: "button",
    xpath: "//button[@aria-label='Previous Step']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-sim-next",
    name: "Next Step",
    kind: "button",
    xpath: "//button[@aria-label='Next Step']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-sim-exit",
    name: "Exit Simulation",
    kind: "button",
    xpath: "//button[@aria-label='Exit Simulation']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-sim-takeover",
    name: "Take over simulation and freely explore this screen",
    kind: "button",
    xpath: "//button[@aria-label='Take over simulation and freely explore this screen']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-sim-dwell",
    name: "Screen dwell duration in seconds",
    kind: "input",
    xpath: "//input[@aria-label='Screen dwell duration in seconds']",
    routes: ["*"],
    actions: ["click", "set"],
    setRange: [2, 10],
  },
  {
    id: "ui-greyscale-level",
    name: "Greyscale Level",
    kind: "input",
    xpath: "//div[div/span[text()='Greyscale Level']]/input[@type='range']",
    routes: ["*"],
    actions: ["click", "set"],
    setRange: [0, 255],
  },
  {
    id: "ui-project-camera-select",
    name: "Bound setting",
    kind: "select",
    xpath: "//select[@id='project-camera-select']",
    routes: ["*"],
    actions: ["set", "scroll", "focus"],
    setRange: null,
  },
  {
    id: "ui-workpiece-canvas",
    name: "Workpiece Inspection Canvas",
    kind: "region",
    xpath: "//*[@aria-label='Workpiece Inspection Canvas']",
    routes: ["*"],
    actions: ["scroll", "focus"],
    setRange: null,
  },
  {
    id: "ui-visual-results",
    name: "Visual Analysis Results",
    kind: "region",
    xpath: "//*[@aria-label='Visual Analysis Results']",
    routes: ["*"],
    actions: ["scroll", "focus"],
    setRange: null,
  },
  {
    id: "ui-pin1-pattern-shape-rectangle",
    name: "Pattern Shape Rectangle",
    kind: "button",
    xpath: "//*[@data-ui-id='ui-pin1-pattern-shape-rectangle']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-pin1-pattern-shape-circle",
    name: "Pattern Shape Circle",
    kind: "button",
    xpath: "//*[@data-ui-id='ui-pin1-pattern-shape-circle']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-pin1-pattern-shape-ellipse",
    name: "Pattern Shape Ellipse",
    kind: "button",
    xpath: "//*[@data-ui-id='ui-pin1-pattern-shape-ellipse']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-pin1-pattern-shape-polygon",
    name: "Pattern Shape Polygon",
    kind: "button",
    xpath: "//*[@data-ui-id='ui-pin1-pattern-shape-polygon']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-pin1-canvas",
    name: "Pin 1 Canvas",
    kind: "region",
    xpath: "//*[@data-ui-id='ui-pin1-canvas']",
    routes: ["*"],
    actions: ["scroll", "focus"],
    setRange: null,
  },
  {
    id: "ui-greyscale-mode-threshold",
    name: "Grayscale Mode Threshold",
    kind: "button",
    xpath: "//*[@data-ui-id='ui-greyscale-mode-threshold']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-greyscale-mode-stretch",
    name: "Grayscale Mode Stretch",
    kind: "button",
    xpath: "//*[@data-ui-id='ui-greyscale-mode-stretch']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-greyscale-mode-one-bit",
    name: "Grayscale Mode 1-Bit",
    kind: "button",
    xpath: "//*[@data-ui-id='ui-greyscale-mode-one-bit']",
    routes: ["*"],
    actions: ["click"],
    setRange: null,
  },
  {
    id: "ui-pattern-canvas",
    name: "Pattern Image Canvas",
    kind: "region",
    xpath: "//*[@data-ui-id='ui-pattern-canvas']",
    routes: ["*"],
    actions: ["scroll", "focus"],
    setRange: null,
  },
  {
    id: "ui-whitebox-canvas",
    name: "White Box Marking Canvas",
    kind: "region",
    xpath: "//*[@data-ui-id='ui-whitebox-canvas']",
    routes: ["*"],
    actions: ["scroll", "focus"],
    setRange: null,
  },
  {
    id: "ui-whitebox-layers-panel",
    name: "White Box Layers Panel",
    kind: "region",
    xpath: "//*[@data-ui-id='ui-whitebox-layers-panel']",
    routes: ["*"],
    actions: ["scroll", "focus"],
    setRange: null,
  },
  {
    id: "ui-pin1-canvas-wrap",
    name: "Pin 1 Marking Canvas",
    kind: "region",
    xpath: "//*[@data-ui-id='ui-pin1-canvas-wrap']",
    routes: ["*"],
    actions: ["scroll", "focus"],
    setRange: null,
  },
  {
    id: "ui-pin1-layers-panel",
    name: "Pin 1 Layers Panel",
    kind: "region",
    xpath: "//*[@data-ui-id='ui-pin1-layers-panel']",
    routes: ["*"],
    actions: ["scroll", "focus"],
    setRange: null,
  },
];

export function findUiRemoteElementById(id: string): UiRemoteElement | undefined {

  return UI_REMOTE_ELEMENTS.find((entry) => entry.id === id);
}
