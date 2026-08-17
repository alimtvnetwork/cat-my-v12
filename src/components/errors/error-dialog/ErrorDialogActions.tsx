// Copy + Dismiss buttons for ErrorDialog.

import type { ErrorRecord } from "@/lib/errors";
import { ERROR_DIALOG_CLASS, ERROR_DIALOG_TEXT } from "./constants";
import { copyErrorRecord } from "./copy-record";

export interface ErrorDialogActionsProps {
  record: ErrorRecord;
  onClose: () => void;
}

export function ErrorDialogActions({ record, onClose }: ErrorDialogActionsProps): React.JSX.Element | null {
  const handleCopy = () => {
    void copyErrorRecord(record);
  };

  return (
    <div className={ERROR_DIALOG_CLASS.actions}>
      <button type="button" onClick={handleCopy} className={ERROR_DIALOG_CLASS.secondaryBtn}>
        {ERROR_DIALOG_TEXT.copyLabel}
      </button>
      <button type="button" onClick={onClose} className={ERROR_DIALOG_CLASS.primaryBtn}>
        {ERROR_DIALOG_TEXT.dismissLabel}
      </button>
    </div>
  );
}
