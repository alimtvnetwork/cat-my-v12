export enum ShapeType {
  Rectangle = "Rectangle",
  Circle = "Circle",
  None = "None",
}

export interface Geometry {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
}

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
];

export const MaskShapes = [
  ShapeCatalog[ShapeType.None],
  ShapeCatalog[ShapeType.Rectangle],
  ShapeCatalog[ShapeType.Circle],
];
