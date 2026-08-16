import { ClientLogger } from "@/lib/observability/client-logger";
// Copy an ErrorRecord to the clipboard as pretty JSON. Never throws.

import type { ErrorRecord } from "@/lib/errors";
import { ERROR_DIALOG_TEXT } from "./constants";

const JSON_INDENT = 2;

export async function copyErrorRecord(record: ErrorRecord): Promise<void> {
  const payload = JSON.stringify(record, null, JSON_INDENT);
  try {
    await navigator.clipboard?.writeText(payload);
  } catch (clipErr) {
    ClientLogger.warn(ERROR_DIALOG_TEXT.clipboardWarn, clipErr);
  }
}
