import { useState, useEffect, RefObject } from "react";

export interface ImageGeometry {
  naturalWidth: number;
  naturalHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export function useImageCoordinateMapping(
  containerRef: RefObject<HTMLElement | null>,
  imageRef: RefObject<HTMLImageElement | null>,
): ImageGeometry | null {
  const [geometry, setGeometry] = useState<ImageGeometry | null>(null);

  useEffect(() => {
    const updateGeometry = () => {
      if (!containerRef.current || !imageRef.current) return;

      const container = containerRef.current;
      const img = imageRef.current;

      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;

      if (cw === 0 || ch === 0 || nw === 0 || nh === 0) {
        return;
      }

      const containerRatio = cw / ch;
      const imageRatio = nw / nh;

      let renderedWidth = cw;
      let renderedHeight = ch;
      let scale = 1;

      if (imageRatio > containerRatio) {
        // Image is wider than container
        renderedHeight = cw / imageRatio;
        scale = cw / nw;
      } else {
        // Image is taller than container
        renderedWidth = ch * imageRatio;
        scale = ch / nh;
      }

      const offsetX = (cw - renderedWidth) / 2;
      const offsetY = (ch - renderedHeight) / 2;

      setGeometry({
        naturalWidth: nw,
        naturalHeight: nh,
        renderedWidth,
        renderedHeight,
        offsetX,
        offsetY,
        scale,
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      updateGeometry();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const img = imageRef.current;
    if (img) {
      img.addEventListener("load", updateGeometry);
      if (img.complete) {
        updateGeometry();
      }
    }

    return () => {
      resizeObserver.disconnect();
      if (img) {
        img.removeEventListener("load", updateGeometry);
      }
    };
  }, [containerRef, imageRef]);

  return geometry;
}
