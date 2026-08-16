export enum ShapeType {
  Rectangle = "Rectangle",
  Circle = "Circle",
  Ellipse = "Ellipse",
  None = "None",
}

export interface Geometry {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
}
