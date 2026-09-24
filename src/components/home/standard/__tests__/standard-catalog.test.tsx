// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import React, { type ReactNode } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, className }: { to: string; children: ReactNode; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useRouterState: () => "/",
}));
import {
  CatalogCategoryIdType,
  CATALOG_CATEGORIES,
  CATALOG_TOOLS,
  getCategoryById,
  getToolsForCategory,
  getDefaultToolForCategory,
  getToolById,
} from "../catalog-data";
import { StandardCategoryGrid } from "../StandardCategoryGrid";
import { StandardToolGrid } from "../StandardToolGrid";
import { StandardToolDetailPanel } from "../StandardToolDetailPanel";

describe("Standard Tool Catalog Data", () => {
  afterEach(() => cleanup());
  it("defines all 8 standard industrial categories", () => {
    expect(CATALOG_CATEGORIES.length).toBe(8);
    const categoryIds = CATALOG_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toContain(CatalogCategoryIdType.PresenceAbsence);
    expect(categoryIds).toContain(CatalogCategoryIdType.FlawDetection);
    expect(categoryIds).toContain(CatalogCategoryIdType.Alignment);
    expect(categoryIds).toContain(CatalogCategoryIdType.MeasurementCount);
    expect(categoryIds).toContain(CatalogCategoryIdType.IdOcr);
    expect(categoryIds).toContain(CatalogCategoryIdType.PositionAdjustment);
    expect(categoryIds).toContain(CatalogCategoryIdType.MathematicalOperations);
    expect(categoryIds).toContain(CatalogCategoryIdType.FunctionList);
  });

  it("contains all 16 inspection tools and dedicated setup surfaces", () => {
    expect(CATALOG_TOOLS.length).toBeGreaterThanOrEqual(16);
    const codes = CATALOG_TOOLS.map((t) => t.displayCode);
    expect(codes).toContain("T101"); // Area
    expect(codes).toContain("T102"); // Pattern Match
    expect(codes).toContain("T103"); // ShapeTrax3
    expect(codes).toContain("T104"); // Edge Position
    expect(codes).toContain("T105"); // Edge Width
    expect(codes).toContain("T108"); // Defect
    expect(codes).toContain("T114"); // OCR2
    expect(codes).toContain("T115"); // Code Reader
    expect(codes).toContain("T116"); // Greyscale Pattern Matching
    expect(codes).toContain("S201"); // ROI Setup
  });

  it("returns all tools when category is FunctionList", () => {
    const allTools = getToolsForCategory(CatalogCategoryIdType.FunctionList);
    expect(allTools.length).toBe(CATALOG_TOOLS.length);
  });

  it("filters tools by category accurately", () => {
    const flawTools = getToolsForCategory(CatalogCategoryIdType.FlawDetection);
    expect(flawTools.length).toBeGreaterThan(0);
    expect(flawTools.every((t) => t.category === CatalogCategoryIdType.FlawDetection)).toBe(true);
  });

  it("identifies preferred tools for categories", () => {
    const prefPresence = getDefaultToolForCategory(CatalogCategoryIdType.PresenceAbsence);
    expect(prefPresence?.isPreferred).toBe(true);
    const prefFlaw = getDefaultToolForCategory(CatalogCategoryIdType.FlawDetection);
    expect(prefFlaw?.isPreferred).toBe(true);
  });
});

describe("StandardCategoryGrid Component", () => {
  afterEach(() => cleanup());
  it("renders all category buttons and highlights the active one", () => {
    const onSelect = vi.fn();
    render(
      <StandardCategoryGrid
        activeCategory={CatalogCategoryIdType.FlawDetection}
        onSelectCategory={onSelect}
      />,
    );

    expect(screen.getByText("Flaw Detection")).toBeDefined();
    expect(screen.getByText("Presence / Absence")).toBeDefined();
    expect(screen.getByText("Alignment")).toBeDefined();
    expect(screen.getByText("Function List")).toBeDefined();

    fireEvent.click(screen.getByText("Alignment"));
    expect(onSelect).toHaveBeenCalledWith(CatalogCategoryIdType.Alignment);
  });
});

