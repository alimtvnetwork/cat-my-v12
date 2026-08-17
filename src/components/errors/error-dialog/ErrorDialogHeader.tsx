// Title + source line for ErrorDialog.

import type { ErrorRecord } from "@/lib/errors";
import { ERROR_DIALOG_CLASS, ERROR_DIALOG_TESTID, ERROR_DIALOG_TEXT } from "./constants";

export interface ErrorDialogHeaderProps {
  record: ErrorRecord;
}

function formatSource(record: ErrorRecord): string {
  const base = `${ERROR_DIALOG_TEXT.sourcePrefix} ${record.source}`;
  const hasCorrelation = typeof record.correlationId === "string";

  if (hasCorrelation === false) return base;

  return `${base} , ${ERROR_DIALOG_TEXT.correlationPrefix} ${record.correlationId}`;
}

export function ErrorDialogHeader({ record }: ErrorDialogHeaderProps): React.JSX.Element | null {
  const title = record.name ?? ERROR_DIALOG_TEXT.defaultTitle;

  return (
    <>
      <h2 className={ERROR_DIALOG_CLASS.title} data-testid={ERROR_DIALOG_TESTID.title}>
        {title}
      </h2>
      <p className={ERROR_DIALOG_CLASS.source} data-testid={ERROR_DIALOG_TESTID.source}>
        {formatSource(record)}
      </p>
    </>
  );
}
