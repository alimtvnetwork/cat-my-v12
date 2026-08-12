export interface HandlerSettings {
  inputs: {
    triggerIn: boolean;
    partPresent: boolean;
  };
  outputs: {
    ready: boolean;
    busy: boolean;
    pass: boolean;
    fail: boolean;
  };
}

export interface VisionSettings {
  id: string;
  name: string;
  camera?: CameraSettings;
  cameraSettings?: CameraSettings;
  handlerSettings?: HandlerSettings;
  roi?: RoiSettings;
}

export type TriggerMode = 'INTERNAL' | 'EXTERNAL';

export interface ShapeTrax3Settings {
  enabled: boolean;
  matchScore: number;
  rotationTolerance: number;
  scaleTolerance: number;
}

export interface PatternConfig {
  enabled: boolean;
  edgeStrength: number;
  polarity: 'ANY' | 'DARK_TO_LIGHT' | 'LIGHT_TO_DARK';
}

export interface Mask {
  id: string;
  type: 'RECTANGLE' | 'CIRCLE' | 'POLYGON';
  points: { x: number; y: number }[];
  radius?: number;
}

export interface ColorSettings {
  threshold: number;
  invert: boolean;
  colorMap: string; // 'grayscale' | '2-bit' | etc
  keyColor?: string;
}

export interface RoiSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  shiftTolerance: number;
  masks?: Mask[];
  colorSettings?: ColorSettings;
  shapeTrax3?: ShapeTrax3Settings;
  patternConfig?: PatternConfig;
}

export interface CameraSettings {
  lighting: number;
  exposure: number;
  focus: number;
}

export interface RecipeSegment {
  visionSettings?: VisionSettings;
}
