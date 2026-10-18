import { z } from "zod";

export const CarrierSlotResultSchema = z.object({
  slotIndex: z.number().int(),
  state: z.string(),
  isOccupied: z.boolean(),
  isPass: z.boolean(),
  verdict: z.string(),
  score: z.number(),
  reason: z.string().optional(),
  defect: z.string().nullable().optional(),
});

export type CarrierSlotResult = z.infer<typeof CarrierSlotResultSchema>;

/**
 * Zod schema for the POST /score response payload.
 * Matches the backend ScoreResponse Pydantic model.
 */
export const ScoreResponseSchema = z.object({
  is_pass: z.boolean(),
  confidence: z.number().min(0).max(100),
  label: z.string(),
  verdict: z.string().optional(),
  reason: z.string().optional(),
  trace: z.record(z.unknown()).optional(),
  hasMultiSlot: z.boolean().optional(),
  totalSlots: z.number().int().optional(),
  slots: z.array(CarrierSlotResultSchema).optional(),
  calibration: z
    .object({
      factor: z.number(),
      unit: z.string(),
    })
    .optional(),
  duration_ms: z.number().optional(),
  runId: z.string().optional(),
  runSessionId: z.number().optional(),
});

export type ScoreResponse = z.infer<typeof ScoreResponseSchema>;

/**
 * Zod schema for a score request.
 */
export const ScoreRequestSchema = z.object({
  ruleType: z
    .enum([
      "pattern_match",
      "grayscale_tolerance",
      "shape_track",
      "color_area",
      "blob_area",
      "blob",
      "defect",
      "edge_width",
      "profile_width",
      "edge_pitch",
    ])
    .default("grayscale_tolerance"),
  referenceImageUrl: z.string().optional(),
  sampleImageUrl: z.string().optional(),
  roi: z
    .object({
      x: z.number().int(),
      y: z.number().int(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  threshold: z.number().min(0).max(1).default(0.8),
  tolerance: z.number().int().min(0).max(255).default(40),
  calibrationFactor: z.number().positive().default(0.05),
  calibrationUnit: z.string().default("mm"),
});

export type ScoreRequest = z.infer<typeof ScoreRequestSchema>;
