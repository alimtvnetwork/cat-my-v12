import { useEffect, useState, useRef } from "react";
import { getReferenceImage, subscribe } from "@/lib/stores/reference-image-store";
import { useImageCoordinateMapping } from "@/hooks/useImageCoordinateMapping";
import { RoiBadge } from "./RoiBadge";
import { useLightingStore } from "@/lib/lighting/store";

export function StaticImageViewer(): React.JSX.Element | null {
  const [imgUrl, setImgUrl] = useState<string>("/assets/placeholder-pcb.jpg");
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const geometry = useImageCoordinateMapping(containerRef, imageRef);
  const exposure = useLightingStore((s) => s.exposure);
  const brightness = 1 + exposure / 100;

  useEffect(() => {
    const stored = getReferenceImage();
    if (stored) {
      setImgUrl(stored);
    }

    const unsub = subscribe((val) => {
      setIsLoaded(false);
      if (val) {
        setImgUrl(val);
      } else {
        setImgUrl("/assets/placeholder-pcb.jpg");
      }
    });

    return unsub;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex items-center justify-center bg-ca-panel/50 overflow-hidden"
    >
      {/* Shimmer skeleton while image loads (Task 255) */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-ca-panel-2" aria-hidden="true" />
      )}
      <img
        ref={imageRef}
        src={imgUrl}
        alt="Static Reference"
        fetchPriority="high"
        className={`max-h-full max-w-full object-contain pointer-events-none transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        style={{ filter: `brightness(${brightness})` }}
        onLoad={() => setIsLoaded(true)}
      />
      {geometry && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            width: geometry.renderedWidth,
            height: geometry.renderedHeight,
            left: geometry.offsetX,
            top: geometry.offsetY,
          }}
        >
          {/* ROI Layer (Decoupled from Live Stream) */}
          <div className="absolute inset-0 z-10" id="static-roi-layer">
            <RoiBadge label="Pattern Search" x={20} y={20} width={30} height={30} />
          </div>

          {/* Result Layer */}
          <div className="absolute inset-0 z-20 mix-blend-screen" id="static-result-layer">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-bold text-green-500/50 drop-shadow-lg">
              PASS
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
