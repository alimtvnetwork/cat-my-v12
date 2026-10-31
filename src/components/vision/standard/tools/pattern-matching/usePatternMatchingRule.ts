import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type PatternMatchResult,
  type ReferenceBoxItem,
} from "@/lib/vision/pattern-matcher";
import {
  readImageFile,
  type SearchRegion,
  type WhiteBoxMarkingInput,
} from "@/lib/vision/white-box-marking";
import {
  fitInside,
  migrateStoredRegionToWorking,
  readRecordedSpace,
  rectFromDomainGeometry,
} from "@/domain/vision/coordinates";
import type { RegionDrag } from "@/components/vision/white-box/types";
import { migrateDetectionThresholds } from "@/domain/vision/pattern-search";
import {
  evaluateChipPixelsReal,
  getAtmelReferenceBoxes,
} from "./atmel-chip-boxes";
import {
  CHIP_GOOD_DATA_URL,
  CHIP_STM8_DATA_URL,
} from "./chip-assets";

import type { PatternMatchingRuleProps } from "./types";
import {
  domainRegionFromFlat,
  parseRegionInput,
  resolveMatcherSettings,
} from "@/domain/vision/pattern-search";
import { useConveyorSimulation } from "./useConveyorSimulation";

export const STANDARD_CANVAS_WIDTH = 960;
export const STANDARD_CANVAS_HEIGHT = 540;

export async function normalizeImageToStandardCanvas(
  imageSource: CanvasImageSource,
  origW: number,
  origH: number,
  isChipSample = false,
): Promise<{ source: WhiteBoxMarkingInput; searchRegion: SearchRegion }> {
  const canvas = document.createElement("canvas");
  canvas.width = STANDARD_CANVAS_WIDTH;
  canvas.height = STANDARD_CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");

  // Default region is derived from the fitted image rect below, never
  // hardcoded: the old 350/220/350/180 constant assumed a 960x540 source.

  if (!ctx) {
    return {
      source: {
        width: STANDARD_CANVAS_WIDTH,
        height: STANDARD_CANVAS_HEIGHT,
        rgba: new Uint8ClampedArray(STANDARD_CANVAS_WIDTH * STANDARD_CANVAS_HEIGHT * 4),
      },
      searchRegion: createDefaultSearchRegion(STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT),
    };
  }

  // Aspect-preserving fit into the standard 960x540 working buffer (spec
  // 01 §4.1): the image is letterboxed, never stretched, and the recorded
  // transform maps working-space coordinates back to canonical space.
  const fit = fitInside(
    { width: origW, height: origH },
    { width: STANDARD_CANVAS_WIDTH, height: STANDARD_CANVAS_HEIGHT },
  );

  ctx.drawImage(imageSource, fit.offsetX, fit.offsetY, fit.drawWidth, fit.drawHeight);

  const imgData = ctx.getImageData(0, 0, STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT);
  const defaultRegion = createDefaultSearchRegion(fit.drawWidth, fit.drawHeight);

  return {
    source: {
      width: STANDARD_CANVAS_WIDTH,
      height: STANDARD_CANVAS_HEIGHT,
      rgba: imgData.data,
      sourceWidth: origW,
      sourceHeight: origH,
      scaleX: fit.scale,
      scaleY: fit.scale,
      offsetX: fit.offsetX,
      offsetY: fit.offsetY,
    },
    searchRegion: {
      x: defaultRegion.x + fit.offsetX,
      y: defaultRegion.y + fit.offsetY,
      width: defaultRegion.width,
      height: defaultRegion.height,
    },
  };
}

export function dataUrlToStandardImageInput(
  dataUrl: string,
  isChipSample = false,
): Promise<{ source: WhiteBoxMarkingInput; searchRegion: SearchRegion }> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = async () => {
      const origW = img.naturalWidth || img.width || 140;
      const origH = img.naturalHeight || img.height || 148;
      const result = await normalizeImageToStandardCanvas(img, origW, origH, isChipSample);
      resolve(result);
    };

    img.onerror = () => {
      resolve({
        source: {
          width: STANDARD_CANVAS_WIDTH,
          height: STANDARD_CANVAS_HEIGHT,
          rgba: new Uint8ClampedArray(STANDARD_CANVAS_WIDTH * STANDARD_CANVAS_HEIGHT * 4),
        },
        searchRegion: { x: 280, y: 80, width: 400, height: 380 },
      });
    };

    img.src = dataUrl;
  });
}