describe("StandardToolGrid Component", () => {
  afterEach(() => cleanup());
  it("renders tool tiles and filters with search input", () => {
    const category = getCategoryById(CatalogCategoryIdType.PresenceAbsence)!;
    const tools = getToolsForCategory(CatalogCategoryIdType.PresenceAbsence);
    const onSelectTool = vi.fn();
    const onSearchChange = vi.fn();

    const { rerender } = render(
      <StandardToolGrid
        category={category}
        tools={tools}
        selectedToolId="tool-area"
        onSelectTool={onSelectTool}
        searchQuery=""
        onSearchChange={onSearchChange}
      />,
    );

    expect(screen.getByText("Area")).toBeDefined();
    expect(screen.getByText("Pattern Match (Shading)")).toBeDefined();
    expect(screen.getByText("Greyscale Pattern Matching")).toBeDefined();

    // Click tool
    fireEvent.click(screen.getByText("Pattern Match (Shading)"));
    expect(onSelectTool).toHaveBeenCalledWith("tool-pattern-presence");

    // Search filter
    rerender(
      <StandardToolGrid
        category={category}
        tools={tools}
        selectedToolId="tool-area"
        onSelectTool={onSelectTool}
        searchQuery="Area"
        onSearchChange={onSearchChange}
      />,
    );

    expect(screen.getByText("Area")).toBeDefined();
  });

  it("includes Greyscale Pattern Matching in Presence / Absence", () => {
    const tools = getToolsForCategory(CatalogCategoryIdType.PresenceAbsence);
    const tool = tools.find((item) => item.id === "tool-greyscale-pattern-matching");

    expect(tool).toBeDefined();
    expect(tool?.displayCode).toBe("T116");
    expect(tool?.targetRoute).toBe("/setup/white-boxes");
  });
  it("includes Greyscle simulation in Presence / Absence", () => {
    const tools = getToolsForCategory(CatalogCategoryIdType.PresenceAbsence);
    const tool = tools.find((item) => item.id === "tool-greyscale-simulation");

    expect(tool).toBeDefined();
    expect(tool?.name).toBe("Greyscle simulation");
    expect(tool?.displayCode).toBe("T119");
    expect(tool?.targetRoute).toBe("/setup/rules");
  });

  it("includes Defect Matching in Flaw Detection", () => {
    const tools = getToolsForCategory(CatalogCategoryIdType.FlawDetection);
    const tool = tools.find((item) => item.id === "tool-defect-matching");

    expect(tool).toBeDefined();
    expect(tool?.displayCode).toBe("T118");
    expect(tool?.targetRoute).toBe("/setup/defect-matching");
  });
});

describe("StandardToolDetailPanel Component", () => {
  afterEach(() => cleanup());
  it("renders tool descriptions, detection parameters, and judgment criteria", () => {
    const tool = getToolById("tool-area")!;
    const category = getCategoryById(CatalogCategoryIdType.PresenceAbsence)!;
    const onLaunch = vi.fn();
    const onCreateRule = vi.fn();

    render(
      <StandardToolDetailPanel
        tool={tool}
        category={category}
        connectedRules={[]}
        onLaunchTool={onLaunch}
        onCreateRuleWithTool={onCreateRule}
      />,
    );

    expect(screen.getByText("Tool ID: T101")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Area" })).toBeDefined();
    expect(screen.getByText("B/W Specific Area")).toBeDefined();
    expect(screen.getByText("Binarization Threshold")).toBeDefined();
    expect(screen.getByText("Measured Pixel Area")).toBeDefined();

    fireEvent.click(screen.getByText("Configure / Launch Tool"));
    expect(onLaunch).toHaveBeenCalledWith(tool);
  });
});

describe("Representative Tool Type & Dispatcher Mapping Verification", () => {
  afterEach(() => cleanup());

  const representativeTools = [
    { id: "tool-area", expectedMatcher: "area", toolType: "Area" },
    {
      id: "tool-pattern-presence",
      expectedMatcher: "pattern",
      toolType: "Pattern Match (Shading)",
    },
    { id: "tool-shapetrax3", expectedMatcher: "shape", toolType: "ShapeTrax3" },
    { id: "tool-edge-width", expectedMatcher: "width", toolType: "Edge Width" },
    { id: "tool-defect", expectedMatcher: "defect", toolType: "Defect Detection" },
    { id: "tool-ocr2", expectedMatcher: "ocr", toolType: "OCR2 Character Recognition" },
    { id: "tool-code-reader", expectedMatcher: "code", toolType: "1D / 2D Code Reader" },
  ];

  it.each(representativeTools)(
    "maps $id tool with toolType '$toolType' and matcher '$expectedMatcher'",
    ({ id, expectedMatcher, toolType }) => {
      const tool = getToolById(id);
      expect(tool).toBeDefined();
      expect(tool!.name).toBe(toolType);
      expect(tool!.ruleMatcher).toBe(expectedMatcher);
      expect(tool!.targetRoute).toBe("/setup/rules");
    },
  );
});
