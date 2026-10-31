import { Geometry, ShapeType } from "./shapes";

export enum ImageSourceType {
  Camera = "Camera",
  File = "File",
}

export enum RenderModeType {
  Normal = "Normal",
  Enhanced = "Enhanced",
}

export enum DetectionColorType {
  White = "White",
  Black = "Black",
}

export interface MaskLayer {
  shape: ShapeType;
  geometry: Geometry;
}

export interface PatternSearchSettings {
  id: string; // e.g. "T106"
  name: string; // "Pattern Search"
  toolType?: StandardToolType; // explicit tool type; legacy rules are migrated at intake
  referenceImage: { set: number; index: number }; // shown as "1 - 000"
  searchRegion: { shape: ShapeType; geometry: Geometry };
  patternRegion: { shape: ShapeType; geometry: Geometry };
  masks: MaskLayer[]; // Standard UI: exactly 4 slots; Modern UI: unbounded
  detection: {
    angleRangeDeg: number; // "+/- 030"
    detectionCount: number; // "01"
    searchSensitivity: number; // slider, labelled Normal at midpoint
    accuracy: number; // slider, labelled Normal at midpoint
    minMatchPercent: number; // "40"
    // Single pattern-match threshold key (spec 02 §3.2). Optional so
    // rules saved before this change still typecheck; resolve it only
    // through migrateDetectionThresholds, never by reading legacy keys.
    greyscaleThreshold?: number; // binary threshold, 0-255, default 170
    lumaTolerance: number; // per-box mean-luma deviation allowed, 0-255, default 22
    searchMarginPx: number; // translation search window half-size in px, default 8
    searchStepPx: number; // translation search step in px, default 1
  };
  imageRegion: {
    // purpose TBD
    enabled: boolean;
    referenceTool: string | null;
    detectionColor: DetectionColorType;
  };
  view: { source: ImageSourceType; rendering: RenderModeType; zoom: number };
  imageRef?: string;
  params?: Record<string, unknown>;
}

export const createDefaultPatternSearchSettings = (id: string): PatternSearchSettings => ({
  id,
  name: "Pattern Search",
  toolType: StandardToolType.PatternSearch,
  referenceImage: { set: 1, index: 0 },
  searchRegion: {
    shape: ShapeType.Rectangle,
    geometry: { x: 10, y: 10, width: 200, height: 200 },
  },
  patternRegion: {
    shape: ShapeType.Rectangle,
    geometry: { x: 50, y: 50, width: 100, height: 100 },
  },
  masks: [
    { shape: ShapeType.None, geometry: {} },
    { shape: ShapeType.None, geometry: {} },
    { shape: ShapeType.None, geometry: {} },
    { shape: ShapeType.None, geometry: {} },
  ],
  detection: {
    angleRangeDeg: 30,
    detectionCount: 1,
    searchSensitivity: 50,
    accuracy: 50,
    minMatchPercent: 40,
    greyscaleThreshold: 170,
    lumaTolerance: 22,
    searchMarginPx: 8,
    searchStepPx: 1,
  },
  imageRegion: {
    enabled: false,
    referenceTool: null,
    detectionColor: DetectionColorType.White,
  },
  view: {
    source: ImageSourceType.Camera,
    rendering: RenderModeType.Normal,
    zoom: 40,
  },
  params: {},
});

export interface ResizeHandles {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
  topLeft: boolean;
  topRight: boolean;
  bottomLeft: boolean;
  bottomRight: boolean;
}

export interface PatternShape {
  id: ShapeType;
  label: string;
  icon: string;
  defaultGeometry: Geometry;
  handles: Partial<ResizeHandles>;
  serialize: (geom: Geometry) => string;
  deserialize: (data: string) => Geometry;
}

export interface MaskShape extends PatternShape {}

