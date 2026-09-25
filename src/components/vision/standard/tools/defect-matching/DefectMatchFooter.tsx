import React from "react";
import { Check, X } from "lucide-react";

export interface DefectMatchFooterProps {
  isMatching: boolean;
  onApply: () => void;
  onCancel?: () => void;
}

export function DefectMatchFooter(props: DefectMatchFooterProps): React.JSX.Element {
  return (
    <footer className="flex h-11 shrink-0 items-center justify-between border-t border-ca-border bg-ca-panel px-3 py-1 font-sans text-xs select-none">
      <div className="flex items-center gap-2 text-ca-ink-muted text-[11px]">
        <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
        <span>Flaw Detection \u2014 Inverted Pattern Judgment Active</span>
      </div>

      <div className="flex items-center gap-2">
        {props.onCancel && (
          <button
            type="button"
            onClick={props.onCancel}
            className="inline-flex items-center gap-1 rounded border border-ca-border bg-ca-panel-2 px-3 py-1 font-semibold text-ca-ink hover:bg-ca-bg transition-colors"
          >
            <X className="h-3.5 w-3.5 text-ca-ink-muted" />
            <span>Cancel</span>
          </button>
        )}

        <button
          type="button"
          onClick={props.onApply}
          disabled={props.isMatching}
          className="inline-flex items-center gap-1 rounded bg-ca-select px-4 py-1 font-semibold text-white hover:bg-ca-select-hover disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
        >
          <Check className="h-3.5 w-3.5" />
          <span>Apply Rule</span>
        </button>
      </div>
    </footer>
  );
}
