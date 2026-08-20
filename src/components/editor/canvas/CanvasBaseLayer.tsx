import { forwardRef, CanvasHTMLAttributes } from "react";

interface CanvasBaseLayerProps extends CanvasHTMLAttributes<HTMLCanvasElement> {}

export const CanvasBaseLayer = forwardRef<HTMLCanvasElement, CanvasBaseLayerProps>((props, ref) => {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <canvas
        ref={ref}
        {...props}
        className="h-full w-full pointer-events-auto touch-none bg-ca-viewport focus-visible:outline focus-visible:outline-2 focus-visible:outline-ca-focus"
      />
    </div>
  );
});
CanvasBaseLayer.displayName = "CanvasBaseLayer";
