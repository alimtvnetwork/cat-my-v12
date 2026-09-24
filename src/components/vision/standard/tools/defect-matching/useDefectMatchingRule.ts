import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  readImageFile,
  type SearchRegion,
  type WhiteBoxMarkingInput,
} from "@/lib/vision/white-box-marking";
import type { RegionDrag } from "@/components/vision/white-box/types";
import {
  normalizeImageToStandardCanvas,
  createDefaultSearchRegion,
} from "@/components/vision/standard/tools/pattern-matching/usePatternMatchingRule";
import { evaluateDefectPixelsReal } from "./defect-detector";
import type { DefectBoxItem, DefectMatchResult, DefectToolProps } from "./types";

export function useDefectMatchingRule(props: DefectToolProps) {
  const settings = props.settings as any;

  const referenceBoxes = useMemo<DefectBoxItem[]>(() => {
    const rawBoxes = settings?.referenceBoxes ?? settings?.constellation;

    if (Array.isArray(rawBoxes) && rawBoxes.length > 0) {
      return rawBoxes.map((b: any, idx: number) => ({
        boxNumber: b.boxNumber ?? b.number ?? idx + 1,
        x: Math.round(b.x),
        y: Math.round(b.y),
        width: Math.round(b.width),
        height: Math.round(b.height),
        area: b.area,
      }));
    }

    return [];
  }, [settings?.referenceBoxes, settings?.constellation]);

  const [minMatchPercent, setMinMatchPercent] = useState<number>(() => {
    return typeof settings?.minMatchPercent === "number" ? settings.minMatchPercent : 70;
  });

  const [tolerancePx, setTolerancePx] = useState<number>(() => {
    return typeof settings?.tolerancePx === "number" ? settings.tolerancePx : 8;
  });

  const greyscaleLevel = typeof settings?.threshold === "number" ? settings.threshold : 170;

  const [searchRegion, setSearchRegion] = useState<SearchRegion | null>(() => {
    const sr = settings?.searchRegion;

    if (!sr) return null;

    if (sr.geometry && typeof sr.geometry.x === "number") {
      return {
        x: Math.round(sr.geometry.x),
        y: Math.round(sr.geometry.y),
        width: Math.round(sr.geometry.width),
        height: Math.round(sr.geometry.height),
      };
    }

    if (typeof sr.x === "number") {
      return {
        x: Math.round(sr.x),
        y: Math.round(sr.y),
        width: Math.round(sr.width),
        height: Math.round(sr.height),
      };
    }

    return null;
  });

  const [dragState, setDragState] = useState<RegionDrag | null>(null);
  const [source, setSource] = useState<WhiteBoxMarkingInput | null>(null);
  const [matchResult, setMatchResult] = useState<DefectMatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const loadFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;

      try {
        const rawInput = await readImageFile(file);
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Failed to load test image"));
          img.src = objectUrl;
        });

        const { source: stdSource, searchRegion: autoRegion } =
          await normalizeImageToStandardCanvas(img, rawInput.width, rawInput.height);

        URL.revokeObjectURL(objectUrl);

        setSource(stdSource);

        const targetRegion = searchRegion ?? autoRegion;

        if (!searchRegion) {
          setSearchRegion(targetRegion);
        }

        const result = evaluateDefectPixelsReal({
          targetRgba: stdSource.rgba,
          targetWidth: stdSource.width,
          targetHeight: stdSource.height,
          referenceBoxes,
          searchRegion: targetRegion,
          threshold: greyscaleLevel,
          tolerancePx,
          minMatchPercent,
        });

        setMatchResult(result);

        if (result.hasDefect) {
          toast.error(
            `Defect Detected: ${result.score}% match $\ge$ ${minMatchPercent}% threshold (REJECT)`,
          );
        } else {
          toast.success(
            `No Defect Detected: ${result.score}% match < ${minMatchPercent}% threshold (PASS)`,
          );
        }
      } catch (err) {
        toast.error("Failed to read image file");
        console.error(err);
      }
    },
    [referenceBoxes, searchRegion, greyscaleLevel, tolerancePx, minMatchPercent],
  );

  const loadCapturedFrame = useCallback(
    (frame: WhiteBoxMarkingInput) => {
      setSource(frame);

      const targetRegion =
        searchRegion ?? createDefaultSearchRegion(frame.width, frame.height);

      if (!searchRegion) {
        setSearchRegion(targetRegion);
      }

      const result = evaluateDefectPixelsReal({
        targetRgba: frame.rgba,
        targetWidth: frame.width,
        targetHeight: frame.height,
        referenceBoxes,
        searchRegion: targetRegion,
        threshold: greyscaleLevel,
        tolerancePx,
        minMatchPercent,
      });

      setMatchResult(result);

      if (result.hasDefect) {
        toast.error(
          `Defect Detected: ${result.score}% match $\ge$ ${minMatchPercent}% threshold (REJECT)`,
        );
      } else {
        toast.success(
          `No Defect Detected: ${result.score}% match < ${minMatchPercent}% threshold (PASS)`,
        );
      }
    },
    [referenceBoxes, searchRegion, greyscaleLevel, tolerancePx, minMatchPercent],
  );

  const handleSearchRegionChange = useCallback(
    (newRegion: SearchRegion | null) => {
      setSearchRegion(newRegion);

      props.onChange((prev: any) => ({
        ...prev,
        searchRegion: newRegion
          ? {
              shape: "rectangle",
              geometry: {
                x: newRegion.x,
                y: newRegion.y,
                width: newRegion.width,
                height: newRegion.height,
              },
            }
          : null,
      }));

      if (source && newRegion && newRegion.width > 5 && newRegion.height > 5) {
        const result = evaluateDefectPixelsReal({
          targetRgba: source.rgba,
          targetWidth: source.width,
          targetHeight: source.height,
          referenceBoxes,
          searchRegion: newRegion,
          threshold: greyscaleLevel,
          tolerancePx,
          minMatchPercent,
        });

        setMatchResult(result);
      }
    },
    [source, referenceBoxes, greyscaleLevel, tolerancePx, minMatchPercent, props.onChange],
  );

  const clearCanvas = useCallback(() => {
    setSource(null);
    setSearchRegion(null);
    setMatchResult(null);
    props.onChange((prev: any) => ({
      ...prev,
      searchRegion: null,
    }));
  }, [props.onChange]);

  const runMatch = useCallback(() => {
    if (!source) {
      toast.error("No test image loaded. Please upload an image or capture from camera.");

      return;
    }

    setIsMatching(true);

    const effectiveRegion =
      searchRegion ?? createDefaultSearchRegion(source.width, source.height);

    if (!searchRegion) {
      setSearchRegion(effectiveRegion);
    }

    const result = evaluateDefectPixelsReal({
      targetRgba: source.rgba,
      targetWidth: source.width,
      targetHeight: source.height,
      referenceBoxes,
      searchRegion: effectiveRegion,
      threshold: greyscaleLevel,
      tolerancePx,
      minMatchPercent,
    });

    setMatchResult(result);
    setIsMatching(false);

    if (result.hasDefect) {
      toast.error(
        `Defect Detected: ${result.score}% match $\ge$ ${minMatchPercent}% threshold (REJECT)`,
      );
    } else {
      toast.success(
        `No Defect Detected: ${result.score}% match < ${minMatchPercent}% threshold (PASS)`,
      );
    }
  }, [source, searchRegion, referenceBoxes, greyscaleLevel, tolerancePx, minMatchPercent]);

  const changeMinPercent = useCallback(
    (newVal: number) => {
      const clamped = Math.max(1, Math.min(100, newVal));
      setMinMatchPercent(clamped);

      props.onChange((prev: any) => ({
        ...prev,
        minMatchPercent: clamped,
      }));

      if (source && searchRegion) {
        const result = evaluateDefectPixelsReal({
          targetRgba: source.rgba,
          targetWidth: source.width,
          targetHeight: source.height,
          referenceBoxes,
          searchRegion,
          threshold: greyscaleLevel,
          tolerancePx,
          minMatchPercent: clamped,
        });

        setMatchResult(result);
      }
    },
    [source, searchRegion, referenceBoxes, greyscaleLevel, tolerancePx, props.onChange],
  );

  const changeTolerance = useCallback(
    (newVal: number) => {
      const clamped = Math.max(1, Math.min(30, newVal));
      setTolerancePx(clamped);

      props.onChange((prev: any) => ({
        ...prev,
        tolerancePx: clamped,
      }));

      if (source && searchRegion) {
        const result = evaluateDefectPixelsReal({
          targetRgba: source.rgba,
          targetWidth: source.width,
          targetHeight: source.height,
          referenceBoxes,
          searchRegion,
          threshold: greyscaleLevel,
          tolerancePx: clamped,
          minMatchPercent,
        });

        setMatchResult(result);
      }
    },
    [source, searchRegion, referenceBoxes, greyscaleLevel, minMatchPercent, props.onChange],
  );

  return {
    source,
    searchRegion,
    referenceBoxes,
    matchResult,
    isMatching,
    isCameraOpen,
    minMatchPercent,
    tolerancePx,
    greyscaleLevel,
    dragState,
    setIsCameraOpen,
    setDragState,
    loadFile,
    loadCapturedFrame,
    handleSearchRegionChange,
    clearCanvas,
    runMatch,
    changeMinPercent,
    changeTolerance,
  };
}
