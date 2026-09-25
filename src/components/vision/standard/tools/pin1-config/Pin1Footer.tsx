import React from "react";

export interface Pin1FooterProps {
  isVerifying?: boolean;
  onApply: () => void;
  onCancel?: () => void;
}

export function Pin1Footer(props: Pin1FooterProps): React.JSX.Element {
  return (
    <footer className="flex h-12 shrink-0 items-center justify-between border-t border-ca-border bg-ca-panel-2 px-4 py-2 text-xs">
      {props.onCancel ? (
        <button
          type="button"
          onClick={props.onCancel}
          className="rounded border border-ca-border bg-ca-panel px-4 py-1.5 font-semibold text-ca-ink hover:bg-ca-panel-2 transition-colors"
        >
          Cancel
        </button>
      ) : (
        <div />
      )}

      <button
        type="button"
        onClick={props.onApply}
        disabled={props.isVerifying}
        className="rounded bg-ca-select px-6 py-2 font-bold text-white shadow hover:opacity-90 active:scale-[0.99] disabled:opacity-50 transition-opacity"
      >
        {props.isVerifying ? "Applying..." : "Apply Rule"}
      </button>
    </footer>
  );
}
