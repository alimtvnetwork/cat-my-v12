// Extended per-tool guides shown by ToolGuideDialog when the user clicks
// "View full guide" inside a tooltip. Kept as data (no JSX) so the modal
// stays a pure presenter and unit tests can assert every tool has one
// non-empty guide with the required sections.

import type { ToolId } from "./toolTooltipMap";

export interface ToolGuideSection {
  heading: string;
  paragraphs?: readonly string[];
  bullets?: readonly string[];
}

export interface ToolGuide {
  /** Short intro sentence rendered under the dialog title. */
  summary: string;
  /** Ordered sections rendered as h3 + prose + optional bullets. */
  sections: readonly ToolGuideSection[];
}

export const TOOL_GUIDES: Record<ToolId, ToolGuide> = {
  select: {
    summary:
      "The Select tool is the default editor mode for picking, moving, resizing, and rotating ROIs on the reference image.",
    sections: [
      {
        heading: "Overview",
        paragraphs: [
          "Select does not create new geometry. It edits ROIs that were already placed by a shape or measurement tool.",
          "It respects the same modifier keys across every shape, so the muscle memory transfers between rectangle, circle, and polygon.",
        ],
      },
      {
        heading: "Modifier keys",
        bullets: [
          "Shift while resizing constrains aspect ratio (a square stays square, a circle stays a circle).",
          "Alt while resizing anchors the opposite side, so the ROI grows or shrinks around its center.",
          "Escape clears the current selection without deleting the ROI.",
        ],
      },
      {
        heading: "Rotation",
        paragraphs: [
          "Every shape exposes a top handle. Drag it to rotate around the ROI center. Hold Shift to snap to 15 degree increments.",
        ],
      },
      {
        heading: "When to use",
        paragraphs: [
          "Any time you already placed an ROI and need to refine its position, size, or angle without leaving keyboard focus in the canvas.",
        ],
      },
    ],
  },
  rectangle: {
    summary:
      "The Rectangle tool draws axis-aligned rectangular ROIs. It is the workhorse for print zones, labels, and any part with a bounding box.",
    sections: [
      {
        heading: "Drawing",
        paragraphs: [
          "Press and drag from one corner to the opposite corner. Release to commit the ROI. Long-press the tool tile (or right-click it) to pick a variant.",
        ],
      },
      {
        heading: "Variants",
        bullets: [
          "Sharp corners: standard axis-aligned rectangle.",
          "Rounded corners: 4 px corner radius for softer bounds.",
          "Filled: semi-opaque fill for mask ROIs.",
        ],
      },
      {
        heading: "Tips",
        bullets: [
          "Hold Shift while drawing to lock a perfect square.",
          "Shift+M cycles variants once the tool is active.",
          "Use Alt-resize afterwards to grow the ROI around its center.",
        ],
      },
      {
        heading: "When to use",
        paragraphs: [
          "Bounding a printed label, a barcode zone, a serial number strip, or any rectangular part.",
        ],
      },
    ],
  },
  circle: {
    summary: "The Circle tool draws circular or elliptical ROIs centered on a feature.",
    sections: [
      {
        heading: "Drawing",
        paragraphs: [
          "Press and drag outward from the target center. Release when the outline covers the feature.",
        ],
      },
      {
        heading: "Variants",
        bullets: [
          "Circle: true circle, radius derived from drag distance.",
          "Ellipse: free major and minor axes.",
        ],
      },
      {
        heading: "Tips",
        bullets: [
          "Hold Shift while resizing an ellipse to snap back to a true circle.",
          "Circular ROIs match dial faces, caps, and drilled holes better than a bounding rectangle.",
        ],
      },
      {
        heading: "When to use",
        paragraphs: [
          "Round parts and features. Prefer a circle over a rectangle whenever the feature itself is round.",
        ],
      },
    ],
  },
  polygon: {
    summary:
      "The Polygon tool traces irregular ROIs with a chain of vertices or a freehand stroke.",
    sections: [
      {
        heading: "Drawing",
        paragraphs: [
          "Click on the canvas to place each vertex. Double-click, press Enter, or click the first vertex to close the polygon.",
          "For freehand variants, press and drag to sample points continuously; release closes the shape.",
        ],
      },
      {
        heading: "Variants",
        bullets: [
          "Polygon: straight-edge vertex chain.",
          "Freehand: sample points continuously while dragging.",
          "Lasso: freehand that auto-closes on release.",
        ],
      },
      {
        heading: "Tips",
        bullets: [
          "Press Escape to cancel an in-progress polygon.",
          "Grab a vertex with the Select tool to fine-tune the outline later.",
        ],
      },
      {
        heading: "When to use",
        paragraphs: [
          "Non-convex parts (gaskets, brackets, custom labels) that a rectangle or circle cannot cover cleanly.",
        ],
      },
    ],
  },
  textTools: {
    summary:
      "Text tools groups OCR, operator annotations, and math expressions behind one compact long-press flyout.",
    sections: [
      {
        heading: "Flyout choices",
        bullets: [
          "OCR: read printed characters inside a bounded region and match them against an expected pattern.",
          "Text: place static annotations on the reference image for operators.",
          "Math: combine other measurements with an expression rule to produce derived metrics.",
        ],
      },
      {
        heading: "OCR setup",
        paragraphs: [
          "Draw a rectangle around the text you want to read. In the Properties panel, set the expected pattern (literal, regex, or template).",
        ],
      },
      {
        heading: "Text setup",
        paragraphs: [
          "Click on the canvas at the label anchor point, then type the label text in the Properties panel. Text overlays are decoration only and never affect Run results.",
        ],
      },
      {
        heading: "Math setup",
        paragraphs: [
          "Add the input rules whose outputs you want to combine, then write the expression in the Properties panel, for example A - B or (A + B) / 2.",
        ],
        bullets: [
          "Use rule ids, not display names, in the expression.",
          "Wrap sub-expressions in parentheses whenever operator precedence is unclear.",
          "Only numeric outputs are legal inputs; boolean and enum outputs must be mapped first.",
        ],
      },
      {
        heading: "Best practices",
        bullets: [
          "Leave 2 to 3 px of padding around OCR glyphs.",
          "For rotated text, rotate the ROI to align with the baseline.",
          "Use long-press or right-click to swap variants without widening the rail.",
        ],
      },
      {
        heading: "When to use",
        paragraphs: [
          "Serial numbers, lot codes, setup labels, offsets, gaps, ratios, and other text-like checks that should live in a single compact tool slot.",
        ],
      },
    ],
  },
};
