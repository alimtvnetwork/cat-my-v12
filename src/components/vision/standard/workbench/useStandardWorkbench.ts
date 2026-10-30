import { useCallback, useEffect, useState } from "react";
import {
  type SearchRegion,
  type WhiteBoxMarkingInput,
  readImageUrl,
  readImageFile,
} from "@/lib/vision/white-box-marking";
import type { RegionDrag } from "@/components/vision/white-box/types";
import { defaultWorkpieceFilledSample } from "@/lib/vision/workpiece-rule-analyzer";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import {
  STANDARD_CANVAS_HEIGHT,
  STANDARD_CANVAS_WIDTH,
} from "@/components/vision/standard/tools/pattern-matching/usePatternMatchingRule";
import { useErrorStore } from "@/lib/stores/errorStore";

export interface UseStandardWorkbenchProps {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  imageRef?: string;
  onImageRegistered?: (url: string) => void;
  defaultRegion?: SearchRegion;
}

function parseSavedRegion(raw: unknown): SearchRegion | null {
  if (!raw) {
    return null;
  }

  const geom = (raw as { geometry?: unknown })?.geometry ?? raw;
  const typed = geom as { x?: number; y?: number; width?: number; height?: number };

  if (
    typeof typed.x === "number" &&
    typeof typed.y === "number" &&
    typeof typed.width === "number" &&
    typeof typed.height === "number"
  ) {
    return {
      x: Math.round(typed.x),
      y: Math.round(typed.y),
      width: Math.round(typed.width),
      height: Math.round(typed.height),
    };
  }

  return null;
}

export function useStandardWorkbench(props: UseStandardWorkbenchProps) {
  const [source, setSource] = useState<WhiteBoxMarkingInput | null>(null);
  const [hasFilteredPreview, setHasFilteredPreview] = useState(false);
  const [hasOverlays, setHasOverlays] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [dragState, setDragState] = useState<RegionDrag | null>(null);

  const initialRegion = parseSavedRegion(props.settings.searchRegion) ??
    props.defaultRegion ?? {
      x: 220,
      y: 120,
      width: 520,
      height: 300,
    };

  const [searchRegion, setSearchRegion] = useState<SearchRegion | null>(initialRegion);

  const effectiveImageRef =
    props.imageRef ||
    (props.settings.params as { imageRef?: string } | undefined)?.imageRef ||
    (props.settings as { imageRef?: string }).imageRef ||
    defaultWorkpieceFilledSample;

  useEffect(() => {
    let isCancelled = false;

    if (!effectiveImageRef) {
      return;
    }

    void readImageUrl(effectiveImageRef, STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT)
      .then((imgInput) => {
        if (isCancelled) {
          return;
        }

        setSource(imgInput);
      })
      .catch((err) => {
        if (!isCancelled) {
          useErrorStore.getState().captureError(
            err,
            {
              triggerComponent: "useStandardWorkbench",
              triggerAction: "loadWorkbenchImage",
              context: { imageRefLength: effectiveImageRef.length },
            },
            "E_WORKBENCH_LOAD_IMAGE",
          );
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [effectiveImageRef]);

  const handleRegionChange = useCallback(
    (nextRegion: SearchRegion | null) => {
      setSearchRegion(nextRegion);

      if (!nextRegion) {
        return;
      }

      props.onChange((prev) => ({
        ...prev,
        searchRegion: nextRegion as any,
        params: {
          ...(prev.params ?? {}),
          searchRegion: nextRegion,
          searchRegionJson: JSON.stringify(nextRegion),
        },
      }));
    },
    [props],
  );

  const handleLoadFile = useCallback(
    async (file: File) => {
      try {
        const imgInput = await readImageFile(file, STANDARD_CANVAS_WIDTH, STANDARD_CANVAS_HEIGHT);
        setSource(imgInput);

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : "";

          if (dataUrl) {
            props.onImageRegistered?.(dataUrl);

            props.onChange((prev) => ({
              ...prev,
              params: {
                ...(prev.params ?? {}),
                imageRef: dataUrl,
              },
            }));
          }
        };
        reader.readAsDataURL(file);
      } catch (err) {
        useErrorStore.getState().captureError(
          err,
          {
            triggerComponent: "useStandardWorkbench",
            triggerAction: "loadFile",
            context: { fileName: file.name, fileSize: file.size },
          },
          "E_WORKBENCH_LOAD_FILE",
        );
      }
    },
    [props],
  );

  const handleCaptureFrame = useCallback((input: WhiteBoxMarkingInput) => {
    setSource(input);
    setIsCameraOpen(false);
  }, []);

  const toggleFilteredPreview = useCallback(() => {
    setHasFilteredPreview((prev) => !prev);
  }, []);

  const toggleOverlays = useCallback(() => {
    setHasOverlays((prev) => !prev);
  }, []);

  const resetRegion = useCallback(() => {
    const fallback: SearchRegion = props.defaultRegion ?? {
      x: 220,
      y: 120,
      width: 520,
      height: 300,
    };

    handleRegionChange(fallback);
  }, [handleRegionChange, props.defaultRegion]);

  return {
    source,
    searchRegion,
    dragState,
    hasFilteredPreview,
    hasOverlays,
    isCameraOpen,
    setDragState,
    setIsCameraOpen,
    handleRegionChange,
    handleLoadFile,
    handleCaptureFrame,
    toggleFilteredPreview,
    toggleOverlays,
    resetRegion,
  };
}
