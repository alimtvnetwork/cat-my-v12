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
  applyClahe,
  binarize,
  DEFAULT_CLAHE_CLIP_LIMIT,
  DEFAULT_CLAHE_TILE_SIZE,
  invertGray,
  isDarkTextOnLight,
  otsuThreshold,
  preprocessForOcr,
  rgbaToGrayscale,
  upscaleGray,
  type ClaheOptions,
  type GrayImage,
  type PreprocessedMarking,
  type PreprocessForOcrOptions,
} from "./preprocess";
export { encodeBmpGray } from "./bmp";
export { cleanOcrText, isOcrEngineReady, recognizeMarking, terminateOcrEngine } from "./engine";
// Re-exported so analyzer/callers can use the spec T106 Levenshtein
// distance directly. Note on preprocessing (see ./preprocess): the
// default pipeline uses local/adaptive Otsu binarization; CLAHE is
// implemented (applyClahe) but opt-in via OcrEngineOptions.useClahe,
// because running it by default risks amplifying background texture
// on small near-uniform laser-mark ROIs.
export { judgeMarkingRecognition, levenshteinDistance } from "./judge";
