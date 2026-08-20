import { useUiMode, UiModeType } from "@/hooks/useUiMode";

export function UiModeSwitch(): React.JSX.Element | null {
  const { mode, toggleMode } = useUiMode();
  const isStandard = mode === UiModeType.Standard;

  return (
    <div className="flex items-center gap-2 text-hmi-body">
      <span className={`${isStandard ? "text-ca-ink-muted" : "text-ca-ink font-semibold"}`}>
        Modern
      </span>
      <button
        type="button"
        onClick={toggleMode}
        aria-label={`Toggle UI mode. Current mode: ${isStandard ? "Standard" : "Modern"}`}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ca-select focus:ring-offset-2 ${
          isStandard ? "bg-ca-select" : "bg-ca-ink-muted/50"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            isStandard ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className={`${isStandard ? "text-ca-ink font-semibold" : "text-ca-ink-muted"}`}>
        Standard
      </span>
    </div>
  );
}
