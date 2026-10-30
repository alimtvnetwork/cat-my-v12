"""Element registry for CLI-to-UI remote control (spec 54).

Single source of truth. The TypeScript mirror at
`src/lib/ui-remote/registry.ts` is generated from this file by
`03-ai-scripts/generate-ui-remote-registry.py` — never edit the mirror
by hand.

Entry shape:
    id: stable identifier used by the CLI (`ui click <id>`).
    name: visible label as seen on screen.
    kind: button | input | select | region.
    xpath: live-DOM locator, verified against the real component source.
    routes: screens the element appears on; ["*"] means global.
    actions: actions the hook may perform (click, scroll, focus, set).
    set_range: [min, max] for settable range inputs; null otherwise.
"""

from __future__ import annotations

from typing import Any

ACTIONS = ("click", "scroll", "focus", "set", "navigate")

ELEMENTS: list[dict[str, Any]] = [
    {
        "id": "ui-window-minimize",
        "name": "Minimize Window",
        "kind": "button",
        "xpath": "//div[@data-testid='window-controls-bar']//button[@aria-label='Minimize Window']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-window-maximize",
        "name": "Window Layer or Maximize",
        "kind": "button",
        "xpath": "//div[@data-testid='window-controls-bar']//button[@aria-label='Window Layer or Maximize']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-window-close",
        "name": "Close Application",
        "kind": "button",
        "xpath": "//div[@data-testid='window-controls-bar']//button[@aria-label='Close Application']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-exit-cancel",
        "name": "Cancel",
        "kind": "button",
        "xpath": "//div[@role='dialog']//button[normalize-space()='Cancel']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-exit-confirm",
        "name": "Exit Now",
        "kind": "button",
        "xpath": "//div[@role='dialog']//button[normalize-space()='Exit Now']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-sim-previous",
        "name": "Previous Step",
        "kind": "button",
        "xpath": "//button[@aria-label='Previous Step']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-sim-next",
        "name": "Next Step",
        "kind": "button",
        "xpath": "//button[@aria-label='Next Step']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-sim-exit",
        "name": "Exit Simulation",
        "kind": "button",
        "xpath": "//button[@aria-label='Exit Simulation']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-sim-takeover",
        "name": "Take over simulation and freely explore this screen",
        "kind": "button",
        "xpath": "//button[@aria-label='Take over simulation and freely explore this screen']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-sim-dwell",
        "name": "Screen dwell duration in seconds",
        "kind": "input",
        "xpath": "//input[@aria-label='Screen dwell duration in seconds']",
        "routes": ["*"],
        "actions": ["click", "set"],
        "set_range": [2, 10],
    },
    {
        "id": "ui-greyscale-level",
        "name": "Greyscale Level",
        "kind": "input",
        "xpath": "//div[div/span[text()='Greyscale Level']]/input[@type='range']",
        "routes": ["*"],
        "actions": ["click", "set"],
        "set_range": [0, 255],
    },
    {
        "id": "ui-project-camera-select",
        "name": "Bound setting",
        "kind": "select",
        "xpath": "//select[@id='project-camera-select']",
        "routes": ["*"],
        "actions": ["set", "scroll", "focus"],
        "set_range": None,
    },
    {
        "id": "ui-workpiece-canvas",
        "name": "Workpiece Inspection Canvas",
        "kind": "region",
        "xpath": "//*[@aria-label='Workpiece Inspection Canvas']",
        "routes": ["*"],
        "actions": ["scroll", "focus"],
        "set_range": None,
    },
    {
        "id": "ui-visual-results",
        "name": "Visual Analysis Results",
        "kind": "region",
        "xpath": "//*[@aria-label='Visual Analysis Results']",
        "routes": ["*"],
        "actions": ["scroll", "focus"],
        "set_range": None,
    },
    {
        "id": "ui-pin1-pattern-shape-rectangle",
        "name": "Pattern Shape Rectangle",
        "kind": "button",
        "xpath": "//*[@data-ui-id='ui-pin1-pattern-shape-rectangle']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-pin1-pattern-shape-circle",
        "name": "Pattern Shape Circle",
        "kind": "button",
        "xpath": "//*[@data-ui-id='ui-pin1-pattern-shape-circle']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-pin1-pattern-shape-ellipse",
        "name": "Pattern Shape Ellipse",
        "kind": "button",
        "xpath": "//*[@data-ui-id='ui-pin1-pattern-shape-ellipse']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-pin1-pattern-shape-polygon",
        "name": "Pattern Shape Polygon",
        "kind": "button",
        "xpath": "//*[@data-ui-id='ui-pin1-pattern-shape-polygon']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-pin1-canvas",
        "name": "Pin 1 Canvas",
        "kind": "region",
        "xpath": "//*[@data-ui-id='ui-pin1-canvas']",
        "routes": ["*"],
        "actions": ["scroll", "focus"],
        "set_range": None,
    },
    {
        "id": "ui-greyscale-mode-threshold",
        "name": "Grayscale Mode Threshold",
        "kind": "button",
        "xpath": "//*[@data-ui-id='ui-greyscale-mode-threshold']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-greyscale-mode-stretch",
        "name": "Grayscale Mode Stretch",
        "kind": "button",
        "xpath": "//*[@data-ui-id='ui-greyscale-mode-stretch']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-greyscale-mode-one-bit",
        "name": "Grayscale Mode 1-Bit",
        "kind": "button",
        "xpath": "//*[@data-ui-id='ui-greyscale-mode-one-bit']",
        "routes": ["*"],
        "actions": ["click"],
        "set_range": None,
    },
    {
        "id": "ui-pattern-canvas",
        "name": "Pattern Image Canvas",
        "kind": "region",
        "xpath": "//*[@data-ui-id='ui-pattern-canvas']",
        "routes": ["*"],
        "actions": ["scroll", "focus"],
        "set_range": None,
    },
    {
        "id": "ui-whitebox-canvas",
        "name": "White Box Marking Canvas",
        "kind": "region",
        "xpath": "//*[@data-ui-id='ui-whitebox-canvas']",
        "routes": ["*"],
        "actions": ["scroll", "focus"],
        "set_range": None,
    },
    {
        "id": "ui-whitebox-layers-panel",
        "name": "White Box Layers Panel",
        "kind": "region",
        "xpath": "//*[@data-ui-id='ui-whitebox-layers-panel']",
        "routes": ["*"],
        "actions": ["scroll", "focus"],
        "set_range": None,
    },
    {
        "id": "ui-pin1-canvas-wrap",
        "name": "Pin 1 Marking Canvas",
        "kind": "region",
        "xpath": "//*[@data-ui-id='ui-pin1-canvas-wrap']",
        "routes": ["*"],
        "actions": ["scroll", "focus"],
        "set_range": None,
    },
    {
        "id": "ui-pin1-layers-panel",
        "name": "Pin 1 Layers Panel",
        "kind": "region",
        "xpath": "//*[@data-ui-id='ui-pin1-layers-panel']",
        "routes": ["*"],
        "actions": ["scroll", "focus"],
        "set_range": None,
    },
]


def list_elements(route: str | None = None) -> list[dict[str, Any]]:
    """Elements visible on `route`; all entries when route is empty."""

    if not route or route == "*":
        return list(ELEMENTS)

    return [e for e in ELEMENTS if "*" in e["routes"] or route in e["routes"]]


def find_by_id(element_id: str) -> dict[str, Any] | None:
    """Registry entry for `element_id`, or None when unknown."""

    for entry in ELEMENTS:
        if entry["id"] == element_id:
            return entry

    return None


def find_by_xpath(xpath: str) -> dict[str, Any] | None:
    """Registry entry whose xpath matches exactly, or None."""

    for entry in ELEMENTS:
        if entry["xpath"] == xpath:
            return entry

    return None