export const ShapeCatalog: Record<ShapeType, PatternShape> = {
  [ShapeType.Rectangle]: {
    id: ShapeType.Rectangle,
    label: "Rectangle",
    icon: "Square",
    defaultGeometry: { x: 50, y: 50, width: 100, height: 100 },
    handles: {
      top: true,
      right: true,
      bottom: true,
      left: true,
      topLeft: true,
      topRight: true,
      bottomLeft: true,
      bottomRight: true,
    },
    serialize: (geom) => JSON.stringify(geom),
    deserialize: (data) => JSON.parse(data),
  },
  [ShapeType.Circle]: {
    id: ShapeType.Circle,
    label: "Circle",
    icon: "Circle",
    defaultGeometry: { x: 100, y: 100, radius: 50 },
    handles: { top: true, right: true, bottom: true, left: true },
    serialize: (geom) => JSON.stringify(geom),
    deserialize: (data) => JSON.parse(data),
  },
  [ShapeType.Ellipse]: {
    id: ShapeType.Ellipse,
    label: "Ellipse",
    icon: "Circle",
    defaultGeometry: { x: 100, y: 100, radius: 50 },
    handles: { top: true, right: true, bottom: true, left: true },
    serialize: (geom) => JSON.stringify(geom),
    deserialize: (data) => JSON.parse(data),
  },
  [ShapeType.Polygon]: {
    id: ShapeType.Polygon,
    label: "Polygon",
    icon: "Hexagon",
    defaultGeometry: {
      points: [
        { x: 50, y: 50 },
        { x: 150, y: 50 },
        { x: 150, y: 150 },
        { x: 50, y: 150 },
      ],
    },
    handles: {},
    serialize: (geom) => JSON.stringify(geom),
    deserialize: (data) => JSON.parse(data),
  },
  [ShapeType.None]: {
    id: ShapeType.None,
    label: "None",
    icon: "Minus",
    defaultGeometry: {},
    handles: {},
    serialize: () => "",
    deserialize: () => ({}),
  },
};

export const PatternShapes = [
  ShapeCatalog[ShapeType.Rectangle],
  ShapeCatalog[ShapeType.Circle],
  ShapeCatalog[ShapeType.Ellipse],
  ShapeCatalog[ShapeType.Polygon],
];

export const MaskShapes: MaskShape[] = [
  ShapeCatalog[ShapeType.None],
  ShapeCatalog[ShapeType.Rectangle],
  ShapeCatalog[ShapeType.Circle],
  ShapeCatalog[ShapeType.Ellipse],
  ShapeCatalog[ShapeType.Polygon],
];

export interface DetectionThresholds {
  greyscaleThreshold: number;
  lumaTolerance: number;
}

