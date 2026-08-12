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

export interface RoiSettings {
  x: number;
  y: number;
  width: number;
  height: number;
  shiftTolerance: number;
}

export interface CameraSettings {
  lighting: number;
  exposure: number;
  focus: number;
}

export interface RecipeSegment {
  visionSettings?: VisionSettings;
}
