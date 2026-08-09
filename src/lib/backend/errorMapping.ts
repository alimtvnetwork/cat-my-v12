export const ErrorMapping: Record<string, string> = {
  E_BE_NOT_FOUND: "The requested resource could not be found.",
  E_BE_UNAUTHORIZED: "You are not authorized to perform this action.",
  E_BE_INTERNAL: "An internal server error occurred.",
  E_BE_UNAVAILABLE: "The service is currently unavailable.",
  E_CAM_NOT_CONNECTED: "The camera is not connected.",
  E_CAM_TIMEOUT: "The camera operation timed out.",
  E_CAM_CAPTURE_FAILED: "The camera failed to capture an image.",
  E_SDK_INIT_FAILED: "The SDK failed to initialize.",
  E_BUG_UNKNOWN_CODE: "An unknown error occurred.",
};

export function getErrorMessage(code: string | undefined): string {
  if (!code) return ErrorMapping.E_BUG_UNKNOWN_CODE;

  return ErrorMapping[code] || ErrorMapping.E_BUG_UNKNOWN_CODE;
}