function clampThreshold(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Single resolution point for pattern-match thresholds (spec 02 §3.2).
 *
 * Priority for greyscaleThreshold: detection.greyscaleThreshold (the
 * canonical key) wins, then the legacy keys in the order the old
 * 6-key chain used (pattern-tool keys first, simulation key next,
 * nested params last), then the shared default 170. If more than one
 * legacy key carries a distinct value, the conflict is logged and the
 * pattern-tool value wins; values are never averaged.
 *
 * lumaTolerance has no legacy saved key: the old matcher hardcoded 22,
 * so the canonical key wins and 22 is the default. params.lumaTolerance
 * is deliberately NOT read here: it belongs to the workpiece analyzer's
 * own measurement (default 32), not to pattern matching.
 *
 * Callers must resolve through this function at load and write only
 * detection.greyscaleThreshold / detection.lumaTolerance on save.
 * Legacy keys are read here and nowhere else in the pattern path.
 */
export function migrateDetectionThresholds(settings: unknown): DetectionThresholds {
  const input = (settings ?? {}) as Record<string, any>;
  const detection = (input.detection ?? {}) as Record<string, any>;
  const params = (input.params ?? {}) as Record<string, any>;

  const candidates: Array<{ source: string; value: unknown }> = [
    { source: "detection.greyscaleThreshold", value: detection.greyscaleThreshold },
    { source: "threshold", value: input.threshold },
    { source: "WhiteThreshold", value: input.WhiteThreshold },
    { source: "whiteThreshold", value: input.whiteThreshold },
    { source: "greyscaleLevel", value: input.greyscaleLevel },
    { source: "params.threshold", value: params.threshold },
    { source: "params.WhiteThreshold", value: params.WhiteThreshold },
  ];

  const defined = candidates.filter((c) => typeof c.value === "number");
  const distinct = [...new Set(defined.map((c) => c.value as number))];

  if (distinct.length > 1) {
    console.warn(
      "[migrateDetectionThresholds] conflicting legacy threshold values; keeping the first (pattern-tool) value",
      defined.map((c) => `${c.source}=${c.value}`).join(", "),
    );
  }

  const first = defined[0];
  const greyscaleThreshold = first !== undefined ? clampThreshold(first.value as number) : 170;
  const lumaTolerance =
    typeof detection.lumaTolerance === "number" ? clampThreshold(detection.lumaTolerance) : 22;

  return { greyscaleThreshold, lumaTolerance };
}

export enum StandardToolType {
  PatternSearch = "pattern_search",
  GreyscalePattern = "pattern_match",
  GreyscaleSimulation = "greyscale_simulation",
  Pin1Config = "pin1_config",
  DefectMatching = "defect_match",
  Area = "area",
  ShapeTrax3 = "shape_trax3",
  EdgePosition = "edge_position",
  EdgeWidth = "edge_width",
  EdgePitch = "edge_pitch",
  EdgePairs = "edge_pairs",
  Defect = "defect",
  GrayscaleBlob = "grayscale_blob",
  Blob = "blob",
  ProfilePosition = "profile_position",
  ProfileWidth = "profile_width",
  Intensity = "intensity",
  Ocr2 = "ocr2",
  CodeReader = "code_reader",
}

export function isStandardToolType(value: unknown): value is StandardToolType {
  if (typeof value !== "string") {
    return false;
  }

  return (Object.values(StandardToolType) as string[]).includes(value);
}

export interface LegacyToolTypeInput {
  toolType?: unknown;
  type?: unknown;
  name?: unknown;
  isDefectReject?: unknown;
  constellation?: unknown;
  pin1Config?: unknown;
}

function asLowerString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

function hasSubstring(value: string, fragment: string): boolean {
  return value.length > 0 && value.includes(fragment);
}

// Migration for legacy rules without an explicit StandardToolType.
// Reproduces the retired dispatcher's name-sniffing chain order exactly
// (defect-match, simulation, pattern, pin1, area, shape, profile-width,
// profile-position, pitch, pairs, width, edge-position, defect,
// pattern-again, gray-blob, blob, intensity, ocr, code) so a legacy rule
// classifies exactly as it rendered before. Returns null when nothing
// matches; the dispatcher then applies its default/unknown logic.
// Deliberately absent: the misspelled simulation keyword from the old
// chain (zero hits in production code is required) and the 31-box
// keyword (no real 31-box data exists).
export function migrateLegacyToolType(input: LegacyToolTypeInput): StandardToolType | null {
  const toolTypeValue = asLowerString(input.toolType);
  const typeValue = asLowerString(input.type);
  const nameValue = asLowerString(input.name);
  const isDefectReject = input.isDefectReject === true;
  const hasConstellation = Array.isArray(input.constellation)
    ? input.constellation.length > 0
    : input.constellation === true;
  const hasPin1Config =
    input.pin1Config !== undefined && input.pin1Config !== null && input.pin1Config !== false;

  for (const candidate of [input.toolType, input.type]) {
    if (isStandardToolType(candidate)) {
      return candidate;
    }
  }

  if (toolTypeValue === "defect matching" || typeValue === "defect matching") {
    return StandardToolType.DefectMatching;
  }

  if (toolTypeValue === "greyscale pattern matching" || typeValue === "greyscale pattern matching") {
    return StandardToolType.GreyscalePattern;
  }

  if (toolTypeValue === "greyscale simulation" || typeValue === "greyscale simulation") {
    return StandardToolType.GreyscaleSimulation;
  }

  // Primary string: first non-empty of toolType, name, type, matching the
  // old chain's `toolType || ruleName || settings.toolType || settings.type`.
  const primary = toolTypeValue || nameValue || typeValue;

  if (
    hasSubstring(primary, "defect match") ||
    hasSubstring(primary, "flaw match") ||
    typeValue === "defect_match" ||
    isDefectReject
  ) {
    return StandardToolType.DefectMatching;
  }

  if (
    hasSubstring(primary, "greyscale simulation") ||
    hasSubstring(primary, "carrier tape") ||
    hasSubstring(primary, "carrier-tape") ||
    typeValue === "greyscale_simulation"
  ) {
    return StandardToolType.GreyscaleSimulation;
  }

  const isPatternName =
    hasSubstring(primary, "pattern match") ||
    hasSubstring(primary, "greyscale pattern") ||
    hasSubstring(primary, "grayscale pattern") ||
    hasSubstring(primary, "white box") ||
    hasSubstring(primary, "24 box") ||
    hasSubstring(primary, "2-bit") ||
    hasSubstring(primary, "light pattern") ||
    typeValue === "pattern_match" ||
    hasConstellation;

  if (
    !hasSubstring(primary, "logo") &&
    !hasSubstring(primary, "defect") &&
    !hasSubstring(primary, "flaw") &&
    !isDefectReject &&
    isPatternName
  ) {
    return StandardToolType.GreyscalePattern;
  }

  if (
    hasSubstring(primary, "pin1") ||
    hasSubstring(primary, "pin 1") ||
    hasSubstring(primary, "pin-1") ||
    typeValue === "pin1_config" ||
    hasPin1Config
  ) {
    return StandardToolType.Pin1Config;
  }

  if (hasSubstring(primary, "area")) {
    return StandardToolType.Area;
  }

  if (
    hasSubstring(primary, "shape") ||
    hasSubstring(primary, "trax") ||
    hasSubstring(primary, "contour")
  ) {
    return StandardToolType.ShapeTrax3;
  }

  if (
    hasSubstring(primary, "profile") &&
    (hasSubstring(primary, "width") ||
      hasSubstring(primary, "caliper") ||
      hasSubstring(primary, "thickness"))
  ) {
    return StandardToolType.ProfileWidth;
  }

  if (hasSubstring(primary, "profile")) {
    return StandardToolType.ProfilePosition;
  }

  if (
    hasSubstring(primary, "pitch") ||
    hasSubstring(primary, "comb") ||
    hasSubstring(primary, "connector")
  ) {
    return StandardToolType.EdgePitch;
  }

  if (hasSubstring(primary, "pair")) {
    return StandardToolType.EdgePairs;
  }

  if (
    hasSubstring(primary, "width") ||
    hasSubstring(primary, "gap") ||
    hasSubstring(primary, "caliper")
  ) {
    return StandardToolType.EdgeWidth;
  }

  if (
    hasSubstring(primary, "edge") ||
    hasSubstring(primary, "position") ||
    hasSubstring(primary, "pin") ||
    hasSubstring(primary, "line")
  ) {
    return StandardToolType.EdgePosition;
  }

  if (
    hasSubstring(primary, "defect") ||
    hasSubstring(primary, "scratch") ||
    hasSubstring(primary, "flaw") ||
    hasSubstring(primary, "stain")
  ) {
    return StandardToolType.Defect;
  }

  if (
    hasSubstring(primary, "greyscale pattern") ||
    hasSubstring(primary, "grayscale pattern") ||
    hasSubstring(primary, "2-bit") ||
    hasSubstring(primary, "light pattern")
  ) {
    return StandardToolType.GreyscalePattern;
  }

  if (
    (hasSubstring(primary, "gray") || hasSubstring(primary, "grey")) &&
    (hasSubstring(primary, "blob") || hasSubstring(primary, "particle"))
  ) {
    return StandardToolType.GrayscaleBlob;
  }

  if (
    hasSubstring(primary, "blob") ||
    hasSubstring(primary, "particle") ||
    hasSubstring(primary, "count")
  ) {
    return StandardToolType.Blob;
  }

  if (
    hasSubstring(primary, "intensity") ||
    hasSubstring(primary, "brightness") ||
    hasSubstring(primary, "luminance") ||
    hasSubstring(primary, "mean")
  ) {
    return StandardToolType.Intensity;
  }

  if (
    hasSubstring(primary, "ocr") ||
    hasSubstring(primary, "text") ||
    hasSubstring(primary, "font") ||
    hasSubstring(primary, "char") ||
    hasSubstring(primary, "string")
  ) {
    return StandardToolType.Ocr2;
  }

  if (
    hasSubstring(primary, "code") ||
    hasSubstring(primary, "barcode") ||
    hasSubstring(primary, "qr") ||
    hasSubstring(primary, "matrix") ||
    hasSubstring(primary, "datamatrix") ||
    hasSubstring(primary, "1d")
  ) {
    return StandardToolType.CodeReader;
  }

  return null;
}

export interface DomainRegion {
  shape: ShapeType;
  geometry: Geometry;
}

function isValidShapeType(value: unknown): value is ShapeType {
  return (
    value === ShapeType.Rectangle ||
    value === ShapeType.Circle ||
    value === ShapeType.Ellipse ||
    value === ShapeType.None
  );
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return null;
  }

  return value;
}

