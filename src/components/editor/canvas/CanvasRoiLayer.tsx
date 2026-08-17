import { ReactNode } from "react";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { EditorRule, Viewport } from "@/lib/editor/types";
import { RoiBadge } from "@/components/vision/RoiBadge";

interface CanvasRoiLayerProps {
  children: ReactNode;
  rules?: EditorRule[];
  viewport?: Viewport;
}

export function CanvasRoiLayer({ children, rules, viewport }: CanvasRoiLayerProps): React.JSX.Element | null {
  const activeStateId = useRulesStore((s) => s.activeStateId);

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {rules && viewport && rules.filter(r => !r.isHidden).map((rule) => {
        const x = viewport.panX + rule.x * viewport.zoom;
        const y = viewport.panY + rule.y * viewport.zoom;
        const width = rule.width * viewport.zoom;
        const height = rule.height * viewport.zoom;
        
        return (
          <RoiBadge
            key={rule.id}
            label={rule.name || rule.id}
            x={x}
            y={y}
            width={width}
            height={height}
            color={rule.params?.color as string}
            isHovered={activeStateId === rule.id}
          />
        );
      })}
      {children}
    </div>
  );
}
