import { ClientLogger } from "@/lib/observability/client-logger";
import { useState } from "react";
import { Lock, Unlock, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { beFetch } from "@/lib/be-fetch";

interface HistoryImage {
  id: string;
  url: string;
  timestamp: string;
}

function useImageHistory() {
  return useQuery({
    queryKey: ['imageHistory'],
    queryFn: async () => {
      const envelope = await beFetch<HistoryImage>("/images/processed");
      return envelope.Results;
    }
  });
}

export function ImageHistoryRail() {
  const { data: images, isLoading } = useImageHistory();
  const [isLocked, setIsLocked] = useState(false);
  
  const handleSetReference = (img: HistoryImage) => {
    if (isLocked) return;
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
          onClick={() => setIsLocked(!isLocked)}
          className={`h-8 px-2 min-h-[40px] text-xs ${isLocked ? "text-ca-destructive" : "text-ca-ink"}`}
        >
          {isLocked ? <Lock className="w-4 h-4 mr-1" /> : <Unlock className="w-4 h-4 mr-1" />}
          {isLocked ? "Reference Locked" : "Reference Unlocked"}
        </Button>
      </div>
      
      <div className="flex overflow-x-auto p-hmi-2 gap-hmi-2 min-h-[100px] items-center custom-scrollbar">
        {isLoading ? (
          <div className="text-xs text-ca-muted px-4">Loading history...</div>
        ) : images?.map((img) => (
          <div
            key={img.id}
            className="group relative flex-shrink-0 w-24 h-20 rounded-md overflow-hidden border border-ca-border hover:border-ca-primary transition-colors cursor-pointer bg-black/10 flex items-center justify-center"
          >
            {img.url ? (
               <img src={img.url} alt="History" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
               <ImageIcon className="w-6 h-6 text-ca-muted opacity-50 absolute" />
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
