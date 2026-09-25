import { useEffect, useState, useRef } from "react";
import { getReferenceImage, subscribe } from "@/lib/stores/reference-image-store";
import { useImageCoordinateMapping } from "@/hooks/useImageCoordinateMapping";
import { RoiBadge } from "./RoiBadge";
import { useLightingStore } from "@/lib/lighting/store";
import { useVisionStore } from "@/lib/vision/store";

import defaultSampleImage from "@/assets/samples/pocket-1-filled.jpg";

export function StaticImageViewer(): React.JSX.Element | null {
  const [imgUrl, setImgUrl] = useState<string>(() => getReferenceImage() || defaultSampleImage);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const geometry = useImageCoordinateMapping(containerRef, imageRef);
  const exposure = useLightingStore((s) => s.exposure);
  const brightness = 1 + exposure / 100;
  const lastScoreResult = useVisionStore((s) => s.lastScoreResult);

  useEffect(() => {
    const stored = getReferenceImage();
    if (stored) {
      setImgUrl(stored);
    }

    const unsub = subscribe((val) => {
      setImgUrl(val || defaultSampleImage);
    });

    return unsub;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex items-center justify-center bg-black/20 overflow-hidden"
    >
      <img
        ref={imageRef}
        src={imgUrl}
        alt="Static Reference"
        fetchPriority="high"
        className="max-h-full max-w-full object-contain pointer-events-none select-none transition-opacity duration-200"
        style={{ filter: `brightness(${brightness})` }}
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
            <RoiBadge label="Pocket ROI" x={15} y={15} width={70} height={70} />
          </div>

          {/* Result Layer (driven by actual evaluation score) */}
          {lastScoreResult && (
            <div className="absolute inset-0 z-20 mix-blend-screen" id="static-result-layer">
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl font-extrabold tracking-wider drop-shadow-lg px-4 py-2 rounded-lg border-2 ${
                  lastScoreResult.is_pass
                    ? "text-green-400 border-green-500/60 bg-green-950/40"
                    : "text-red-500 border-red-500/60 bg-red-950/40"
                }`}
              >
                {lastScoreResult.is_pass ? "PASS" : "FAIL"}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
