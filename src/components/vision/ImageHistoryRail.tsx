import { ClientLogger } from "@/lib/observability/client-logger";
import { useState } from "react";
import { Lock, Unlock, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HistoryImage {
  id: string;
  url: string;
  timestamp: string;
}

// Mock query until BE is ready
function useImageHistory() {
  const mockImages: HistoryImage[] = Array.from({ length: 10 }).map((_, i) => ({
    id: `img-${i}`,
    url: "/assets/placeholder-pcb.jpg",
    timestamp: new Date(Date.now() - i * 10000).toLocaleTimeString()
  }));

  return {
    data: mockImages,
    isLoading: false,
    isError: false,
  };
}

export function ImageHistoryRail() {
  const { data: images } = useImageHistory();
  const [locked, setLocked] = useState(false);
  
  const handleSetReference = (img: HistoryImage) => {
    if (locked) return;
    // Set as Reference in store or facade
    ClientLogger.info("Setting reference to", img.id);
  };

  return (
    <div className="flex flex-col border-t border-ca-border bg-ca-panel-2">
      <div className="flex items-center justify-between px-hmi-4 py-hmi-2 border-b border-ca-border/50">
        <h4 className="text-hmi-caption font-semibold uppercase tracking-wider text-ca-ink-muted">
          Capture History
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocked(!locked)}
          className={`h-8 px-2 min-h-[40px] text-xs ${locked ? "text-ca-destructive" : "text-ca-ink"}`}
        >
          {locked ? <Lock className="w-4 h-4 mr-1" /> : <Unlock className="w-4 h-4 mr-1" />}
          {locked ? "Reference Locked" : "Reference Unlocked"}
        </Button>
      </div>
      
      <div className="flex overflow-x-auto p-hmi-2 gap-hmi-2 min-h-[100px] items-center custom-scrollbar">
        {images?.map((img) => (
          <div
            key={img.id}
            className="group relative flex-shrink-0 w-24 h-20 rounded-md overflow-hidden border border-ca-border hover:border-ca-primary transition-colors cursor-pointer bg-black/10 flex items-center justify-center"
          >
            {/* Real image would go here */}
            <ImageIcon className="w-6 h-6 text-ca-muted opacity-50 absolute" />
            
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                variant="secondary"
                size="sm"
                disabled={locked}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetReference(img);
                }}
                className="text-[10px] h-8 min-h-[40px] px-2 bg-white/20 hover:bg-white/40 text-white border border-white/40 backdrop-blur-sm"
              >
                Set Ref
              </Button>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
              <p className="text-[9px] text-white/80 text-center font-mono">
                {img.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
