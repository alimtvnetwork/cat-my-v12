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
export { judgeMarkingRecognition } from "./judge";