function parseGeometryObject(input: Record<string, unknown>): Geometry | null {
  const x = asFiniteNumber(input.x);
  const y = asFiniteNumber(input.y);

  if (x === null || y === null) {
    return null;
  }

  const width = asFiniteNumber(input.width);
  const height = asFiniteNumber(input.height);

  if (width !== null && height !== null && width > 0 && height > 0) {
    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  const radius = asFiniteNumber(input.radius);

  if (radius !== null && radius > 0) {
    return { x: Math.round(x), y: Math.round(y), radius: Math.round(radius) };
  }

  return null;
}

// Single intake parser for region input. Accepts the domain form
// ({shape, geometry}), the legacy flat form ({x, y, width, height} or
// {x, y, radius}), and JSON strings of either (legacy searchRegionJson
// content). Returns null for anything else. This is the ONLY place that
// dual-parses; every other consumer reads and writes the domain form.
export function parseRegionInput(input: unknown): DomainRegion | null {
  if (input === null || input === undefined) {
    return null;
  }

  if (typeof input === "string") {
    try {
      return parseRegionInput(JSON.parse(input) as unknown);
    } catch {
      return null;
    }
  }

  if (typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const record = input as Record<string, unknown>;
  const shape = isValidShapeType(record.shape) ? record.shape : null;

  if (shape === ShapeType.None) {
    return { shape, geometry: {} };
  }

  if (
    record.geometry !== null &&
    typeof record.geometry === "object" &&
    !Array.isArray(record.geometry)
  ) {
    const geometry = parseGeometryObject(record.geometry as Record<string, unknown>);

    if (geometry === null) {
      return null;
    }

    if (shape !== null) {
      return { shape, geometry };
    }

    return {
      shape: "radius" in geometry ? ShapeType.Circle : ShapeType.Rectangle,
      geometry,
    };
  }

  const flatGeometry = parseGeometryObject(record);

  if (flatGeometry === null) {
    return null;
  }

  if (shape !== null) {
    return { shape, geometry: flatGeometry };
  }

  return {
    shape: "radius" in flatGeometry ? ShapeType.Circle : ShapeType.Rectangle,
    geometry: flatGeometry,
  };
}

// Parse a masks value: a domain MaskLayer[] array, or a legacy flat
// maskRegions array (each entry becomes a Rectangle domain layer).
// Invalid entries become None slots so slot count and order survive.
// Returns null when the input is not an array at all.
export function parseMasksInput(input: unknown): MaskLayer[] | null {
  if (!Array.isArray(input)) {
    return null;
  }

  return input.map((entry) => {
    const parsed = parseRegionInput(entry);

    if (parsed === null) {
      return { shape: ShapeType.None, geometry: {} };
    }

    return parsed;
  });
}

export interface MatcherSettings {
  lumaTolerance: number;
  minMatchPercent: number;
  searchMarginPx: number;
  searchStepPx: number;
}

function asClampedNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

// Single intake boundary for matcher settings. Reads the canonical
// detection.* keys, with legacy fallbacks for rules saved before the
// canonical keys existed (toleranceLuma, root minMatchPercent, marginPx
// as the legacy carrier of the search margin). No other production code
// reads those legacy keys. Bounds are implementation bounds, documented
// here: search window is capped so the translation search stays bounded.
// Conflicting canonical-vs-legacy values are logged once per distinct
// pair, so a per-render resolver never spams the console. The canonical
// detection.* value is always the one kept (pattern tool wins).
const loggedMatcherConflicts = new Set<string>();

function logMatcherConflict(key: string, kept: number, dropped: number): void {
  const id = `${key}:${kept}:${dropped}`;

  if (loggedMatcherConflicts.has(id)) {
    return;
  }

  loggedMatcherConflicts.add(id);
  console.info(
    `[pattern-search] matcher setting conflict on ${key}: kept canonical ${kept}, dropped legacy ${dropped}`,
  );
}

export function resolveMatcherSettings(settings: unknown): MatcherSettings {
  const record =
    settings !== null && typeof settings === "object" && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};
  const detection =
    record.detection !== null &&
    typeof record.detection === "object" &&
    !Array.isArray(record.detection)
      ? (record.detection as Record<string, unknown>)
      : {};

  const pairs: Array<[string, unknown, unknown]> = [
    ["minMatchPercent", detection.minMatchPercent, record.minMatchPercent],
    ["searchMarginPx", detection.searchMarginPx, record.marginPx],
  ];

  for (const [key, canonical, legacy] of pairs) {
    const kept = asFiniteNumber(canonical);
    const dropped = asFiniteNumber(legacy);

    if (kept !== null && dropped !== null && kept !== dropped) {
      logMatcherConflict(key, kept, dropped);
    }
  }

  return {
    // Decision 31-Oct-26 (spec 02 section 3.2 amendment): record.toleranceLuma is dead.
    // The old matcher hardcoded 22 at every call site and never read this key from a
    // saved record, so no saved value ever affected behavior. Absence of
    // detection.lumaTolerance therefore means the default 22. Do not reintroduce it.
    lumaTolerance: asClampedNumber(detection.lumaTolerance, 22, 0, 255),
    minMatchPercent: asClampedNumber(
      detection.minMatchPercent ?? record.minMatchPercent,
      40,
      0,
      100,
    ),
    searchMarginPx: asClampedNumber(detection.searchMarginPx ?? record.marginPx, 8, 0, 64),
    searchStepPx: asClampedNumber(detection.searchStepPx, 1, 1, 16),
  };
}

export interface FlatRegionInput {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Convert a flat rectangle to the domain form, preserving the previous
// shape when it is a real shape (so a write-back never silently turns a
// shaped region into a rectangle). None never survives as a flat region.
export function domainRegionFromFlat(params: {
  flat: FlatRegionInput;
  prevShape?: unknown;
}): DomainRegion {
  const shape =
    isValidShapeType(params.prevShape) && params.prevShape !== ShapeType.None
      ? params.prevShape
      : ShapeType.Rectangle;

  return {
    shape,
    geometry: {
      x: Math.round(params.flat.x),
      y: Math.round(params.flat.y),
      width: Math.round(params.flat.width),
      height: Math.round(params.flat.height),
    },
  };
}

// Convert domain masks to the white-box tool's flat editing model.
// Rectangle layers map directly; Circle/Ellipse layers map to their
// bounding box (the flat canvas cannot edit curves); None slots are
// skipped. Slot order is preserved.
export function flatRegionsFromDomainMasks(masks: unknown): FlatRegionInput[] {
  const parsed = parseMasksInput(masks);

  if (parsed === null) {
    return [];
  }

  const flat: FlatRegionInput[] = [];

  for (const layer of parsed) {
    if (layer.shape === ShapeType.None) {
      continue;
    }

    const geometry = layer.geometry;

    if (
      typeof geometry.x === "number" &&
      typeof geometry.y === "number" &&
      typeof geometry.width === "number" &&
      typeof geometry.height === "number" &&
      geometry.width > 0 &&
      geometry.height > 0
    ) {
      flat.push({
        x: Math.round(geometry.x),
        y: Math.round(geometry.y),
        width: Math.round(geometry.width),
        height: Math.round(geometry.height),
      });

      continue;
    }

    if (
      typeof geometry.x === "number" &&
      typeof geometry.y === "number" &&
      typeof geometry.radius === "number" &&
      geometry.radius > 0
    ) {
      const radius = Math.round(geometry.radius);

      flat.push({
        x: Math.round(geometry.x) - radius,
        y: Math.round(geometry.y) - radius,
        width: radius * 2,
        height: radius * 2,
      });
    }
  }

  return flat;
}

// Convert the white-box tool's flat mask list back to domain masks,
// preserving the previous slot structure: Rectangle slots consume flat
// regions in order (or become None when the region was deleted), None
// slots are filled by newly added regions in order, non-Rectangle slots
// are kept unchanged (the flat canvas cannot edit them), and any
// remaining regions append. No mask is ever silently dropped.
export function domainMasksFromFlatRegions(params: {
  prevMasks: unknown;
  flatRegions: readonly FlatRegionInput[];
}): MaskLayer[] {
  const prev = parseMasksInput(params.prevMasks);
  const queue = [...params.flatRegions];

  if (prev === null) {
    return queue.map((flat) => domainRegionFromFlat({ flat }));
  }

  const next: MaskLayer[] = [];
  const noneSlots: number[] = [];

  for (const slot of prev) {
    if (slot.shape === ShapeType.Rectangle) {
      const flat = queue.shift();

      if (flat) {
        next.push(domainRegionFromFlat({ flat, prevShape: ShapeType.Rectangle }));
      } else {
        next.push({ shape: ShapeType.None, geometry: {} });
      }
    } else if (slot.shape === ShapeType.None) {
      noneSlots.push(next.length);
      next.push({ shape: ShapeType.None, geometry: {} });
    } else {
      next.push(slot);
    }
  }

  for (const slotIndex of noneSlots) {
    const flat = queue.shift();

    if (!flat) {
      break;
    }

    next[slotIndex] = domainRegionFromFlat({ flat, prevShape: ShapeType.Rectangle });
  }

  for (const flat of queue) {
    next.push(domainRegionFromFlat({ flat }));
  }

  return next;
}
