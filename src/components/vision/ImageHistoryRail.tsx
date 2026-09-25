import { ClientLogger } from "@/lib/observability/client-logger";
import { useState, useEffect } from "react";
import { Lock, Unlock, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { beFetch } from "@/lib/be-fetch";
import {
  getCaptureHistory,
  subscribeCaptureHistory,
  type CaptureHistoryEntry,
} from "@/lib/stores/capture-history-store";
import {
  getReferenceImage,
  setReferenceImage,
  subscribe as subscribeRef,
} from "@/lib/stores/reference-image-store";
import { evaluateCurrentVision } from "@/hooks/useAutoEvaluate";

interface HistoryImage {
  id: string;
  name?: string;
  url: string;
  timestamp: string;
}

function useImageHistory() {
  return useQuery({
    queryKey: ["imageHistory"],
    queryFn: async () => {
      try {
        const envelope = await beFetch<HistoryImage>(
          "/images/processed",
          {},
          { suppressCapture: true },
        );
        return envelope.Results ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 10000,
  });
}

export function ImageHistoryRail(): React.JSX.Element | null {
  const { data: serverImages = [], isLoading } = useImageHistory();
  const [localCaptures, setLocalCaptures] = useState<CaptureHistoryEntry[]>(() =>
    getCaptureHistory(),
  );
  const [activeRef, setActiveRef] = useState<string | null>(() => getReferenceImage());
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const unsubLocal = subscribeCaptureHistory((entries) => {
      setLocalCaptures(entries);
    });
    const unsubRef = subscribeRef((val) => {
      setActiveRef(val);
    });
    return () => {
      unsubLocal();
      unsubRef();
    };
  }, []);

  const handleSetReference = (img: { id: string; url: string }) => {
    if (isLocked) return;
    setReferenceImage(img.url);
    ClientLogger.info("Setting reference to", img.id);
    void evaluateCurrentVision();
  };

  // Merge local captures and server images
  const allImages: HistoryImage[] = [
    ...localCaptures.map((cap) => ({
      id: cap.id,
      name: "Capture",
      url: cap.dataUrl,
      timestamp: new Date(cap.capturedAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    })),
    ...serverImages,
  ];

  return (
    <div className="flex flex-col border-t border-ca-border bg-ca-panel-2">
      <div className="flex items-center justify-between px-hmi-4 py-hmi-2 border-b border-ca-border/50">
        <h4 className="text-hmi-caption font-semibold uppercase tracking-wider text-ca-ink-muted">
          Sample &amp; Capture History ({allImages.length})
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsLocked(!isLocked)}
          className={`h-8 px-2 min-h-[40px] text-xs ${isLocked ? "text-ca-destructive" : "text-ca-ink"}`}
        >
          {isLocked ? <Lock className="w-4 h-4 mr-1" /> : <Unlock className="w-4 h-4 mr-1" />}
          {isLocked ? "Reference Locked" : "Reference Unlocked"}
        </Button>
      </div>

      <div className="flex overflow-x-auto p-hmi-2 gap-hmi-2 min-h-[100px] items-center custom-scrollbar">
        {isLoading && allImages.length === 0 ? (
          <div className="text-xs text-ca-muted px-4">Loading history...</div>
        ) : allImages.length === 0 ? (
          <div className="text-xs text-ca-muted px-4">
            No images available yet. Capture a frame or upload an image.
          </div>
        ) : (
          allImages.map((img) => {
            const isActive = activeRef === img.url;
            return (
              <div
                key={img.id}
                onClick={() => handleSetReference(img)}
                className={`group relative flex-shrink-0 w-28 h-20 rounded-md overflow-hidden border transition-all cursor-pointer bg-black/20 flex items-center justify-center ${
                  isActive
                    ? "border-ca-primary ring-2 ring-ca-primary/40 shadow-sm"
                    : "border-ca-border hover:border-ca-primary/60"
                }`}
                style={{ contentVisibility: "auto", containIntrinsicSize: "112px 80px" }}
              >
                {img.url ? (
                  <img
                    src={img.url}
                    alt={img.name || "History"}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-ca-muted opacity-50 absolute" />
                )}

                {isActive && (
                  <div className="absolute top-1 left-1 bg-ca-primary text-white rounded-full p-0.5 shadow">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isLocked}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetReference(img);
                    }}
                    className="text-[10px] h-7 px-2 bg-white/20 hover:bg-white/40 text-white border border-white/40 backdrop-blur-sm"
                  >
                    {isActive ? "Active" : "Set Ref"}
                  </Button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 flex items-center justify-between">
                  <span className="text-[9px] text-white/90 truncate max-w-[55px] font-sans">
                    {img.name || "Image"}
                  </span>
                  <span className="text-[8px] text-white/70 font-mono">{img.timestamp}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
