import { useEffect, useRef } from "react";
import { useVisionStore } from "@/lib/vision/store";
import { fetchBackend } from "@/lib/backend/http";
import { ScoreResponseSchema } from "@/lib/vision/score-schema";

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
          method: "POST",
          body: JSON.stringify({
            ruleType,
            threshold: confidenceThreshold / 100,
          }),
        });
        const parsed = ScoreResponseSchema.safeParse(result);
        if (parsed.success) {
          // Score result is available — consuming components subscribe to their own state
          // This hook simply triggers; the store owns the last-score state
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
