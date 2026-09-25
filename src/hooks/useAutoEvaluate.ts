import { useEffect, useRef } from "react";
import { useVisionStore } from "@/lib/vision/store";
import { fetchBackend } from "@/lib/backend/http";
import { ScoreResponseSchema } from "@/lib/vision/score-schema";
import { HttpMethod } from "@/lib/constants";
import { getReferenceImage } from "@/lib/stores/reference-image-store";

const AUTO_EVAL_DEBOUNCE_MS = 200; // prevent spam on rapid captures
const AUTO_EVAL_MIN_INTERVAL_MS = 200; // max 5fps = 1 frame per 200ms

/**
 * useAutoEvaluate — fires POST /score automatically when:
 * 1. `isAutoEvaluate` is true
 * 2. A new `imageId` is received
 *
 * Debounced to AUTO_EVAL_DEBOUNCE_MS and throttled to 5fps.
 * Task 235-236.
 */
export function useAutoEvaluate(imageId: string | null, ruleType: string = "pattern_match") {
  const { isAutoEvaluate, confidenceThreshold } = useVisionStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEvalRef = useRef<number>(0);

  useEffect(() => {
    if (!isAutoEvaluate || imageId === null) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      const now = Date.now();
      const elapsed = now - lastEvalRef.current;

      // Throttle to max 5fps
      if (elapsed < AUTO_EVAL_MIN_INTERVAL_MS) return;
      lastEvalRef.current = now;

      try {
        const result = await fetchBackend("/score", {
          method: HttpMethod.Post,
          body: JSON.stringify({
            ruleType,
            threshold: confidenceThreshold / 100,
          }),
        });
        const payload = (result as { Results?: unknown[] })?.Results?.[0] ?? result;
        const parsed = ScoreResponseSchema.safeParse(payload);
        if (parsed.success) {
          useVisionStore.getState().setLastScoreResult(parsed.data);
        }
      } catch {
        // Silent: auto-eval failures should not interrupt the capture flow
      }
    }, AUTO_EVAL_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isAutoEvaluate, imageId, ruleType, confidenceThreshold]);
}

/**
 * Manually trigger a vision evaluation against /score.
 */
export async function evaluateCurrentVision(ruleType: string = "grayscale_tolerance"): Promise<void> {
  const { confidenceThreshold, segments, activeSegmentId } = useVisionStore.getState();
  const activeSegment = segments.find((s) => s.visionSettings?.id === activeSegmentId) ?? segments[0];
  const roi = activeSegment?.visionSettings?.roi;
  const currentSample = getReferenceImage();

  try {
    const result = await fetchBackend("/score", {
      method: HttpMethod.Post,
      body: JSON.stringify({
        ruleType,
        threshold: confidenceThreshold / 100,
        tolerance: 40,
        referenceImageUrl: "/src/assets/samples/pocket-1-filled.jpg",
        sampleImageUrl: currentSample || "/src/assets/samples/pocket-1-filled.jpg",
        roi: roi ? { x: roi.x, y: roi.y, width: roi.width, height: roi.height } : undefined,
      }),
    });
    const payload = (result as { Results?: unknown[] })?.Results?.[0] ?? result;
    const parsed = ScoreResponseSchema.safeParse(payload);
    if (parsed.success) {
      useVisionStore.getState().setLastScoreResult(parsed.data);
    }
  } catch (err) {
    console.error("[useAutoEvaluate] evaluate failed", err);
  }
}
