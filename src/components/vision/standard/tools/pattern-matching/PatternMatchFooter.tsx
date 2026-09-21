export interface PatternMatchFooterProps {
  isMatching: boolean;
  onCancel?: () => void;
  onDelete?: () => void;
  onMatch?: () => void;
  onApply: () => void;
}

export function PatternMatchFooter(props: PatternMatchFooterProps): React.JSX.Element {
  return (
    <footer className="flex h-12 shrink-0 items-center justify-end border-t border-ca-border bg-ca-panel-2 px-4 py-2 text-xs">
      <button
        type="button"
        onClick={props.onApply}
        disabled={props.isMatching}
        className="rounded bg-ca-select px-6 py-2 font-bold text-white shadow hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
      >
        {props.isMatching ? "Applying..." : "Apply Rule"}
      </button>
    </footer>
  );
}
