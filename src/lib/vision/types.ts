import { ShapeType, Geometry } from "../../domain/vision/shapes";

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

import { TriggerModeType } from "./TriggerModeType";
import { PolarityType } from "./PolarityType";

export interface VisionSettings {
  id: string;
  name: string;
  camera?: CameraSettings;
  cameraSettings?: CameraSettings;
  handlerSettings?: HandlerSettings;
  roi?: RoiSettings;
}

export interface ShapeTrax3Settings {
  enabled: boolean;
  matchScore: number;
  rotationTolerance: number;
  scaleTolerance: number;
}

export interface PatternConfig {
  enabled: boolean;
  edgeStrength: number;
  polarity: PolarityType;
  inverseLogic: boolean;
}

export interface PinConsistencySettings {
  enabled: boolean;
  expectedPinCount: number;
  pitchTolerance: number; // mm or pixels
  lengthTolerance: number;
}

export interface Mask {
  id: string;
  type: ShapeType;
  geometry: Geometry;
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
  pinConsistency?: PinConsistencySettings;
}

export interface CameraSettings {
  lighting: number;
  exposure: number;
  focus: number;
  triggerMode?: string;
  triggerDelay?: number;
  triggerSource?: string;
}

export interface RecipeSegment {
  id?: string;
  name?: string;
  visionSettings?: VisionSettings;
}
