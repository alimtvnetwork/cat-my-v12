import { ClientLogger } from "@/lib/observability/client-logger";
import { toast } from "sonner";
// Copy an ErrorRecord to the clipboard as pretty JSON. Never throws.

import type { ErrorRecord } from "@/lib/errors";
import { copyText } from "@/lib/errors/copy-text";
import { ERROR_DIALOG_TEXT } from "./constants";

const JSON_INDENT = 2;

export async function copyErrorRecord(record: ErrorRecord): Promise<void> {
  const payload = JSON.stringify(record, null, JSON_INDENT);
  const result = await copyText(payload);

  if (result.isCopied) {
    toast.success("Copied error record");

    return;
  }

  ClientLogger.error(ERROR_DIALOG_TEXT.clipboardWarn, {
    failureMessage: result.failureMessage,
  });
  toast.error("Copy failed", {
    description: `${result.failureMessage}\n${payload}`,
  });
}
