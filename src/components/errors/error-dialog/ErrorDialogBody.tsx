// Scrollable message + optional stack for ErrorDialog.

import type { ErrorRecord } from "@/lib/errors";
import { ERROR_DIALOG_CLASS, ERROR_DIALOG_TESTID } from "./constants";

export interface ErrorDialogBodyProps {
  record: ErrorRecord;
}

function formatMessage(record: ErrorRecord): string {
  const hasStack = typeof record.stack === "string";

  if (hasStack === false) return record.message;

  return `${record.message}\n\n${record.stack}`;
}

export function ErrorDialogBody({ record }: ErrorDialogBodyProps) {
  return (
    <pre className={ERROR_DIALOG_CLASS.message} data-testid={ERROR_DIALOG_TESTID.message}>
      {formatMessage(record)}
    </pre>
  );
}
