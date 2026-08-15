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
