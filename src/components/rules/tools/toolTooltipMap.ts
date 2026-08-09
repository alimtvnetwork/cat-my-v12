// Plan 79 step 27/28. Tooltip content map for the V4 tools palette.
//
// Kept as data so the palette component stays a pure presenter and so
// tests can assert every tool has a title, keyboard hint, body, usage
// steps, and "when to use" guidance. Step 28 upgrades the schema from a
// single `body` sentence to structured content (summary + how-to steps +
// tips + when-to-use) so the tooltip can render formatted help without
// the palette owning any copy.
// Spec: spec/21-app/53-ui-improvements-v4.md section 3.

export enum ToolIdType {
  Select = "select",
  Rectangle = "rectangle",
  Circle = "circle",
  Polygon = "polygon",
  Texttools = "textTools",
}
export type ToolId = ToolIdType;

export interface ToolTooltip {
  /** Short label, appears in the tooltip header and as the ARIA name. */
  title: string;
  /** Single-key shortcut, uppercase for display, lowercase in the map. */
  hotkey: string;
  /** One-sentence summary. First line of the tooltip body. */
  body: string;
  /**
   * Ordered how-to steps rendered as a numbered list under the summary.
   * Keep each step under ~60 characters so the 260 px tooltip wraps on
   * at most two lines.
   */
  steps: readonly string[];
  /** Optional short tips rendered as a bulleted list under the steps. */
  tips?: readonly string[];
  /** One-sentence "when to use" note rendered at the bottom of the tooltip. */
  whenToUse: string;
  /** Shape tools that expand into a long-press flyout (step 29). */
  hasFlyout?: boolean;
  /**
   * Ordered variants for shape tools that host a long-press flyout.
   * The first entry is the default. Non-flyout tools omit this field.
   */
  variants?: readonly ToolVariant[];
}

export interface ToolVariant {
  /** Stable id, e.g. "rectangle.rounded". */
  id: string;
  /** Short label rendered in the flyout row. */
  label: string;
  /** One-line description rendered under the label. */
  description: string;
}

export const TOOL_TOOLTIPS: Record<ToolId, ToolTooltip> = {
  select: {
    title: "Select",
    hotkey: "v",
    body: "Pick, move, resize, and rotate existing ROIs.",
    steps: [
      "Click an ROI on the canvas to select it.",
      "Drag the body to move, drag a handle to resize.",
      "Drag the top handle to rotate around the center.",
    ],
    tips: [
      "Hold Shift to constrain aspect ratio.",
      "Hold Alt to resize from the center.",
      "Esc clears the current selection.",
    ],
    whenToUse: "Default tool for editing an ROI you already placed.",
  },
  rectangle: {
    title: "Rectangle",
    hotkey: "r",
    body: "Draw an axis-aligned rectangular ROI around a feature.",
    steps: [
      "Press and drag from one corner to the opposite corner.",
      "Release to commit the ROI at that position and size.",
    ],
    tips: [
      "Hold Shift while drawing to lock a perfect square.",
      "Long-press the tool to pick a rounded or filled variant.",
    ],
    whenToUse: "Bounding a label, print zone, or any rectangular part.",
    hasFlyout: true,
    variants: [
      {
        id: "rectangle.sharp",
        label: "Sharp corners",
        description: "Standard axis-aligned rectangle.",
      },
      {
        id: "rectangle.rounded",
        label: "Rounded corners",
        description: "4 px corner radius for softer bounds.",
      },
      {
        id: "rectangle.filled",
        label: "Filled",
        description: "Semi-opaque fill for mask ROIs.",
      },
    ],
  },
  circle: {
    title: "Circle",
    hotkey: "c",
    body: "Draw a circular ROI centered on a feature.",
    steps: [
      "Press and drag outward from the target center.",
      "Release when the outline covers the feature.",
    ],
    tips: [
      "Hold Shift while resizing to preserve a true circle.",
      "Long-press for the ellipse variant.",
    ],
    whenToUse: "Round parts such as caps, holes, and dial faces.",
    hasFlyout: true,
    variants: [
      {
        id: "circle.circle",
        label: "Circle",
        description: "True circle, radius from drag distance.",
      },
      {
        id: "circle.ellipse",
        label: "Ellipse",
        description: "Free major/minor axes.",
      },
    ],
  },
  polygon: {
    title: "Polygon",
    hotkey: "p",
    body: "Trace an irregular ROI with a chain of vertices.",
    steps: [
      "Click on the canvas to place each vertex.",
      "Double-click, press Enter, or click the first vertex to close.",
    ],
    tips: [
      "Press Esc to cancel the in-progress polygon.",
      "Long-press for the free-hand lasso variant.",
    ],
    whenToUse: "Non-convex parts that a rectangle or circle cannot cover.",
    hasFlyout: true,
    variants: [
      {
        id: "polygon.polygon",
        label: "Polygon",
        description: "Straight-edge vertex chain.",
      },
      {
        id: "polygon.freehand",
        label: "Freehand",
        description: "Sample points continuously while dragging.",
      },
      {
        id: "polygon.lasso",
        label: "Lasso",
        description: "Freehand that auto-closes on release.",
      },
    ],
  },
  textTools: {
    title: "Text tools",
    hotkey: "t",
    body: "Grouped OCR, annotation, and expression tools in one compact flyout.",
    steps: [
      "Click to activate the last text tool variant.",
      "Long-press to choose OCR, Text, or Math.",
    ],
    tips: [
      "Use OCR for printed codes and lot numbers.",
      "Use Text for operator-only annotations.",
      "Use Math for derived measurements.",
    ],
    whenToUse: "Text-like tools that should not consume separate rail slots.",
    hasFlyout: true,
    variants: [
      {
        id: "textTools.ocr",
        label: "OCR",
        description: "Read printed characters inside a bounded region.",
      },
      {
        id: "textTools.text",
        label: "Text",
        description: "Place a static operator annotation.",
      },
      {
        id: "textTools.math",
        label: "Math",
        description: "Combine measurements with an expression.",
      },
    ],
  },
};

export const TOOL_ORDER: readonly ToolId[] = [
  ToolIdType.Select,
  ToolIdType.Rectangle,
  ToolIdType.Circle,
  ToolIdType.Polygon,
  ToolIdType.Texttools,
];
