export enum ShapeType {
  Rectangle = "Rectangle",
  Circle = "Circle",
  Ellipse = "Ellipse",
  Polygon = "Polygon",
  None = "None",
}

export interface Geometry {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: Array<{ x: number; y: number }>;
}