export function createDefaultSearchRegion(width: number, height: number): SearchRegion {
  if (width <= 200 && height <= 200) {
    return {
      x: 0,
      y: 0,
      width,
      height,
    };
  }

  const targetW = Math.round(Math.min(width * 0.7, Math.max(140, width * 0.45)));
  const targetH = Math.round(Math.min(height * 0.75, Math.max(148, targetW * (106 / 100))));
  const boundedW = Math.round(Math.min(targetW, targetH * (100 / 106)));
  const boundedH = Math.round(boundedW * (106 / 100));

  const x = Math.max(0, Math.round((width - boundedW) / 2));
  const y = Math.max(0, Math.round((height - boundedH) / 2));

  return {
    x,
    y,
    width: Math.min(width - x, boundedW),
    height: Math.min(height - y, boundedH),
  };
}

export function usePatternMatchingRule(props: PatternMatchingRuleProps) {
  const { settings: rawSettings, onChange } = props;
  const settings = rawSettings as any;
  const matcherSettings = resolveMatcherSettings(settings);
  const minMatchPercent = matcherSettings.minMatchPercent;
  const lumaTolerance = matcherSettings.lumaTolerance;
  const searchMarginPx = matcherSettings.searchMarginPx;
  const searchStepPx = matcherSettings.searchStepPx;
  const tolerancePx = settings?.tolerancePx ?? settings?.marginPx ?? 8;
  const greyscaleLevel = migrateDetectionThresholds(settings).greyscaleThreshold;

  const [searchRegion, setSearchRegion] = useState<SearchRegion | null>(() => {
    const sr = settings?.searchRegion;

    if (!sr) {
      return null;
    }

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

  const referenceBoxes = useMemo<ReferenceBoxItem[]>(() => {
    const originX = searchRegion?.x ?? 0;
    const originY = searchRegion?.y ?? 0;
    const scaleX = searchRegion ? searchRegion.width / 100 : 1;
    const scaleY = searchRegion ? searchRegion.height / 100 : 1;

    return getAtmelReferenceBoxes(originX, originY, scaleX, scaleY);
  }, [searchRegion]);

  const [source, setSource] = useState<WhiteBoxMarkingInput | null>(null);
  const [matchResult, setMatchResult] = useState<PatternMatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const targetUrl =
      (props as any)?.imageRef ||
      (props.settings as any)?.imageRef;

    if (!targetUrl || source !== null) {
      return;
    }

    void dataUrlToStandardImageInput(targetUrl, true)
      .then(({ source: stdSource, searchRegion: stdRegion }) => {
        if (isCancelled) {
          return;
        }

        setSource(stdSource);

        // §4.4 settings-load migration: a stored search region was drawn
        // against some earlier image (or, unstamped, in Space B buffer
        // coordinates). Convert it through canonical space for the image
        // just loaded, then into this image's working buffer. The stored
        // settings are never mutated, so a later load re-derives from the
        // pristine stored values and can never double-convert.
        const storedRaw = (props.settings as any)?.searchRegion;
        const storedParsed = storedRaw ? parseRegionInput(storedRaw) : null;
        const storedRect = storedParsed ? rectFromDomainGeometry(storedParsed.geometry) : null;
        const nativeWidth = stdSource.sourceWidth ?? stdSource.width;
        const nativeHeight = stdSource.sourceHeight ?? stdSource.height;
        let effectiveRegion: SearchRegion;

        if (storedRect && nativeWidth > 0 && nativeHeight > 0) {
          const migration = migrateStoredRegionToWorking({
            stored: storedRect,
            recorded: readRecordedSpace(storedRaw),
            image: { width: nativeWidth, height: nativeHeight },
            working: {
              sourceWidth: nativeWidth,
              sourceHeight: nativeHeight,
              scaleX: stdSource.scaleX ?? 1,
              scaleY: stdSource.scaleY ?? 1,
              offsetX: stdSource.offsetX ?? 0,
              offsetY: stdSource.offsetY ?? 0,
              aspectPreserved: true,
            },
            workingSize: { width: stdSource.width, height: stdSource.height },
          });

          if (migration.isFlagged) {
            // Flagged means the region must not be evaluated at a guessed
            // position: fall back to the default region for this image.
            console.warn(`[pattern-search] searchRegion migration flagged: ${migration.log}`);
            setSearchRegion(stdRegion);
            effectiveRegion = stdRegion;
          } else {
            console.info(
              `[pattern-search] searchRegion migrated from ${migration.sourceSpace}: ${migration.log}`,
            );
            setSearchRegion(migration.working);
            effectiveRegion = migration.working;
          }
        } else if (!searchRegion) {
          setSearchRegion(stdRegion);
          effectiveRegion = stdRegion;
        } else {
          effectiveRegion = searchRegion;
        }

        const result = evaluateChipPixelsReal({
          targetRgba: stdSource.rgba,
          targetWidth: stdSource.width,
          targetHeight: stdSource.height,
          searchRegion: effectiveRegion,
          toleranceLuma: lumaTolerance,
          searchMarginPx,
          searchStepPx,
          minMatchPercent,
        });

        setMatchResult(result);
      })
      .catch(() => {
        // Ignored
      });

    return () => {
      isCancelled = true;
    };
  }, [props.settings]);

  const handleSearchRegionChange = useCallback(
    (newRegion: SearchRegion | null) => {
      setSearchRegion(newRegion);
      onChange((prev: any) => ({
        ...prev,
        searchRegion: newRegion
          ? domainRegionFromFlat({
              flat: newRegion,
              prevShape: (prev as any)?.searchRegion?.shape,
            })
          : null,
      }));

      if (source && newRegion && newRegion.width > 5 && newRegion.height > 5) {
        const result = evaluateChipPixelsReal({
          targetRgba: source.rgba,
          targetWidth: source.width,
          targetHeight: source.height,
          searchRegion: newRegion,
          toleranceLuma: lumaTolerance,
          searchMarginPx,
          searchStepPx,
          minMatchPercent,
        });

        setMatchResult(result);
      }
    },
    [source, minMatchPercent, lumaTolerance, searchMarginPx, searchStepPx, onChange],
  );

  const clearCanvas = useCallback(() => {
    setSource(null);
    setSearchRegion(null);
    setMatchResult(null);
    onChange((prev: any) => ({
      ...prev,
      searchRegion: null,
    }));
  }, [onChange]);

  // Load Golden Atmel Sample
  const loadSampleAtmel = useCallback(async () => {
    try {
      const { source: stdSource, searchRegion: stdRegion } =
        await dataUrlToStandardImageInput(CHIP_GOOD_DATA_URL, true);

      setSource(stdSource);
      setSearchRegion(stdRegion);

      const result = evaluateChipPixelsReal({
        targetRgba: stdSource.rgba,
        targetWidth: stdSource.width,
        targetHeight: stdSource.height,
        searchRegion: stdRegion,
        toleranceLuma: lumaTolerance,
        searchMarginPx,
        searchStepPx,
        minMatchPercent,
      });

      setMatchResult(result);
      toast.success(
        `Loaded Golden Template (Atmel MEGA32U4) - Standard Centered PASS (${result.score}%)`,
      );
    } catch {
      toast.error("Failed to load Golden Atmel sample");
    }
  }, [minMatchPercent, lumaTolerance, searchMarginPx, searchStepPx]);

  // Load New Device: STM8 Defective Sample
  const loadSampleStm8 = useCallback(async () => {
    try {
      const { source: stdSource, searchRegion: stdRegion } =
        await dataUrlToStandardImageInput(CHIP_STM8_DATA_URL, true);

      setSource(stdSource);
      setSearchRegion(stdRegion);

      const result = evaluateChipPixelsReal({
        targetRgba: stdSource.rgba,
        targetWidth: stdSource.width,
        targetHeight: stdSource.height,
        searchRegion: stdRegion,
        toleranceLuma: lumaTolerance,
        searchMarginPx,
        searchStepPx,
        minMatchPercent,
      });

      setMatchResult(result);
      toast.error(
        `Loaded New Device (STM8S208) - Standard Centered FAIL (${result.score}%) [Wrong Part Model]`,
      );
    } catch {
      toast.error("Failed to load STM8 sample");
    }
  }, [minMatchPercent, lumaTolerance, searchMarginPx, searchStepPx]);

  const runMatch = useCallback(async () => {
    if (!source) {
      toast.error("No image loaded. Please upload a test image or open live camera first.");

      return;
    }

    setIsMatching(true);

    const effectiveRegion =
      searchRegion ?? createDefaultSearchRegion(source.width, source.height);

    if (!searchRegion) {
      setSearchRegion(effectiveRegion);
    }

    // Execute true pixel-level machine vision evaluation across all 24 box regions
    const result = evaluateChipPixelsReal({
      targetRgba: source.rgba,
      targetWidth: source.width,
      targetHeight: source.height,
      searchRegion: effectiveRegion,
      toleranceLuma: lumaTolerance,
      searchMarginPx,
      searchStepPx,
      minMatchPercent,
    });

    setMatchResult(result);
    setIsMatching(false);

    if (result.isPass) {
      toast.success(
        `Pattern Match PASS: ${result.score}% (${result.matchedCount}/${result.totalCount} boxes matched).`,
      );
    } else {
      toast.error(
        `Pattern Match FAIL: ${result.score}% (${result.matchedCount}/${result.totalCount} boxes matched).`,
      );
    }
  }, [source, searchRegion, minMatchPercent, lumaTolerance, searchMarginPx, searchStepPx]);

  const loadFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      const bitmap = await createImageBitmap(file);
      const { source: stdSource, searchRegion: stdRegion } =
        await normalizeImageToStandardCanvas(bitmap, bitmap.width, bitmap.height, false);

      setSource(stdSource);
      setSearchRegion(stdRegion);

      const result = evaluateChipPixelsReal({
        targetRgba: stdSource.rgba,
        targetWidth: stdSource.width,
        targetHeight: stdSource.height,
        searchRegion: stdRegion,
        toleranceLuma: lumaTolerance,
        searchMarginPx,
        searchStepPx,
        minMatchPercent,
      });

      setMatchResult(result);
      simulation.setIsSimulating(false);
      toast.success(`Loaded "${file.name}" in standard centered view`);
    } catch {
      const input = await readImageFile(file);
      setSource(input);

      const region = createDefaultSearchRegion(input.width, input.height);
      setSearchRegion(region);

      const result = evaluateChipPixelsReal({
        targetRgba: input.rgba,
        targetWidth: input.width,
        targetHeight: input.height,
        searchRegion: region,
        toleranceLuma: lumaTolerance,
        searchMarginPx,
        searchStepPx,
        minMatchPercent,
      });

      setMatchResult(result);
      simulation.setIsSimulating(false);
      toast.success(`Loaded "${file.name}"`);
    }
  };

  const loadCapturedFrame = async (input: WhiteBoxMarkingInput) => {
    try {
      const offCanvas = document.createElement("canvas");
      offCanvas.width = input.width;
      offCanvas.height = input.height;
      const offCtx = offCanvas.getContext("2d");

      if (offCtx) {
        const imgData = offCtx.createImageData(input.width, input.height);
        imgData.data.set(input.rgba);
        offCtx.putImageData(imgData, 0, 0);

        const { source: stdSource, searchRegion: stdRegion } =
          await normalizeImageToStandardCanvas(offCanvas, input.width, input.height, false);

        setSource(stdSource);
        setSearchRegion(stdRegion);

        const result = evaluateChipPixelsReal({
          targetRgba: stdSource.rgba,
          targetWidth: stdSource.width,
          targetHeight: stdSource.height,
          searchRegion: stdRegion,
          toleranceLuma: lumaTolerance,
          searchMarginPx,
          searchStepPx,
          minMatchPercent,
        });

        setMatchResult(result);
      } else {
        setSource(input);
        const region = createDefaultSearchRegion(input.width, input.height);
        setSearchRegion(region);
      }
    } catch {
      setSource(input);
      const region = createDefaultSearchRegion(input.width, input.height);
      setSearchRegion(region);
    }

    setIsCameraOpen(false);
    simulation.setIsSimulating(false);
  };

  const changeMinPercent = (val: number) => {
    onChange((prev: any) => ({
      ...prev,
      detection: {
        ...((prev as any)?.detection ?? {}),
        minMatchPercent: val,
      },
    }));
  };

  const changeTolerance = (val: number) => {
    onChange((prev: any) => ({
      ...prev,
      tolerancePx: val,
      marginPx: val,
    }));
  };

  const simulation = useConveyorSimulation({
    referenceBoxes,
    greyscaleLevel,
    tolerancePx,
    minMatchPercent,
  });

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
    simulation,
    setIsCameraOpen,
    setDragState,
    handleSearchRegionChange,
    loadFile,
    loadCapturedFrame,
    loadSampleAtmel,
    loadSampleStm8,
    runMatch,
    clearCanvas,
    changeMinPercent,
    changeTolerance,
  };
}
