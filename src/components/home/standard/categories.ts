import {
  LayoutGrid,
  Search,
  Crosshair,
  Binary,
  ScanText,
  Sliders,
  Calculator,
  ListFilter,
} from "lucide-react";
import { CatalogCategoryIdType, type CatalogCategory } from "./types";

export const CATALOG_CATEGORIES: readonly CatalogCategory[] = [
  {
    id: CatalogCategoryIdType.PresenceAbsence,
    label: "Presence / Absence",
    sublabel: "Missing parts, component check",
    icon: LayoutGrid,
    description:
      "Inspects target objects for presence or absence, missing components, or type-variation distinction across defined inspection regions.",
    promptQuestion: "What feature is useful for presence / absence detection?",
  },
  {
    id: CatalogCategoryIdType.FlawDetection,
    label: "Flaw Detection",
    sublabel: "Defect, dirt, burr, crack, stain",
    icon: Search,
    description:
      "Inspects surface appearance for defects, scratches, dirt, burrs, cracks, or stains against reference backgrounds.",
    promptQuestion: "What feature is useful for detecting the flaw?",
  },
  {
    id: CatalogCategoryIdType.Alignment,
    label: "Alignment",
    sublabel: "Positioning, datum, orientation",
    icon: Crosshair,
    description:
      "Calculates target position coordinates (X, Y, Theta), origin alignment, and positional deviation from reference templates.",
    promptQuestion: "Which alignment method fits the target workpiece?",
  },
  {
    id: CatalogCategoryIdType.MeasurementCount,
    label: "Count & Measure",
    sublabel: "Width, pitch, caliper, quantity",
    icon: Binary,
    description:
      "Performs precision 1D/2D dimensional measurements including edge widths, pin pitches, gap spacing, and feature count.",
    promptQuestion: "What dimension or feature count needs to be measured?",
  },
  {
    id: CatalogCategoryIdType.IdOcr,
    label: "ID & OCR / OCV",
    sublabel: "1D/2D Barcode, text verification",
    icon: ScanText,
    description:
      "Decodes 1D barcodes and 2D DataMatrix/QR codes, extracts printed text characters via OCR, and verifies character strings.",
    promptQuestion: "What code format or character string needs reading?",
  },
  {
    id: CatalogCategoryIdType.PositionAdjustment,
    label: "Position & Setup",
    sublabel: "ROI geometry, masks, reference, camera",
    icon: Sliders,
    description:
      "Configures inspection regions of interest (ROI), exclusion masks, golden reference images, sensor exposure, and lighting.",
    promptQuestion: "Which vision hardware or region parameter do you want to adjust?",
  },
  {
    id: CatalogCategoryIdType.MathematicalOperations,
    label: "Math & Logic",
    sublabel: "Custom JS functions, chain events",
    icon: Calculator,
    description:
      "Executes user-authored mathematical formulas, logic gating expressions, and automated event sequences between inspection rules.",
    promptQuestion: "Which calculation or event logic do you want to configure?",
  },
  {
    id: CatalogCategoryIdType.FunctionList,
    label: "Function List",
    sublabel: "All 16 machine-vision tools",
    icon: ListFilter,
    description:
      "Direct catalog of all available machine-vision inspection algorithms with one-click parameter setup.",
    promptQuestion: "Select any inspection tool from the complete system inventory:",
  },
] as const;
