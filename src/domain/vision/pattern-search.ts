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
  };
  imageRegion: {
    // purpose TBD
    enabled: boolean;
    referenceTool: string | null;
    detectionColor: DetectionColorType;
  };
  view: { source: ImageSourceType; rendering: RenderModeType; zoom: number };
}

export const createDefaultPatternSearchSettings = (id: string): PatternSearchSettings => ({
  id,
  name: "Pattern Search",
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

export const PatternShapes = [ShapeCatalog[ShapeType.Rectangle], ShapeCatalog[ShapeType.Circle], ShapeCatalog[ShapeType.Ellipse]];

export const MaskShapes: MaskShape[] = [
  ShapeCatalog[ShapeType.None],
  ShapeCatalog[ShapeType.Rectangle],
  ShapeCatalog[ShapeType.Circle],
  ShapeCatalog[ShapeType.Ellipse],
];
