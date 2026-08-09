// Plan 43 slice-1 step 4: ErrorDialog. Renders one ErrorRecord via subparts.
// No Radix dependency; uses semantic <dialog> so tests can query it easily.

import { useRef, type SyntheticEvent } from "react";
import type { ErrorRecord } from "@/lib/errors";
import { ERROR_DIALOG_CLASS, ERROR_DIALOG_TESTID } from "./error-dialog/constants";
import { useDialogSync } from "./error-dialog/useDialogSync";
import { ErrorDialogHeader } from "./error-dialog/ErrorDialogHeader";
import { ErrorDialogBody } from "./error-dialog/ErrorDialogBody";
import { ErrorDialogActions } from "./error-dialog/ErrorDialogActions";

export interface ErrorDialogProps {
  record: ErrorRecord | null;
  onClose: () => void;
}

export function ErrorDialog({ record, onClose }: ErrorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  useDialogSync(dialogRef, record !== null);

  if (record === null) return null;

  const handleCancel = (e: SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      data-testid={ERROR_DIALOG_TESTID.root}
      className={ERROR_DIALOG_CLASS.dialog}
      onCancel={handleCancel}
    >
      <div className={ERROR_DIALOG_CLASS.body}>
        <ErrorDialogHeader record={record} />
        <ErrorDialogBody record={record} />
        <ErrorDialogActions record={record} onClose={onClose} />
      </div>
    </dialog>
  );
}
