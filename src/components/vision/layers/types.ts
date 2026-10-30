export type VisionLayerType = "image" | "roi" | "pattern" | "mask" | "overlay" | "rule";

export interface VisionLayerItem {
  id: string;
  name: string;
  type: VisionLayerType;
  isVisible: boolean;
  isLocked: boolean;
  colorTag: string;
  zIndex: number;
  ruleId?: string;
  details?: string;
}

export interface PhotoshopLayersPanelProps {
  layers: VisionLayerItem[];
  selectedLayerId?: string | null;
  onSelectLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLocked: (layerId: string) => void;
  onBringToFront: (layerId: string) => void;
  onSendToBack: (layerId: string) => void;
  onMoveUp: (layerId: string) => void;
  onMoveDown: (layerId: string) => void;
  onDeleteLayer?: (layerId: string) => void;
  onDuplicateLayer?: (layerId: string) => void;
}
