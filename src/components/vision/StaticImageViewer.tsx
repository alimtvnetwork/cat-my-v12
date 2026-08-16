import { useEffect, useState } from "react";
import { getReferenceImage } from "@/lib/reference-image-store";

export function StaticImageViewer() {
  const [imgUrl, setImgUrl] = useState<string>("/assets/placeholder-pcb.jpg");

  useEffect(() => {
    const stored = getReferenceImage();
    if (stored) {
      setImgUrl(stored);
    }
  }, []);

  return (
    <div className="relative h-full w-full flex items-center justify-center bg-ca-panel/50 overflow-hidden">
      <img
        src={imgUrl}
        alt="Static Reference"
        className="max-h-full max-w-full object-contain pointer-events-none"
      />
    </div>
  );
}
