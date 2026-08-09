// Plan 43 slice-1: ErrorDialog constants. No magic strings in components.

export const ERROR_DIALOG_TEXT = {
  defaultTitle: "Error",
  sourcePrefix: "Source:",
  correlationPrefix: "correlation",
  copyLabel: "Copy",
  dismissLabel: "Dismiss",
  clipboardWarn: "[ErrorDialog] clipboard write failed",
} as const;

export const ERROR_DIALOG_TESTID = {
  root: "error-dialog",
  title: "error-dialog-title",
  source: "error-dialog-source",
  message: "error-dialog-message",
} as const;

export const ERROR_DIALOG_CLASS = {
  dialog:
    "rounded-md border border-border bg-background text-foreground shadow-lg p-0 max-w-lg w-full backdrop:bg-black/50",
  body: "p-4",
  title: "text-lg font-semibold",
  source: "mt-2 text-sm text-muted-foreground",
  message:
    "mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-2 text-xs",
  actions: "mt-4 flex justify-end gap-2",
  secondaryBtn: "rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent",
  primaryBtn:
    "rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90",
} as const;
