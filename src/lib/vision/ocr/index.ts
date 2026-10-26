export type {
  OcrCharacter,
  OcrCharacterBox,
  OcrCriterionKey,
  OcrCriterionResult,
  OcrEngineOptions,
  OcrJudgment,
  OcrPixelBuffer,
  OcrRecognitionResult,
} from "./types";
export { DEFAULT_OCR_LANGUAGE, DEFAULT_OCR_UPSCALE_FACTOR } from "./types";
export {
  binarize,
  invertGray,
  isDarkTextOnLight,
  otsuThreshold,
  preprocessForOcr,
  rgbaToGrayscale,
  upscaleGray,
  type GrayImage,
  type PreprocessedMarking,
} from "./preprocess";
export { encodeBmpGray } from "./bmp";
export { cleanOcrText, isOcrEngineReady, recognizeMarking, terminateOcrEngine } from "./engine";
// Re-exported so analyzer/callers can use the spec T106 Levenshtein
// distance directly. Note on preprocessing (see ./preprocess): the
// pipeline uses local/adaptive Otsu binarization, NOT CLAHE — the spec
// lists CLAHE, but it is deliberately not implemented there.
export { judgeMarkingRecognition, levenshteinDistance } from "./judge";
