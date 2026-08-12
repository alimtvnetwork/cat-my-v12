export interface VisionSettings {
  id: string;
  name: string;
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
