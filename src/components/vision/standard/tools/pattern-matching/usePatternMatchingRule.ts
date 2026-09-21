import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  matchConstellationPattern,
  type PatternMatchResult,
  type ReferenceBoxItem,
} from "@/lib/vision/pattern-matcher";
import {
  readImageFile,
  type SearchRegion,
  type WhiteBoxMarkingInput,
} from "@/lib/vision/white-box-marking";
import type { RegionDrag } from "@/components/vision/white-box/types";
import type { PatternMatchingRuleProps } from "./types";

function createSyntheticPatternImage(
  boxes: readonly ReferenceBoxItem[],
  width = 960,
  height = 540,
): WhiteBoxMarkingInput {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(20);

  for (let i = 3; i < data.length; i += 4) {
    data[i] = 255;
  }

  for (const box of boxes) {
    for (let y = box.y; y < box.y + box.height; y += 1) {
      for (let x = box.x; x < box.x + box.width; x += 1) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          data[idx] = 240;
          data[idx + 1] = 240;
          data[idx + 2] = 240;
          data[idx + 3] = 255;
        }
      }
    }
  }

  return { width, height, rgba: data };
}

export function usePatternMatchingRule(props: PatternMatchingRuleProps) {
  const settings = props.settings as any;
  const minMatchPercent = settings?.minMatchPercent ?? 100;
  const tolerancePx = settings?.tolerancePx ?? settings?.marginPx ?? 8;
  const rawThreshold =
    settings?.threshold ??
    settings?.WhiteThreshold ??
    settings?.whiteThreshold ??
    settings?.greyscaleLevel ??
    settings?.params?.threshold ??
    settings?.params?.WhiteThreshold;
  const greyscaleLevel = typeof rawThreshold === "number" ? rawThreshold : 170;

  const referenceBoxes = useMemo<ReferenceBoxItem[]>(() => {
    const savedBoxes = settings?.referenceBoxes;

    if (Array.isArray(savedBoxes) && savedBoxes.length > 0 && typeof savedBoxes[0]?.x === "number") {
      return savedBoxes.map((b: any) => ({
        boxNumber: b.boxNumber ?? 1,
        x: b.x,
        y: b.y,
        width: b.width ?? 12,
        height: b.height ?? 12,
        area: b.area ?? 144,
      }));
    }

    const constel = settings?.constellation;

    if (Array.isArray(constel) && constel.length > 0 && typeof constel[0]?.x === "number") {
      return constel.map((c: any) => ({
        boxNumber: c.boxNumber ?? 1,
        x: c.x,
        y: c.y,
        width: c.width ?? 12,
        height: c.height ?? 12,
        area: c.area ?? 144,
      }));
    }

    const baseOriginX =
      (typeof settings?.region?.x === "number" && settings.region.x > 0 ? settings.region.x : null) ??
      (typeof settings?.patternBounds?.x === "number" && settings.patternBounds.x > 0
        ? settings.patternBounds.x
        : null) ??
      (typeof settings?.patternRegion?.geometry?.x === "number" &&
      settings.patternRegion.geometry.x > 0 &&
      settings.patternRegion.geometry.x !== 50
        ? settings.patternRegion.geometry.x
        : null) ??
      280;

    const baseOriginY =
      (typeof settings?.region?.y === "number" && settings.region.y > 0 ? settings.region.y : null) ??
      (typeof settings?.patternBounds?.y === "number" && settings.patternBounds.y > 0
        ? settings.patternBounds.y
        : null) ??
      (typeof settings?.patternRegion?.geometry?.y === "number" &&
      settings.patternRegion.geometry.y > 0 &&
      settings.patternRegion.geometry.y !== 50
        ? settings.patternRegion.geometry.y
        : null) ??
      160;

    if (Array.isArray(constel) && constel.length > 0) {
      return constel.map((c: any) => ({
        boxNumber: c.boxNumber ?? 1,
        x: typeof c.x === "number" ? c.x : baseOriginX + (c.relX ?? 0),
        y: typeof c.y === "number" ? c.y : baseOriginY + (c.relY ?? 0),
        width: c.width ?? 12,
        height: c.height ?? 12,
        area: c.area ?? 144,
      }));
    }

    // Default 31-box layout if constellation array not saved yet
    const boxes: ReferenceBoxItem[] = [];
    const cols = 8;
    for (let i = 0; i < 31; i += 1) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      boxes.push({
        boxNumber: i + 1,
        x: baseOriginX + 20 + col * 44,
        y: baseOriginY + 20 + row * 44,
        width: 14,
        height: 14,
        area: 196,
      });
    }

    return boxes;
  }, [
    settings?.referenceBoxes,
    settings?.constellation,
    settings?.patternRegion?.geometry,
    settings?.region,
    settings?.patternBounds,
  ]);

  const [searchRegion, setSearchRegion] = useState<SearchRegion | null>(null);
  const [dragState, setDragState] = useState<RegionDrag | null>(null);

  const handleSearchRegionChange = useCallback((newRegion: SearchRegion | null) => {
    setSearchRegion(newRegion);
    props.onChange((prev: any) => ({
      ...prev,
      searchRegion: newRegion,
      searchRegionJson: newRegion ? JSON.stringify(newRegion) : undefined,
    }));
  }, [props.onChange]);

  const [source, setSource] = useState<WhiteBoxMarkingInput | null>(null);
  const [matchResult, setMatchResult] = useState<PatternMatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const clearCanvas = useCallback(() => {
    setSource(null);
    setSearchRegion(null);
    setMatchResult(null);
    props.onChange((prev: any) => ({
      ...prev,
      searchRegion: null,
      searchRegionJson: undefined,
    }));
  }, [props.onChange]);

  const runMatch = useCallback(() => {
    if (referenceBoxes.length === 0) {
      return;
    }

    if (!searchRegion) {
      toast.info("Please draw a search region on the canvas before matching.");

      return;
    }

    const effectiveSource = source ?? createSyntheticPatternImage(referenceBoxes);

    if (!source) {
      setSource(effectiveSource);
    }

    setIsMatching(true);

    const result = matchConstellationPattern({
      targetRgba: effectiveSource.rgba,
      targetWidth: effectiveSource.width,
      targetHeight: effectiveSource.height,
      referenceBoxes,
      searchRegion: searchRegion ?? undefined,
      threshold: greyscaleLevel,
      tolerancePx,
      minMatchPercent,
    });

    setMatchResult(result);
    setIsMatching(false);

    if (result.isPass) {
      toast.success(
        `Pattern Match PASS: ${result.score}% (${result.matchedCount}/${result.totalCount} boxes).`,
      );
    } else {
      toast.error(
        `Pattern Match FAIL: ${result.score}% (${result.matchedCount}/${result.totalCount} boxes).`,
      );
    }
  }, [source, referenceBoxes, searchRegion, greyscaleLevel, tolerancePx, minMatchPercent]);

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    const input = await readImageFile(file);
    setSource(input);
  };

  const loadCapturedFrame = (input: WhiteBoxMarkingInput) => {
    setSource(input);
    setIsCameraOpen(false);
  };

  const changeMinPercent = (val: number) => {
    props.onChange((prev: any) => ({
      ...prev,
      minMatchPercent: val,
    }));
  };

  const changeTolerance = (val: number) => {
    props.onChange((prev: any) => ({
      ...prev,
      tolerancePx: val,
      marginPx: val,
    }));
  };

  return {
    source,
    matchResult,
    referenceBoxes,
    searchRegion,
    dragState,
    minMatchPercent,
    tolerancePx,
    greyscaleLevel,
    isMatching,
    isCameraOpen,
    setIsCameraOpen,
    setDragState,
    handleSearchRegionChange,
    loadFile,
    loadCapturedFrame,
    runMatch,
    clearCanvas,
    changeMinPercent,
    changeTolerance,
  };
}
